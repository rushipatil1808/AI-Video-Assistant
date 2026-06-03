import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const http = axios.create({
  baseURL: BASE,
  timeout: 300_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Health ────────────────────────────────────────────────────────────────────
export const getHealth = () =>
  http.get('/api/health').then(r => r.data);

// ── Analyze ───────────────────────────────────────────────────────────────────
// POST /api/analyze  { source, language }
// Returns: { session_id, title, summary, transcript, action_items, key_decisions, open_questions, created_at, source, language }
export const analyzeVideo = (source, language = 'english') => {
  const endpoint = `${http.defaults.baseURL || window.location.origin}/api/analyze`;
  console.log(`Calling exact endpoint: ${endpoint}`);
  return http.post('/api/analyze', { source, language }).then(r => r.data);
};

// ── Sessions ──────────────────────────────────────────────────────────────────
// GET /api/sessions
export const listSessions = () =>
  http.get('/api/sessions').then(r => r.data);

// GET /api/sessions/:id
export const getSession = (id) =>
  http.get(`/api/sessions/${id}`).then(r => r.data);

// DELETE /api/sessions/:id
export const deleteSession = (id) =>
  http.delete(`/api/sessions/${id}`).then(r => r.data);

// ── Chat ──────────────────────────────────────────────────────────────────────
// POST /api/chat  { session_id, question }
// Returns: { answer, session_id, question }
export const chatWithVideo = (session_id, question) =>
  http.post('/api/chat', { session_id, question }).then(r => r.data);


