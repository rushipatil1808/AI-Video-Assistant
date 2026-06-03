import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, MessageSquare, Database, TrendingUp, Clock, Zap, ArrowRight } from 'lucide-react';
import { getHealth } from '../services/api.jsx';
import { useSessionStore } from '../hooks/useSessionStore.jsx';

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { sessions } = useSessionStore();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth({ status: 'offline' }));
  }, []);

  const stats = [
    { label: 'Videos Analyzed', value: sessions.length, icon: Video, color: '#6366F1', bg: '#EEF2FF' },
    { label: 'Total Transcripts', value: sessions.length, icon: MessageSquare, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Knowledge Sessions', value: sessions.length, icon: Database, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Backend Status', value: health?.status === 'ok' ? 'Online' : 'Offline', icon: Zap, color: health?.status === 'ok' ? '#10B981' : '#EF4444', bg: health?.status === 'ok' ? '#ECFDF5' : '#FEF2F2' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Welcome to VideoIQ</h1>
        <p className="page-subtitle">Transform videos into actionable knowledge using AI</p>
      </div>

      {/* Stat cards */}
      <div className="grid-4 mb-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="stat-icon" style={{ background: bg }}>
                <Icon size={20} style={{ color }} />
              </div>
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid-3 mb-4">
        {[
          { title: 'Analyze a Video', desc: 'Paste a YouTube URL or upload a file to get started.', icon: Video, color: '#6366F1', bg: '#EEF2FF', action: () => navigate('/analysis') },
          { title: 'Chat with AI', desc: 'Ask questions about any of your analyzed videos.', icon: MessageSquare, color: '#10B981', bg: '#ECFDF5', action: () => navigate('/chat') },
          { title: 'Knowledge Base', desc: 'Browse all sessions, transcripts and summaries.', icon: Database, color: '#F59E0B', bg: '#FFFBEB', action: () => navigate('/knowledge') },
        ].map(({ title, desc, icon: Icon, color, bg, action }) => (
          <div key={title} className="card card-p cursor-pointer" onClick={action}
            style={{ transition: 'all 0.15s ease' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = color}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Icon size={22} style={{ color }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{title}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</p>
            <div className="flex items-center gap-1 mt-3" style={{ color, fontSize: 13, fontWeight: 500 }}>
              Open <ArrowRight size={13} />
            </div>
          </div>
        ))}
      </div>

      {/* Recent sessions */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Sessions</span>
          {sessions.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/library')}>
              View all <ArrowRight size={13} />
            </button>
          )}
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Video size={24} /></div>
              <p className="empty-title">No sessions yet</p>
              <p className="empty-desc">Analyze your first video to see it here.</p>
              <button className="btn btn-primary" onClick={() => navigate('/analysis')}>
                <Zap size={14} /> Analyze a Video
              </button>
            </div>
          ) : (
            <div>
              {sessions.slice(0, 6).map((s, i) => (
                <div
                  key={s.session_id}
                  className="flex items-center gap-3 cursor-pointer"
                  style={{
                    padding: '12px 20px',
                    borderBottom: i < sessions.slice(0, 6).length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => navigate(`/analysis/${s.session_id}`)}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Video size={16} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }} className="truncate">{s.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }} className="truncate">{s.source}</p>
                  </div>
                  <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                    <span className="badge badge-gray">{s.language}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{timeAgo(s.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


