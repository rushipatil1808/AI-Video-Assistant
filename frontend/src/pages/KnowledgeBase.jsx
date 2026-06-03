import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../hooks/useSessionStore.jsx';
import { FileText, MessageSquare, Clock, Database, ChevronRight } from 'lucide-react';

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const { sessions } = useSessionStore();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Knowledge Base</h1>
        <p className="page-subtitle">Browse all your AI-extracted knowledge from analyzed videos</p>
      </div>

      {sessions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Database size={24} /></div>
            <p className="empty-title">Knowledge base is empty</p>
            <p className="empty-desc">Analyze videos to build your personal knowledge base.</p>
            <button className="btn btn-primary" onClick={() => navigate('/analysis')}>Analyze a Video</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sessions.map(s => (
            <div key={s.session_id} className="card">
              <div className="card-header">
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{s.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-indigo">{s.language}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>
                      <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                      {timeAgo(s.created_at)}
                    </span>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/analysis/${s.session_id}`)}
                >
                  View <ChevronRight size={13} />
                </button>
              </div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Summary', icon: FileText, content: s.summary, color: '#6366F1', bg: '#EEF2FF' },
                  { label: 'Action Items', icon: MessageSquare, content: s.action_items, color: '#10B981', bg: '#ECFDF5' },
                ].map(({ label, icon: Icon, content, color, bg }) => (
                  <div key={label} style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: 8 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={13} style={{ color }} />
                      </div>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{label}</p>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {content
                        ? content.slice(0, 180) + (content.length > 180 ? '…' : '')
                        : <em>Not available</em>
                      }
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


