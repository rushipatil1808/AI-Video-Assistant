"""
QuickNotes AI FastAPI Backend Bridge
Wraps the existing pipeline and exposes REST API endpoints.
DO NOT modify the core pipeline logic - only adds HTTP interface.
"""

import sys
import os
import io

# Add project root to path so existing modules resolve correctly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uuid
import time
from datetime import datetime
import sqlite3
import hashlib

from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

# ── Import existing pipeline modules (unchanged) ─────────────────────────────
from utils.audio_processor import process_input
from core.transcriber import transcribe_all
from core.summarizer import summarize, generate_title
from core.extractor import extract_action_items, extract_key_decisions, extract_questions
from core.rag_engine import build_rag_chain, ask_question
from utils.pdf_processor import extract_text_from_pdf

# ── Database Setup ────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            title TEXT,
            source TEXT,
            language TEXT,
            transcript TEXT,
            summary TEXT,
            action_items TEXT,
            key_decisions TEXT,
            open_questions TEXT,
            created_at TEXT
        )''')

init_db()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# In-memory cache for RAG chains (since they cannot be serialized to SQLite)
rag_chains_cache = {}

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="QuickNotes AI API",
    description="Transform Videos into Smart Notes",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Models ───────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    source: str  # YouTube URL or local file path
    language: str = "english"  # "english" or "hinglish"

class ChatRequest(BaseModel):
    session_id: str
    question: str

class AnalysisResult(BaseModel):
    session_id: str
    title: str
    summary: str
    transcript: str
    action_items: str
    key_decisions: str
    open_questions: str
    created_at: str
    source: str
    language: str

class ChatResponse(BaseModel):
    answer: str
    session_id: str
    question: str

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str

class SessionListItem(BaseModel):
    session_id: str
    title: str
    source: str
    language: str
    created_at: str
    summary: str

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.post("/api/analyze", response_model=AnalysisResult, tags=["Analysis"])
async def analyze_video(request: AnalyzeRequest):
    """
    Run the full AI pipeline on a YouTube URL or local video/audio file.
    Returns transcript, summary, action items, key decisions, open questions.
    """
    if not request.source.strip():
        raise HTTPException(status_code=422, detail="Source URL or file path is required.")

    # Cache Check
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM sessions WHERE source = ? AND language = ?", (request.source, request.language)).fetchone()
        if row:
            if row['session_id'] not in rag_chains_cache:
                try:
                    rag_chains_cache[row['session_id']] = build_rag_chain(row['transcript'])
                except Exception as e:
                    print(f"Warning: Could not rebuild RAG chain from cache: {e}")
            
            return AnalysisResult(
                session_id=row['session_id'],
                title=row['title'],
                summary=row['summary'],
                transcript=row['transcript'],
                action_items=row['action_items'],
                key_decisions=row['key_decisions'],
                open_questions=row['open_questions'],
                created_at=row['created_at'],
                source=row['source'],
                language=row['language'],
            )

    try:
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        transcript = None
        
        # Fast path: Try youtube-transcript-api
        if "youtube.com" in request.source or "youtu.be" in request.source:
            try:
                from youtube_transcript_api import YouTubeTranscriptApi
                video_id = None
                if "youtu.be/" in request.source:
                    video_id = request.source.split("youtu.be/")[1].split("?")[0]
                elif "v=" in request.source:
                    video_id = request.source.split("v=")[1].split("&")[0]
                    
                if video_id:
                    print(f"Attempting to fetch transcript directly for {video_id}...")
                    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                    
                    try:
                        if request.language.lower() in ["hinglish", "hindi"]:
                            t_data = transcript_list.find_transcript(['hi', 'en-IN', 'en'])
                        else:
                            t_data = transcript_list.find_transcript(['en'])
                    except:
                        t_data = transcript_list.find_transcript(['en', 'hi', 'en-IN']) # fallback
                        
                    if request.language.lower() == "english" and not t_data.language_code.startswith('en'):
                        t_data = t_data.translate('en')
                        
                    t_list = t_data.fetch()
                    transcript = " ".join([t['text'] for t in t_list])
                    print("Direct transcript fetch successful!")
            except Exception as e:
                print(f"Direct transcript fetch failed: {e}. Falling back to STT pipeline.")
                transcript = None

        if not transcript:
            # Step 1 — Audio Processing (fallback)
            chunks = process_input(request.source)

            # Step 2 — Transcription (fallback)
            transcript = transcribe_all(chunks, request.language)

        # Step 3-5 — Run ALL LLM calls in parallel (title, summary, extractions, RAG)
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=6) as pool:
            (
                title,
                summary,
                action_items,
                decisions,
                questions,
                rag_chain,
            ) = await asyncio.gather(
                loop.run_in_executor(pool, generate_title, transcript),
                loop.run_in_executor(pool, summarize, transcript),
                loop.run_in_executor(pool, extract_action_items, transcript),
                loop.run_in_executor(pool, extract_key_decisions, transcript),
                loop.run_in_executor(pool, extract_questions, transcript),
                loop.run_in_executor(pool, build_rag_chain, transcript),
            )

        # Create session
        session_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat() + "Z"
        
        with get_db_connection() as conn:
            conn.execute('''
                INSERT INTO sessions (session_id, title, source, language, transcript, summary, action_items, key_decisions, open_questions, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (session_id, title, request.source, request.language, transcript, summary, action_items, decisions, questions, created_at))

        rag_chains_cache[session_id] = rag_chain

        return AnalysisResult(
            session_id=session_id,
            title=title,
            summary=summary,
            transcript=transcript,
            action_items=action_items,
            key_decisions=decisions,
            open_questions=questions,
            created_at=created_at,
            source=request.source,
            language=request.language,
        )

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        try:
            print(tb.encode('utf-8', 'replace').decode('utf-8'))
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}\n\nTraceback:\n{tb}")


@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat_with_video(request: ChatRequest):
    """
    Ask a question about the analyzed video using RAG.
    Requires a valid session_id from a previous /api/analyze call.
    """
    if not request.question.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty.")

    if request.session_id not in rag_chains_cache:
        with get_db_connection() as conn:
            row = conn.execute("SELECT transcript FROM sessions WHERE session_id = ?", (request.session_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Session not found.")
            rag_chains_cache[request.session_id] = build_rag_chain(row['transcript'])

    try:
        answer = ask_question(rag_chains_cache[request.session_id], request.question.strip())
        return ChatResponse(
            answer=answer,
            session_id=request.session_id,
            question=request.question.strip(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.get("/api/sessions", response_model=List[SessionListItem], tags=["Sessions"])
async def list_sessions():
    """List all active analysis sessions."""
    with get_db_connection() as conn:
        rows = conn.execute("SELECT session_id, title, source, language, created_at, summary FROM sessions ORDER BY created_at DESC").fetchall()
        return [
            SessionListItem(
                session_id=row['session_id'],
                title=row['title'],
                source=row['source'],
                language=row['language'],
                created_at=row['created_at'],
                summary=row['summary'] or "",
            )
            for row in rows
        ]


@app.get("/api/sessions/{session_id}", response_model=AnalysisResult, tags=["Sessions"])
async def get_session(session_id: str):
    """Retrieve the analysis result for a specific session."""
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
        
        return AnalysisResult(
            session_id=row['session_id'],
            title=row['title'],
            summary=row['summary'],
            transcript=row['transcript'],
            action_items=row['action_items'],
            key_decisions=row['key_decisions'],
            open_questions=row['open_questions'],
            created_at=row['created_at'],
            source=row['source'],
            language=row['language'],
        )


@app.delete("/api/sessions/{session_id}", tags=["Sessions"])
async def delete_session(session_id: str):
    """Delete a specific session."""
    with get_db_connection() as conn:
        cursor = conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    
    rag_chains_cache.pop(session_id, None)
    return {"message": "Session deleted successfully.", "session_id": session_id}



@app.post("/api/pdf/analyze", response_model=AnalysisResult, tags=["PDF"])
async def analyze_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    try:
        content = await file.read()
        file_hash = hashlib.md5(content).hexdigest()
        source_id = f"pdf_{file_hash}"
        
        # Check cache
        with get_db_connection() as conn:
            row = conn.execute("SELECT * FROM sessions WHERE source = ?", (source_id,)).fetchone()
            if row:
                if row['session_id'] not in rag_chains_cache:
                    try:
                        rag_chains_cache[row['session_id']] = build_rag_chain(row['transcript'])
                    except:
                        pass
                return AnalysisResult(**dict(row))

        # Save temporarily
        temp_path = os.path.join(os.path.dirname(__file__), "downloades", f"{file_hash}.pdf")
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)
        with open(temp_path, "wb") as f:
            f.write(content)
            
        # Extract text
        transcript = extract_text_from_pdf(temp_path)
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        if not transcript.strip():
            raise HTTPException(status_code=422, detail="Could not extract text from PDF. It may be an image-only scanned PDF.")

        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=4) as pool:
            (summary, action_items, decisions, questions, rag_chain) = await asyncio.gather(
                loop.run_in_executor(pool, summarize, transcript),
                loop.run_in_executor(pool, extract_action_items, transcript),
                loop.run_in_executor(pool, extract_key_decisions, transcript),
                loop.run_in_executor(pool, extract_questions, transcript),
                loop.run_in_executor(pool, build_rag_chain, transcript),
            )
            
        title = file.filename
        session_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat() + "Z"
        
        with get_db_connection() as conn:
            conn.execute('''
                INSERT INTO sessions (session_id, title, source, language, transcript, summary, action_items, key_decisions, open_questions, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (session_id, title, source_id, "english", transcript, summary, action_items, decisions, questions, created_at))

        rag_chains_cache[session_id] = rag_chain
        
        return AnalysisResult(
            session_id=session_id, title=title, summary=summary, transcript=transcript,
            action_items=action_items, key_decisions=decisions, open_questions=questions,
            created_at=created_at, source=source_id, language="english"
        )
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        try: print(tb.encode('utf-8', 'replace').decode('utf-8'))
        except: pass
        raise HTTPException(status_code=500, detail=f"PDF Processing error: {str(e)}")

@app.post("/api/pdf/chat", response_model=ChatResponse, tags=["PDF"])
async def chat_with_pdf(request: ChatRequest):
    # PDF chat uses the exact same logic as video chat since the RAG engine handles both text sources uniformly
    return await chat_with_video(request)

# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
