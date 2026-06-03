"""
VideoIQ FastAPI Backend Bridge
Wraps the existing AI pipeline and exposes REST API endpoints.
DO NOT modify the core pipeline logic - only adds HTTP interface.
"""

import sys
import os
import io

# Add project root to path so existing modules resolve correctly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
import uuid
import time
from datetime import datetime

from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

# ── Import existing pipeline modules (unchanged) ─────────────────────────────
from utils.audio_processor import process_input
from core.transcriber import transcribe_all
from core.summarizer import summarize, generate_title
from core.extractor import extract_action_items, extract_key_decisions, extract_questions
from core.rag_engine import build_rag_chain, ask_question

# ── In-memory session store (replace with Redis/DB in production) ─────────────
sessions: dict = {}

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="VideoIQ API",
    description="AI Video Assistant Backend - YouTube Analysis, Transcription, RAG Chat",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
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

    try:
        # Step 1 — Audio Processing
        chunks = process_input(request.source)

        # Step 2 — Transcription
        transcript = transcribe_all(chunks, request.language)

        # Step 3 — Title Generation
        title = generate_title(transcript)

        # Step 4 — Summarization
        summary = summarize(transcript)

        # Step 5 — Extraction
        action_items = extract_action_items(transcript)
        decisions = extract_key_decisions(transcript)
        questions = extract_questions(transcript)

        # Step 6 — Build RAG Chain
        rag_chain = build_rag_chain(transcript)

        # Create session
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "title": title,
            "transcript": transcript,
            "summary": summary,
            "action_items": action_items,
            "key_decisions": decisions,
            "open_questions": questions,
            "rag_chain": rag_chain,
            "source": request.source,
            "language": request.language,
            "created_at": datetime.utcnow().isoformat() + "Z",
        }

        return AnalysisResult(
            session_id=session_id,
            title=title,
            summary=summary,
            transcript=transcript,
            action_items=action_items,
            key_decisions=decisions,
            open_questions=questions,
            created_at=sessions[session_id]["created_at"],
            source=request.source,
            language=request.language,
        )

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(tb)
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}\n\nTraceback:\n{tb}")


@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat_with_video(request: ChatRequest):
    """
    Ask a question about the analyzed video using RAG.
    Requires a valid session_id from a previous /api/analyze call.
    """
    session = sessions.get(request.session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{request.session_id}' not found. Please analyze a video first."
        )

    if not request.question.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty.")

    try:
        answer = ask_question(session["rag_chain"], request.question.strip())
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
    return [
        SessionListItem(
            session_id=sid,
            title=data["title"],
            source=data["source"],
            language=data["language"],
            created_at=data["created_at"],
        )
        for sid, data in sessions.items()
    ]


@app.get("/api/sessions/{session_id}", response_model=AnalysisResult, tags=["Sessions"])
async def get_session(session_id: str):
    """Retrieve the analysis result for a specific session."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")

    return AnalysisResult(
        session_id=session_id,
        title=session["title"],
        summary=session["summary"],
        transcript=session["transcript"],
        action_items=session["action_items"],
        key_decisions=session["key_decisions"],
        open_questions=session["open_questions"],
        created_at=session["created_at"],
        source=session["source"],
        language=session["language"],
    )


@app.delete("/api/sessions/{session_id}", tags=["Sessions"])
async def delete_session(session_id: str):
    """Delete a specific session."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    del sessions[session_id]
    return {"message": "Session deleted successfully.", "session_id": session_id}


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
