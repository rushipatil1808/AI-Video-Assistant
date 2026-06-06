"""
VideoIQ FastAPI Backend  –  backend/api.py
Wraps the existing pipeline and exposes REST API endpoints.
DO NOT modify the core pipeline logic — only adds HTTP interface.

Run with:
  python backend/api.py
  OR
  uvicorn backend.api:app --reload --host 0.0.0.0 --port 8000
"""

import sys
import os

# Add project root to path so existing modules resolve correctly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

# ── Import existing pipeline modules (unchanged) ─────────────────────────────
from main import run_pipeline
from core.rag_engine import ask_question

# ── In-memory session store ───────────────────────────────────────────────────
sessions: dict = {}

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
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Models ───────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    url: str          # YouTube URL or local file path — "url" matches frontend field
    language: str = "english"

class ChatRequest(BaseModel):
    session_id: str
    question: str

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def root_redirect():
    """Redirect root to API docs."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/api/docs")

@app.get("/health")
async def health():
    """Health check — Dashboard polls this to show backend status."""
    return {"status": "ok", "service": "QuickNotes AI", "version": "1.0.0"}

@app.get("/api/health")
async def api_health():
    """Secondary health check path used by frontend api.jsx getHealth()."""
    return {"status": "ok", "service": "QuickNotes AI", "version": "1.0.0"}


@app.post("/api/analyze")
async def analyze_video(req: AnalyzeRequest):
    """
    Run the full AI pipeline on a YouTube URL or local video/audio file.
    Returns: session_id, title, transcript, summary, action_items,
             key_decisions, open_questions, source, language, created_at
    """
    if not req.url.strip():
        raise HTTPException(status_code=422, detail="URL / file path is required.")

    try:
        # run_pipeline returns: title, transcript, summary, action_items,
        # key_decisions, open_questions, rag_chain
        result = run_pipeline(req.url.strip(), req.language)

        # rag_chain is not JSON-serialisable — store it separately
        rag_chain = result.pop("rag_chain")

        session_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat() + "Z"

        sessions[session_id] = {
            "rag_chain": rag_chain,
            "source": req.url.strip(),
            "language": req.language,
            "created_at": created_at,
            **result,
        }

        return {
            "session_id": session_id,
            "title": result.get("title", ""),
            "transcript": result.get("transcript", ""),
            "summary": result.get("summary", ""),
            "action_items": result.get("action_items", ""),
            "key_decisions": result.get("key_decisions", ""),
            "open_questions": result.get("open_questions", ""),
            "source": req.url.strip(),
            "language": req.language,
            "created_at": created_at,
        }

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(tb)
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")


@app.post("/api/chat")
async def chat_with_video(req: ChatRequest):
    """Ask a question about the analyzed video using RAG."""
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Please analyze a video first.",
        )

    if not req.question.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty.")

    try:
        answer = ask_question(session["rag_chain"], req.question.strip())
        return {"answer": answer, "session_id": req.session_id, "question": req.question}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.get("/api/sessions")
async def list_sessions():
    """List all active analysis sessions."""
    return {
        "active_sessions": list(sessions.keys()),
        "count": len(sessions),
        "sessions": [
            {
                "session_id": sid,
                "title": data.get("title", ""),
                "source": data.get("source", ""),
                "language": data.get("language", ""),
                "created_at": data.get("created_at", ""),
            }
            for sid, data in sessions.items()
        ],
    }


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Retrieve the analysis result for a specific session."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")

    return {
        "session_id": session_id,
        "title": session.get("title", ""),
        "summary": session.get("summary", ""),
        "transcript": session.get("transcript", ""),
        "action_items": session.get("action_items", ""),
        "key_decisions": session.get("key_decisions", ""),
        "open_questions": session.get("open_questions", ""),
        "source": session.get("source", ""),
        "language": session.get("language", ""),
        "created_at": session.get("created_at", ""),
    }


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a specific session."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    del sessions[session_id]
    return {"message": "Session deleted.", "session_id": session_id}


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[os.path.dirname(os.path.dirname(os.path.abspath(__file__)))],
        log_level="info",
    )
