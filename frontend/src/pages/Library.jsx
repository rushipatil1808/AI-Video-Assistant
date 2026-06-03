import { useNavigate } from 'react-router-dom';
import { Video, MessageSquare, BarChart2, Trash2, ArrowRight } from 'lucide-react';
import { useSessionStore } from '../hooks/useSessionStore.jsx';
import { deleteSession } from '../services/api.jsx';
import toast from 'react-hot-toast';

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Library() {
  const navigate = useNavigate();
  const { sessions, removeSession } = useSessionStore();

  async function handleDelete(id, e) {
    e.stopPropagation();
    try {
      await deleteSession(id);
      removeSession(id);
      toast.success('Session deleted');
    } catch {
      // Remove locally even if API fails (session may be gone)
      removeSession(id);
      toast.success('Session removed');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Library</h1>
        <p className="page-subtitle">All your analyzed video sessions</p>
      </div>

      {sessions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Video size={24} /></div>
            <p className="empty-title">Your library is empty</p>
            <p className="empty-desc">Analyze a video to see it here.</p>
            <button className="btn btn-primary" onClick={() => navigate('/analysis')}>
              Analyze Video
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.map(s => {
            const ytId = s.source?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
            return (
              <div
                key={s.session_id}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                onClick={() => navigate(`/analysis/${s.session_id}`)}
              >
                {/* Thumbnail */}
                <div style={{ width: 80, height: 56, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ytId ? (
                    <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : <Video size={20} style={{ color: 'var(--text-subtle)' }} />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }} className="truncate">{s.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }} className="truncate">{s.source}</p>
                  <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                    <span className="badge badge-indigo">{s.language}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>{timeAgo(s.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2" style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/chat?session=${s.session_id}`)}>
                    <MessageSquare size={12} /> Chat
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/analysis/${s.session_id}`)}>
                    <BarChart2 size={12} /> View
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={e => handleDelete(s.session_id, e)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


