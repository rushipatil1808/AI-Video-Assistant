import axios from 'axios';

// BUG FIX: Use VITE_API_BASE_URL env var with fallback to localhost:8000
// Timeout is 5 minutes — video processing (download + whisper + LLM) can take 3-4 min
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const http = axios.create({
  baseURL: BASE,
  timeout: 300_000, // 5 minutes
  headers: { 'Content-Type': 'application/json' },
});

// ── Health ────────────────────────────────────────────────────────────────────
// BUG FIX: Try /api/health first (used by api.jsx), also works with /health
export const getHealth = () =>
  http.get('/api/health').then(r => r.data).catch(() =>
    http.get('/health').then(r => r.data)
  );

// ── Analyze ───────────────────────────────────────────────────────────────────
// POST /api/analyze  { url, language }
// BUG FIX: Field renamed from "source" → "url" to match backend/api.py and user spec
// Returns: { session_id, title, summary, transcript, action_items, key_decisions,
//            open_questions, source, language, created_at }
export const analyzeVideo = (source, language = 'english') =>
  http.post('/api/analyze', { source, language }).then(r => r.data);

// ── Sessions ──────────────────────────────────────────────────────────────────
export const listSessions = () =>
  http.get('/api/sessions').then(r => r.data);

export const getSession = (id) =>
  http.get(`/api/sessions/${id}`).then(r => r.data);

export const deleteSession = (id) =>
  http.delete(`/api/sessions/${id}`).then(r => r.data);

// ── Chat ──────────────────────────────────────────────────────────────────────
// POST /api/chat  { session_id, question }
// Returns: { answer, session_id, question }
export const chatWithVideo = (session_id, question) =>
  http.post('/api/chat', { session_id, question }).then(r => r.data);

// ── Library ───────────────────────────────────────────────────────────────────
// GET /api/library
// Returns: { videos: [{ session_id, title, url, language, timestamp, summary, action_items, key_decisions, open_questions }] }
export const getLibrary = () =>
  http.get('/api/library').then(r => r.data);

// DELETE /api/library/{session_id}
export const deleteLibraryVideo = (id) =>
  http.delete(`/api/library/${id}`).then(r => r.data);
