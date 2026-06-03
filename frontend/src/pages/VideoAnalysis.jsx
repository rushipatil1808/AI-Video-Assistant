import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link2, Zap, FileText, CheckSquare, Key, HelpCircle, Clipboard, Download, MessageSquare, ExternalLink } from 'lucide-react';
import { useAnalyze } from '../hooks/useAnalyze.jsx';
import { useSessionStore } from '../hooks/useSessionStore.jsx';
import toast from 'react-hot-toast';

const STEPS = [
  { key: 'audio', label: '🔊 Audio Processing' },
  { key: 'transcript', label: '📝 Transcription' },
  { key: 'title', label: '🏷️ Title Generation' },
  { key: 'summary', label: '📋 Summarization' },
  { key: 'extract', label: '🔍 Information Extraction' },
  { key: 'rag', label: '🧠 RAG Engine Setup' },
];

function AnalysisResult({ session }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('summary');
  const [copied, setCopied] = useState(false);

  const TABS = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'action_items', label: 'Action Items', icon: CheckSquare },
    { id: 'key_decisions', label: 'Key Decisions', icon: Key },
    { id: 'open_questions', label: 'Questions', icon: HelpCircle },
  ];

  function copy(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  }

  function exportMd() {
    const md = `# ${session.title}\n\n## Summary\n${session.summary}\n\n## Action Items\n${session.action_items}\n\n## Key Decisions\n${session.key_decisions}\n\n## Open Questions\n${session.open_questions}\n\n## Transcript\n${session.transcript}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.slice(0, 40).replace(/\s/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as Markdown');
  }

  const content = session[tab] || '';

  return (
    <div className="analysis-layout" style={{ height: 'calc(100vh - var(--header-height) - 48px)' }}>
      {/* LEFT: Metadata */}
      <div className="analysis-left">
        <div style={{ marginBottom: 20 }}>
          <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' }}>
            {session.source?.includes('youtube.com') || session.source?.includes('youtu.be') ? (
              <img
                src={`https://img.youtube.com/vi/${session.source.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]}/mqdefault.jpg`}
                alt="thumb"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : <Zap size={28} style={{ color: 'var(--primary)' }} />}
          </div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6, lineHeight: 1.4 }}>{session.title}</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all', marginBottom: 8 }}>{session.source || session.url}</p>
          {(session.source || session.url)?.includes('youtube.com') && (
            <a href={session.source || session.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--primary)' }}>
              Open on YouTube <ExternalLink size={11} />
            </a>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[{ l: 'Language', v: session.language }, { l: 'Words', v: session.transcript?.split(/\s+/).filter(Boolean).length?.toLocaleString() }].map(({ l, v }) => (
            <div key={l} style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: 6 }}>
              <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 2 }}>{l}</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize' }}>{v}</p>
            </div>
          ))}
        </div>

        {/* Quick nav */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button className="btn btn-primary btn-full btn-sm" onClick={() => navigate(`/chat?session=${session.session_id}`)}>
            <MessageSquare size={13} /> Chat with Video
          </button>
          <button className="btn btn-secondary btn-full btn-sm" onClick={exportMd}>
            <Download size={13} /> Export Markdown
          </button>
        </div>
      </div>

      {/* CENTER: Analysis */}
      <div className="analysis-center" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Tabs */}
        <div className="tabs" style={{ padding: '0 20px', marginBottom: 0 }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`tab-btn${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
              <span className="flex items-center gap-2"><Icon size={13} />{label}</span>
            </button>
          ))}
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto', alignSelf: 'center' }}
            onClick={() => copy(content)}
          >
            <Clipboard size={12} /> {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          <div className="card card-p whitespace-pre-wrap" style={{ fontSize: 13.5, lineHeight: 1.8, color: 'var(--text)', minHeight: 200 }}>
            {content || <span style={{ color: 'var(--text-subtle)' }}>No content available.</span>}
          </div>
        </div>
      </div>

      {/* RIGHT: Transcript */}
      <div className="analysis-right">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Transcript</p>
          <button className="btn btn-ghost btn-sm" onClick={() => copy(session.transcript)}>
            <Clipboard size={12} />
          </button>
        </div>
        <div className="transcript-text" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {session.transcript}
        </div>
      </div>
    </div>
  );
}

export default function VideoAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { sessions, setActive } = useSessionStore();
  const { analyze, isLoading, error } = useAnalyze();
  const [source, setSource] = useState('');
  const [language, setLanguage] = useState('english');
  const [stepIdx, setStepIdx] = useState(-1);

  // If ID param, find session
  const sessionFromRoute = id ? sessions.find(s => s.session_id === id) : null;

  // Most recent session for display
  const displaySession = sessionFromRoute || sessions[0] || null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!source.trim()) return;
    try {
      setStepIdx(0);
      // Simulate step progression while backend processes
      const interval = setInterval(() => {
        setStepIdx(prev => {
          if (prev >= STEPS.length - 1) { clearInterval(interval); return prev; }
          return prev + 1;
        });
      }, 8000);
      const result = await analyze(source.trim(), language);
      clearInterval(interval);
      setStepIdx(STEPS.length);
      toast.success(`✅ Analysis complete: ${result.title}`);
      setActive(result);
      navigate(`/analysis/${result.session_id}`);
    } catch (err) {
      setStepIdx(-1);
      // BUG FIX: Show the actual backend error detail, not just "Network Error"
      const detail = err.message || 'Analysis failed. Check backend logs.';
      toast.error(detail);
    }
  }

  if (displaySession && !isLoading) {
    return <AnalysisResult session={displaySession} />;
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Video Analysis</h1>
        <p className="page-subtitle">Paste a YouTube URL or file path to generate transcript, summary & insights.</p>
      </div>

      {/* Input card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Analyze a New Video</span>
        </div>
        <form onSubmit={handleSubmit} className="card-body">
          {/* URL input area */}
          <div className="video-input-area mb-3">
            <div className="video-input-main">
              <Link2 size={18} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
              <input
                className="video-url-input"
                value={source}
                onChange={e => setSource(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or /path/to/video.mp4"
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center gap-3">
              <div style={{ flex: 1 }}>
                <label className="input-label">Language</label>
                <select className="select" value={language} onChange={e => setLanguage(e.target.value)} disabled={isLoading}>
                  <option value="english">English</option>
                  <option value="hinglish">Hinglish</option>
                </select>
              </div>
              <div style={{ paddingTop: 22 }}>
                <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading || !source.trim()}>
                  {isLoading ? <><div className="spinner spinner-sm" /> Analyzing…</> : <><Zap size={16} /> Analyze Video</>}
                </button>
              </div>
            </div>
          </div>

          {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>⚠️ {error}</div>}
        </form>
      </div>

      {/* Pipeline progress */}
      {isLoading && stepIdx >= 0 && (
        <div className="card card-p">
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>🔄 Processing Your Video…</p>
          <div className="steps">
            {STEPS.map((step, i) => {
              const status = i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending';
              return (
                <div key={step.key} className="step">
                  <div className={`step-dot ${status}`} />
                  <span className={`step-label ${status}`}>{step.label}</span>
                  {status === 'done' && <span style={{ marginLeft: 'auto', color: 'var(--success)', fontSize: 13 }}>✓</span>}
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--text-subtle)' }}>
            This may take a few minutes depending on video length…
          </p>
        </div>
      )}

      {/* Example hint */}
      {!isLoading && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>Try an example:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              'https://youtube.com/watch?v=dQw4w9WgXcQ',
              'https://youtube.com/watch?v=jNQXAC9IVRw',
            ].map(url => (
              <button
                key={url}
                className="btn btn-secondary btn-sm"
                onClick={() => setSource(url)}
              >
                {url.slice(0, 40)}…
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


