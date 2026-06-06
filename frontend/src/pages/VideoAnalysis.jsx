import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Video, FileText, AlignLeft, MessageSquare, ExternalLink, Clipboard, Zap } from 'lucide-react';
import { useAnalyze } from '../hooks/useAnalyze.jsx';
import { useSessionStore } from '../hooks/useSessionStore.jsx';
import toast from 'react-hot-toast';

// Fake steps removed since it's very fast now

const EXAMPLES = [
  { id: 'aircAruvnKk', title: 'What is a Neural Network? (3Blue1Brown)', img: 'https://img.youtube.com/vi/aircAruvnKk/mqdefault.jpg' },
  { id: 'kCc8FmEb1nY', title: 'Let\'s build GPT from scratch (Andrej Karpathy)', img: 'https://img.youtube.com/vi/kCc8FmEb1nY/mqdefault.jpg' },
  { id: '5p248yoa3oE', title: 'Opportunities in AI (Andrew Ng)', img: 'https://img.youtube.com/vi/5p248yoa3oE/mqdefault.jpg' }
];

// ── Result component (shown after analysis) ────────────────────────────────────
function AnalysisResult({ session, onReset }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('summary');
  const [copied, setCopied] = useState(false);

  const videoId = (session.source || session.url || '').match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];

  function copy(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  }

  const content = tab === 'transcript' ? session.transcript : session.summary;

  return (
    <div className="page-wrapper" style={{ maxWidth: 820 }}>

      {/* Video Info */}
      <div className="card flex items-center gap-4 mb-4" style={{ padding: 16 }}>
        {/* Thumbnail */}
        <div style={{
          width: 120, height: 68, borderRadius: 6, overflow: 'hidden',
          background: 'var(--surface)', flexShrink: 0,
        }}>
          {videoId ? (
            <img
              src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
              alt="thumbnail"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video size={24} color="var(--text-subtle)" />
            </div>
          )}
        </div>

        {/* Title + URL */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            {session.title}
          </h2>
          {(session.source || session.url) && (
            <a
              href={session.source || session.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
              style={{ fontSize: 12, color: 'var(--primary)' }}
            >
              Open on YouTube <ExternalLink size={11} />
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2" style={{ flexShrink: 0 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/chat')}
          >
            <MessageSquare size={13} /> Chat
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onReset}
            title="Analyze another video"
          >
            + New
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="tabs" style={{ padding: '0 4px', background: 'var(--white)' }}>
          <button
            className={`tab-btn${tab === 'summary' ? ' active' : ''}`}
            onClick={() => setTab('summary')}
          >
            <span className="flex items-center gap-2"><FileText size={13} /> Summary</span>
          </button>
          <button
            className={`tab-btn${tab === 'transcript' ? ' active' : ''}`}
            onClick={() => setTab('transcript')}
          >
            <span className="flex items-center gap-2"><AlignLeft size={13} /> Transcript</span>
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto', alignSelf: 'center', marginRight: 8 }}
            onClick={() => copy(content)}
          >
            <Clipboard size={12} /> {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div style={{ padding: 20, maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
          {content ? (
            <p className="transcript-text">{content}</p>
          ) : (
            <p style={{ color: 'var(--text-subtle)', fontSize: 13 }}>No content available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main VideoAnalysis page ─────────────────────────────────────────────────────
export default function VideoAnalysis() {
  const { sessions, setActive } = useSessionStore();
  const { analyze, isLoading, error } = useAnalyze();
  const [url, setUrl] = useState('');
  const [stepIdx, setStepIdx] = useState(-1);
  const [currentSession, setCurrentSession] = useState(null);

  // Show most recently loaded session result
  const displaySession = currentSession || null;

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!url.trim() || isLoading) return;
    try {
      const result = await analyze(url.trim(), 'english');
      setActive(result);
      setCurrentSession(result);
      toast.success('Analysis complete!');
    } catch (err) {
      toast.error(err.message || 'Analysis failed. Check backend.');
    }
  }

  // If we have a result, show it
  if (displaySession && !isLoading) {
    return (
      <AnalysisResult
        session={displaySession}
        onReset={() => setCurrentSession(null)}
      />
    );
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: 760, textAlign: 'center', paddingTop: 40 }}>

      {/* Hero Section (NoteGPT style) */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
          QuickNotes AI
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-muted)' }}>
          Transform Videos into Smart Notes
        </p>
      </div>

      {/* Input Card */}
      <div className="card" style={{ marginBottom: 24, padding: 8, borderRadius: 12 }}>
        <form onSubmit={handleSubmit}>
          {/* URL input */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
            borderBottom: '1px solid var(--border)', background: 'transparent'
          }}>
            <Link2 size={20} color="var(--text-subtle)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Paste the YouTube video link, for example: https://www.youtube.com/watch?v=..."
              disabled={isLoading}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--text)', outline: 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: '#FEF2F2',
              color: 'var(--danger)', fontSize: 13, textAlign: 'left',
              margin: '10px 20px', borderRadius: 6
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ padding: 12 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !url.trim()}
              style={{ width: '100%', padding: '14px 24px', fontSize: 16, borderRadius: 8, background: '#2563EB', boxShadow: 'none' }}
            >
              {isLoading
                ? <><div className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Generating...</>
                : <><FileText size={18} /> Generate Summary</>
              }
            </button>
          </div>
        </form>
      </div>

      {/* Fast Loading State */}
      {isLoading && (
        <div className="card card-p" style={{ textAlign: 'center', marginBottom: 24, padding: '40px 20px' }}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto 16px' }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
            Processing your video in seconds...
          </p>
          <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-subtle)' }}>
            Fetching transcript directly via QuickNotes AI.
          </p>
        </div>
      )}

      {/* Examples Section */}
      {!isLoading && (
        <div style={{ textAlign: 'left' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)' }}>Example</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {EXAMPLES.map(ex => (
              <div
                key={ex.id}
                className="card cursor-pointer"
                onClick={() => {
                  setUrl(`https://youtube.com/watch?v=${ex.id}`);
                }}
                style={{ overflow: 'hidden', transition: 'transform 0.15s', ':hover': { transform: 'translateY(-2px)' } }}
              >
                <div style={{ aspectRatio: '16/9', width: '100%', background: 'var(--surface)' }}>
                  <img src={ex.img} alt={ex.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                    {ex.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
