import { useNavigate } from 'react-router-dom';
import { Video, MessageSquare, ArrowRight, FileText, Clock } from 'lucide-react';
import { useSessionStore } from '../hooks/useSessionStore.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { sessions } = useSessionStore();
  const latestVideo = sessions[0] || null;

  return (
    <div className="page-wrapper">

      {/* Hero Section */}
      <div style={{ marginBottom: 40, textAlign: 'center', paddingTop: 16 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 60, height: 60, background: 'var(--primary-bg)', borderRadius: 16,
          marginBottom: 20,
        }}>
          <Video size={28} color="var(--primary)" />
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
          QuickNotes AI
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto' }}>
          Transform Videos into Smart Notes
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 840, margin: '0 auto 32px' }}>
        {/* Analyze Card */}
        <div
          className="card card-p cursor-pointer"
          onClick={() => navigate('/analysis')}
          style={{ transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{
            width: 44, height: 44, background: 'var(--primary-bg)',
            borderRadius: 10, display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: 14,
          }}>
            <Video size={22} color="var(--primary)" />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            Analyze Video
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            Paste a YouTube URL to extract transcript and generate a summary.
          </p>
          <div className="flex items-center gap-1" style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 500 }}>
            Get started <ArrowRight size={13} />
          </div>
        </div>

        {/* Chat Card */}
        <div
          className="card card-p cursor-pointer"
          onClick={() => navigate('/chat')}
          style={{ transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{
            width: 44, height: 44, background: '#F0FDF4',
            borderRadius: 10, display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: 14,
          }}>
            <MessageSquare size={22} color="#10B981" />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            Open Chat
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            Ask questions about your analyzed video using AI.
          </p>
          <div className="flex items-center gap-1" style={{ color: '#10B981', fontSize: 13, fontWeight: 500 }}>
            Open chat <ArrowRight size={13} />
          </div>
        </div>

        {/* PDF Card */}
        <div
          className="card card-p cursor-pointer"
          onClick={() => navigate('/pdf')}
          style={{ transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{
            width: 44, height: 44, background: '#FEF2F2',
            borderRadius: 10, display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: 14,
          }}>
            <FileText size={22} color="#EF4444" />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            PDF Summary
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            Upload a PDF document to generate smart notes and chat.
          </p>
          <div className="flex items-center gap-1" style={{ color: '#EF4444', fontSize: 13, fontWeight: 500 }}>
            Upload PDF <ArrowRight size={13} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
          Recent Activity
        </h2>

        {!latestVideo ? (
          <div className="card card-p" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>
              No activity yet.{' '}
              <span
                style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => navigate('/analysis')}
              >
                Analyze your first video or PDF →
              </span>
            </p>
          </div>
        ) : (
          <div
            className="card flex items-center gap-3 cursor-pointer"
            style={{ padding: 16, transition: 'border-color 0.15s' }}
            onClick={() => navigate(latestVideo.type === 'pdf' || latestVideo.title?.endsWith('.pdf') ? '/pdf' : '/analysis')}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {/* Thumbnail */}
            <div style={{
              width: 96, height: 54, borderRadius: 6, overflow: 'hidden',
              background: 'var(--surface)', flexShrink: 0,
            }}>
              {(latestVideo.source || latestVideo.url || '').includes('youtu') ? (
                <img
                  src={`https://img.youtube.com/vi/${(latestVideo.source || latestVideo.url).match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]}/mqdefault.jpg`}
                  alt="thumb"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {latestVideo.type === 'pdf' || latestVideo.title?.endsWith('.pdf') ? (
                    <FileText size={20} color="var(--text-subtle)" />
                  ) : (
                    <Video size={20} color="var(--text-subtle)" />
                  )}
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="truncate" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                {latestVideo.title}
              </p>
              <div className="flex items-center gap-1" style={{ color: 'var(--text-subtle)', fontSize: 12 }}>
                <Clock size={11} />
                {latestVideo.created_at
                  ? new Date(latestVideo.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Recently analyzed'}
              </div>
            </div>

            <ArrowRight size={16} color="var(--text-subtle)" />
          </div>
        )}
      </div>

    </div>
  );
}
