import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Bot, User, Loader2, MessageSquare, Video, Trash2, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithVideo } from '../services/api.jsx';
import { useSessionStore } from '../hooks/useSessionStore.jsx';
import toast from 'react-hot-toast';

function buildSuggestions(video) {
  if (!video) return [
    'What are the main takeaways?',
    'What action items were discussed?',
    'What key decisions were made?',
  ];
  return [
    'What are the main takeaways from this video?',
    'Summarize the most important points.',
    'What action items were discussed?',
  ];
}

export default function Chat() {
  const [searchParams] = useSearchParams();
  const sessionParam = searchParams.get('session');
  const { sessions, removeSession, loading: sessionsLoading } = useSessionStore();

  const [selectedId, setSelectedId] = useState(sessionParam || null);
  const [messagesBySession, setMessagesBySession] = useState({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  const bottomRef = useRef(null);

  // Set default selected session if none is selected
  useEffect(() => {
    if (!selectedId && !sessionParam && sessions.length > 0) {
      setSelectedId(sessions[0].session_id);
    } else if (sessionParam) {
      setSelectedId(sessionParam);
    }
  }, [sessions, sessionParam, selectedId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messagesBySession, selectedId]);

  const selectedVideo = sessions.find(v => v.session_id === selectedId);
  const messages = messagesBySession[selectedId] || [];

  const switchVideo = useCallback((id) => {
    setSelectedId(id);
    setMessagesBySession(prev => {
      if (prev[id]) return prev;
      const vid = sessions.find(v => v.session_id === id);
      return {
        ...prev,
        [id]: [{
          role: 'assistant',
          content: `Hi! I've read the transcript for **${vid?.title || 'this video'}**. What would you like to know?`,
          id: Date.now(),
        }],
      };
    });
  }, [sessions]);

  useEffect(() => {
    if (selectedId && !messagesBySession[selectedId]) {
      switchVideo(selectedId);
    }
  }, [selectedId, sessions, messagesBySession]);

  const handleDelete = useCallback(async (e, id) => {
    e.stopPropagation();
    const success = await removeSession(id);
    if (success) {
      toast.success('Video removed');
      if (selectedId === id) {
        const remaining = sessions.filter(v => v.session_id !== id);
        setSelectedId(remaining.length > 0 ? remaining[0].session_id : null);
      }
    }
  }, [removeSession, sessions, selectedId]);

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

  const suggestions = buildSuggestions(selectedVideo);

  return (
    <div className="page-wrapper-full">
      {/* Left panel: Video List */}
      <div className="chat-left">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Analyzed Videos</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {sessionsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 10px' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: 'var(--text-muted)' }} />
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No videos analyzed yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sessions.map(v => (
                <div
                  key={v.session_id}
                  onMouseEnter={() => setHoveredId(v.session_id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ position: 'relative' }}
                >
                  <button
                    onClick={() => switchVideo(v.session_id)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 12px',
                      borderRadius: 6, cursor: 'pointer', border: '1px solid transparent',
                      background: selectedId === v.session_id ? 'var(--primary-bg)' : 'transparent',
                      borderColor: selectedId === v.session_id ? 'rgba(99,102,241,0.2)' : 'transparent',
                      transition: 'background 0.15s',
                      paddingRight: hoveredId === v.session_id ? 30 : 12,
                    }}
                    onMouseEnter={e => { if (selectedId !== v.session_id) e.currentTarget.style.background = 'var(--surface)'; }}
                    onMouseLeave={e => { if (selectedId !== v.session_id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="flex items-center gap-2">
                      <Video size={14} color={selectedId === v.session_id ? 'var(--primary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                      <span className="truncate" style={{
                        fontSize: 13,
                        fontWeight: selectedId === v.session_id ? 600 : 500,
                        color: selectedId === v.session_id ? 'var(--primary)' : 'var(--text)',
                      }}>
                        {v.title}
                      </span>
                    </div>
                  </button>
                  {hoveredId === v.session_id && (
                    <button
                      onClick={e => handleDelete(e, v.session_id)}
                      title="Remove video"
                      style={{
                        position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)',
                        background: 'transparent', cursor: 'pointer',
                        color: 'var(--danger)', padding: 4, borderRadius: 4,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main panel: Chat Messages */}
      <div className="chat-main">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {selectedVideo ? selectedVideo.title : 'Chat'}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!selectedId && (
            <div className="empty-state">
              <div className="empty-icon"><MessageSquare size={24} /></div>
              <p className="empty-title">Select a video</p>
              <p className="empty-desc">Choose an analyzed video from the left panel to start chatting.</p>
            </div>
          )}

          {/* Suggestions block */}
          {selectedId && messages.length <= 1 && !loading && (
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, maxWidth: 500, margin: '0 auto', marginTop: 20, width: '100%' }}>
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={18} color="var(--warning)" />
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Suggested Questions</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {suggestions.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: 13, padding: '10px 14px' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`msg ${msg.role}`}>
              <div className="msg-avatar">
                {msg.role === 'user' ? <User size={16} color="var(--text-muted)" /> : <Bot size={16} color="var(--primary)" />}
              </div>
              <div className="msg-bubble">
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: '4px 0 8px' }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: '4px 0 8px' }}>{children}</ol>,
                      li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                      strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                      code: ({ children }) => <code style={{ background: 'var(--surface)', padding: '2px 4px', borderRadius: 4, fontSize: 12 }}>{children}</code>,
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
              <div className="msg-avatar"><Bot size={16} color="var(--primary)" /></div>
              <div className="msg-bubble flex items-center gap-2" style={{ padding: '12px 16px' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--white)' }}>
          <div
            style={{
              display: 'flex', gap: 10, alignItems: 'flex-end',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '10px 14px',
              transition: 'border-color 0.15s, box-shadow 0.15s'
            }}
            onFocusCapture={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
            onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={selectedId ? "Ask a question about the video..." : "Select a video first..."}
              disabled={!selectedId || loading}
              rows={1}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: 14, resize: 'none', maxHeight: 120,
                color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
                paddingTop: 4,
              }}
            />
            <button
              onClick={() => send()}
              disabled={!selectedId || !input.trim() || loading}
              className="btn btn-primary"
              style={{ padding: '8px 12px', flexShrink: 0, alignSelf: 'flex-end', borderRadius: 8 }}
            >
              <Send size={15} />
            </button>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text-subtle)', marginTop: 8, textAlign: 'center' }}>
            Press Enter to send, Shift+Enter for new line.
          </p>
        </div>
      </div>
    </div>
  );
}
