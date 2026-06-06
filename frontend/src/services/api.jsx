import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const http = axios.create({
  baseURL: BASE,
  timeout: 300_000, // 5 minutes
  headers: { 'Content-Type': 'application/json' },
});

export const getHealth = () =>
  http.get('/api/health').then(r => r.data).catch(() =>
    http.get('/health').then(r => r.data)
  );

export const analyzeVideo = (source, language = 'english') =>
  http.post('/api/analyze', { source, language }).then(r => r.data);

export const analyzePdf = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return http.post('/api/pdf/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};

export const chatWithVideo = (session_id, question) =>
  http.post('/api/chat', { session_id, question }).then(r => r.data);

export const listSessions = () =>
  http.get('/api/sessions').then(r => r.data);

export const getSession = (id) =>
  http.get(`/api/sessions/${id}`).then(r => r.data);

export const deleteSession = (id) =>
  http.delete(`/api/sessions/${id}`).then(r => r.data);
