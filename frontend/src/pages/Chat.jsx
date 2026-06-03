import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, Bot, User, Trash2, Video, Loader2, Lightbulb, Plus, X, Link2, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithVideo, getLibrary, deleteLibraryVideo, analyzeVideo } from '../services/api.jsx';
import { useSessionStore } from '../hooks/useSessionStore.jsx';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function buildSuggestions(video) {
  if (!video) return [
    'What are the main takeaways?',
    'What action items were discussed?',
    'What key decisions were made?',
  ];
  return [
    'What are the main takeaways from this video?',
    'What action items were discussed?',
    'What key decisions were made?',
    'Summarize the most important points.',
    'What open questions remain unresolved?',
  ];
}

// ── Add Video Modal ────────────────────────────────────────────────────────────
function AddVideoModal({ onClose, onAdded }) {
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('english');
  const [loading, setLoading] = useState(false);

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    try {
      const result = await analyzeVideo(url.trim(), language);
      toast.success(`✅ Analyzed: ${result.title}`);
      onAdded(result);
      onClose();
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'Analysis failed';
      toast.error(typeof detail === 'string' ? detail : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 12, padding: 24, width: 380,
        border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Analyze New Video</p>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />
        <form onSubmit={handleAnalyze}>
          <div style={{ marginBottom: 14 }}>
            <label className="input-label">YouTube URL</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
              <Link2 size={15} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                disabled={loading}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', outline: 'none' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="input-label">Language</label>
            <select
              className="select"
              value={language}
              onChange={e => setLanguage(e.target.value)}
              disabled={loading}
            >
              <option value="english">English</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading || !url.trim()}>
              {loading
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</>
                : <><Zap size={14} /> Analyze</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Chat Component ───────────────────────────────────────────────────────
export default function Chat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionParam = searchParams.get('session');
  const { sessions, addSession } = useSessionStore();

  // BUG FIX 2: video library synced from backend
  const [library, setLibrary] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(true);

  // BUG FIX 5: messages keyed by session_id for isolated history
  const [messagesBySession, setMessagesBySession] = useState({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  const [selectedId, setSelectedId] = useState(sessionParam || sessions[0]?.session_id || null);
  const bottomRef = useRef(null);

  // BUG FIX 2: Sync library from backend on mount
  useEffect(() => {
    getLibrary()
      .then(data => {
        if (data?.videos?.length) {
          setLibrary(data.videos);
          if (!selectedId) setSelectedId(data.videos[0]?.session_id || null);
        } else {
          // Fall back to local sessions store if backend has no data yet
          if (sessions.length) {
            setLibrary(sessions.map(s => ({
              session_id: s.session_id,
              title: s.title,
              url: s.source || s.url || '',
              language: s.language,
              timestamp: s.created_at,
              summary: s.summary?.slice(0, 200) || '',
              action_items: s.action_items || '',
              key_decisions: s.key_decisions || '',
              open_questions: s.open_questions || '',
            })));
          }
        }
      })
      .catch(() => {
        // Backend offline: fall back to localStorage sessions
        if (sessions.length) {
          setLibrary(sessions.map(s => ({
            session_id: s.session_id,
            title: s.title,
            url: s.source || s.url || '',
            language: s.language,
            timestamp: s.created_at,
            summary: s.summary?.slice(0, 200) || '',
            action_items: s.action_items || '',
            key_decisions: s.key_decisions || '',
            open_questions: s.open_questions || '',
          })));
        }
      })
      .finally(() => setLibraryLoading(false));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messagesBySession, selectedId]);
  useEffect(() => { if (sessionParam) setSelectedId(sessionParam); }, [sessionParam]);

  const selectedVideo = library.find(v => v.session_id === selectedId);
  const messages = messagesBySession[selectedId] || [];

  // BUG FIX 5: switch video → load that video's history, show welcome message
  function switchVideo(id) {
    setSelectedId(id);
    setMessagesBySession(prev => {
      if (prev[id]) return prev; // already has history
      const vid = library.find(v => v.session_id === id);
      return {
        ...prev,
        [id]: [{
          role: 'assistant',
          content: `👋 **Video loaded!** Ask me anything about *${vid?.title || 'this video'}*.`,
          id: Date.now(),
        }],
      };
    });
  }

  // BUG FIX 2: delete video from library
  async function handleDelete(e, id) {
    e.stopPropagation();
    try {
      await deleteLibraryVideo(id);
      setLibrary(prev => prev.filter(v => v.session_id !== id));
      if (selectedId === id) {
        const remaining = library.filter(v => v.session_id !== id);
        setSelectedId(remaining[0]?.session_id || null);
      }
      toast.success('Video removed');
    } catch {
      toast.error('Failed to delete video');
    }
  }

  // BUG FIX 2: when new video is analyzed via modal, add it to library
  function handleVideoAdded(result) {
    addSession(result);
    const entry = {
      session_id: result.session_id,
      title: result.title,
      url: result.source || result.url || '',
      language: result.language,
      timestamp: result.created_at,
      summary: result.summary?.slice(0, 200) || '',
      action_items: result.action_items || '',
      key_decisions: result.key_decisions || '',
      open_questions: result.open_questions || '',
    };
    setLibrary(prev => [entry, ...prev]);
    switchVideo(result.session_id);
  }

  // BUG FIX 3 + 5: send message, markdown rendered, scoped to session
  async function send(text) {
    const q = text || input.trim();
    if (!q || !selectedId || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: q, id: Date.now() };
    setMessagesBySession(prev => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), userMsg],
    }));
    setLoading(true);
    try {
      const res = await chatWithVideo(selectedId, q);
      const botMsg = { role: 'assistant', content: res.answer, id: Date.now() + 1 };
      setMessagesBySession(prev => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] || []), botMsg],
      }));
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || 'Chat failed';
      const errMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      toast.error(errMsg.slice(0, 100));
      setMessagesBySession(prev => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] || []), { role: 'assistant', content: `⚠️ ${errMsg}`, id: Date.now() + 1 }],
      }));
    } finally {
      setLoading(false);
    }
  }

  // BUG FIX 4: dynamic suggestions from video metadata
  const suggestions = buildSuggestions(selectedVideo);

  return (
    <>
      {showAddModal && (
        <AddVideoModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleVideoAdded}
        />
      )}

      <div style={{ height: 'calc(100vh - var(--header-height) - 48px)', display: 'flex', overflow: 'hidden', margin: '-24px', background: 'var(--bg)' }}>

        {/* LEFT: Sources */}
        <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Sources</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Select a video</p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {libraryLoading ? (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <Loader2 size={20} style={{ color: 'var(--text-subtle)', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : library.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                <Bot size={28} style={{ color: 'var(--text-subtle)', marginBottom: 8 }} />
                <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No videos yet</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
                  Analyze a video to get started.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/analysis')}>
                  Analyze a Video
                </button>
              </div>
            ) : library.map(v => (
              <div
                key={v.session_id}
                onMouseEnter={() => setHoveredId(v.session_id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ position: 'relative' }}
              >
                <button
                  onClick={() => switchVideo(v.session_id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6,
                    marginBottom: 2, cursor: 'pointer', border: 'none',
                    background: selectedId === v.session_id ? 'var(--primary-bg)' : 'transparent',
                    transition: 'background 0.1s',
                    paddingRight: hoveredId === v.session_id ? 30 : 10,
                  }}
                  onMouseEnter={e => { if (selectedId !== v.session_id) e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (selectedId !== v.session_id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-center gap-2">
                    <Video size={13} style={{ color: selectedId === v.session_id ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                    <p className="truncate" style={{ fontSize: 12.5, fontWeight: 500, color: selectedId === v.session_id ? 'var(--primary)' : 'var(--text)' }}>{v.title}</p>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2, paddingLeft: 21 }}>{timeAgo(v.timestamp || v.created_at)}</p>
                </button>
                {hoveredId === v.session_id && (
                  <button
                    onClick={e => handleDelete(e, v.session_id)}
                    title="Remove video"
                    style={{
                      position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--danger)', padding: 4, borderRadius: 4,
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* BUG FIX 2: Add Video button */}
          <div style={{ padding: 10, borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-secondary btn-full btn-sm"
              onClick={() => setShowAddModal(true)}
              style={{ justifyContent: 'center', gap: 6 }}
            >
              <Plus size={13} /> Add Video
            </button>
          </div>
        </div>

        {/* CENTER: Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Chat header */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {selectedVideo ? selectedVideo.title : 'Research Chat'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {selectedVideo ? 'Ask anything about this video' : 'Select a video to begin'}
              </p>
            </div>
            {messages.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setMessagesBySession(prev => ({ ...prev, [selectedId]: [] }))}>
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!selectedId && (
              <div className="empty-state">
                <div className="empty-icon"><Bot size={24} /></div>
                <p className="empty-title">Select a source</p>
                <p className="empty-desc">Choose a video from the left panel to start chatting.</p>
              </div>
            )}

            {selectedId && messages.length === 0 && !loading && (
              <div className="empty-state" style={{ paddingTop: 20 }}>
                <div className="empty-icon"><Lightbulb size={24} /></div>
                <p className="empty-title">Ask anything</p>
                <p className="empty-desc">The AI has full context of the transcript and can answer detailed questions.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 380 }}>
                  {suggestions.map(q => (
                    <button key={q} onClick={() => send(q)}
                      className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: 13 }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* BUG FIX 3: Markdown rendered messages */}
            {messages.map(msg => (
              <div key={msg.id} className={`msg ${msg.role}`}>
                <div className="msg-avatar">
                  {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                </div>
                <div className="msg-bubble">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown
                      className="prose prose-sm max-w-none"
                      components={{
                        p: ({ children }) => <p style={{ margin: '0 0 8px 0', lineHeight: 1.7 }}>{children}</p>,
                        ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: '4px 0 8px' }}>{children}</ul>,
                        ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: '4px 0 8px' }}>{children}</ol>,
                        li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                        strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
                        code: ({ children }) => <code style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>{children}</code>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg assistant">
                <div className="msg-avatar"><Bot size={15} /></div>
                <div className="msg-bubble flex items-center gap-2">
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <div
              style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={selectedId ? 'Ask a question… (Enter to send)' : 'Select a source first…'}
                disabled={!selectedId || loading}
                rows={1}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13.5, resize: 'none', maxHeight: 120, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
              />
              <button
                onClick={() => send()}
                disabled={!selectedId || !input.trim() || loading}
                className="btn btn-primary"
                style={{ padding: '6px 12px', flexShrink: 0, alignSelf: 'flex-end' }}
              >
                <Send size={14} />
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 6, textAlign: 'center' }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* RIGHT: Context — BUG FIX 4: fully dynamic */}
        <div style={{ width: 220, flexShrink: 0, borderLeft: '1px solid var(--border)', padding: 14, overflowY: 'auto' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Context</p>
          {selectedVideo ? (
            <>
              {/* Active Source */}
              <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 8, marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 4 }}>Active Source</p>
                <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>{selectedVideo.title}</p>
                <span className="badge badge-indigo" style={{ marginTop: 6 }}>{selectedVideo.language}</span>
              </div>

              {/* BUG FIX 4: clickable suggestions that fill input */}
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Suggestions</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suggestions.slice(0, 4).map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    disabled={loading}
                    style={{
                      textAlign: 'left', fontSize: 12, padding: '7px 10px', borderRadius: 6,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1.4,
                      transition: 'background 0.1s, color 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-bg)'; e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select a video to see context.</p>
          )}
        </div>
      </div>
    </>
  );
}
