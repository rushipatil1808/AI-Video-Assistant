import { useState, useEffect } from 'react';
import { getHealth } from '../services/api.jsx';
import { useSessionStore } from '../hooks/useSessionStore.jsx';
import { Zap, Database, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const [health, setHealth] = useState(null);
  const [apiUrl] = useState(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');
  const { sessions, removeSession } = useSessionStore();

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth({ status: 'offline' }));
  }, []);

  function clearAllSessions() {
    if (!window.confirm('Clear all local sessions? This cannot be undone.')) return;
    sessions.forEach(s => removeSession(s.session_id));
    toast.success('All sessions cleared');
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your VideoIQ workspace</p>
      </div>

      {/* About */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">About VideoIQ</span></div>
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={22} style={{ color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>VideoIQ</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Transform Videos Into Actionable Knowledge</p>
              <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>v1.0.0 · Mistral AI + Whisper</p>
            </div>
          </div>
        </div>
      </div>

      {/* Backend */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">Backend Connection</span></div>
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>API URL</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{apiUrl}</p>
            </div>
            <div className="flex items-center gap-2">
              {health?.status === 'ok'
                ? <><CheckCircle size={16} style={{ color: 'var(--success)' }} /><span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>Online</span></>
                : <><XCircle size={16} style={{ color: 'var(--danger)' }} /><span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 500 }}>Offline</span></>
              }
            </div>
          </div>
          {health && (
            <div style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              version: {health.version || '—'} · timestamp: {health.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}
            </div>
          )}
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => getHealth().then(setHealth).then(() => toast.success('Connection verified')).catch(() => { setHealth({ status: 'offline' }); toast.error('Backend unreachable'); })}
          >
            Test Connection
          </button>
        </div>
      </div>

      {/* Data */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">Local Data</span></div>
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={16} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Sessions stored</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saved in browser localStorage</p>
              </div>
            </div>
            <span className="badge badge-indigo" style={{ fontSize: 14 }}>{sessions.length}</span>
          </div>
          <button
            className="btn btn-danger btn-sm"
            onClick={clearAllSessions}
            disabled={sessions.length === 0}
          >
            Clear All Sessions
          </button>
        </div>
      </div>

      {/* How to start backend */}
      <div className="card">
        <div className="card-header"><span className="card-title">Start Backend</span></div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Run the FastAPI server from the project root:</p>
          <div style={{ background: '#0F172A', borderRadius: 8, padding: '12px 16px', fontFamily: 'monospace', fontSize: 12.5, color: '#A5F3FC', lineHeight: 1.7 }}>
            <span style={{ color: '#64748B' }}># From e:/RAG/AI-Video-Assistant-/backend/</span><br />
            <span style={{ color: '#86EFAC' }}>python</span> api_server.py
          </div>
        </div>
      </div>
    </div>
  );
}


