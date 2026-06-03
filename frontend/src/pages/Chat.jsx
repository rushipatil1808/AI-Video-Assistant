import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, Bot, User, Trash2, Video, Loader2, Lightbulb } from 'lucide-react';
import { chatWithVideo } from '../services/api.jsx';
import { useSessionStore } from '../hooks/useSessionStore.jsx';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  'What are the main takeaways?',
  'What action items were discussed?',
  'What key decisions were made?',
  'Summarize the most important points.',
  'What open questions remain?',
];

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function Chat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionParam = searchParams.get('session');
  const { sessions } = useSessionStore();

  const [selectedId, setSelectedId] = useState(sessionParam || sessions[0]?.session_id || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const selectedSession = sessions.find(s => s.session_id === selectedId);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (sessionParam) setSelectedId(sessionParam); }, [sessionParam]);

  async function send(text) {
    const q = text || input.trim();
    if (!q || !selectedId || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q, id: Date.now() }]);
    setLoading(true);
    try {
      const res = await chatWithVideo(selectedId, q);
      setMessages(prev => [...prev, { role: 'assistant', content: res.answer, id: Date.now() + 1 }]);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Chat failed');
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ ' + (e.response?.data?.detail || 'Error occurred'), id: Date.now() + 1 }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: 'calc(100vh - var(--header-height) - 48px)', display: 'flex', overflow: 'hidden', margin: '-24px', background: 'var(--bg)' }}>
      {/* LEFT: Sources */}
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Sources</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Select a video</p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {sessions.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>No videos analyzed yet.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => navigate('/analysis')}>
                Analyze Video
              </button>
            </div>
          ) : sessions.map(s => (
            <button
              key={s.session_id}
              onClick={() => { setSelectedId(s.session_id); setMessages([]); }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, marginBottom: 2, cursor: 'pointer', border: 'none',
                background: selectedId === s.session_id ? 'var(--primary-bg)' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (selectedId !== s.session_id) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { if (selectedId !== s.session_id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div className="flex items-center gap-2">
                <Video size={13} style={{ color: selectedId === s.session_id ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                <p className="truncate" style={{ fontSize: 12.5, fontWeight: 500, color: selectedId === s.session_id ? 'var(--primary)' : 'var(--text)' }}>{s.title}</p>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2, paddingLeft: 21 }}>{timeAgo(s.created_at)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* CENTER: Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Chat header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{selectedSession ? selectedSession.title : 'Research Chat'}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedSession ? 'Ask anything about this video' : 'Select a video to begin'}</p>
          </div>
          {messages.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setMessages([])}>
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
                {SUGGESTIONS.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: 13 }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`msg ${msg.role}`}>
              <div className="msg-avatar">
                {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
              </div>
              <div className="msg-bubble">{msg.content}</div>
            </div>
          ))}

          {loading && (
            <div className="msg assistant">
              <div className="msg-avatar"><Bot size={15} /></div>
              <div className="msg-bubble flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: 'var(--text-muted)' }}>Thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', transition: 'border-color 0.15s, box-shadow 0.15s' }}
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

      {/* RIGHT: Context */}
      <div style={{ width: 220, flexShrink: 0, borderLeft: '1px solid var(--border)', padding: 14, overflowY: 'auto' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Context</p>
        {selectedSession ? (
          <>
            <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 8, marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 4 }}>Active Source</p>
              <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>{selectedSession.title}</p>
              <span className="badge badge-indigo" style={{ marginTop: 6 }}>{selectedSession.language}</span>
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Suggestions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SUGGESTIONS.slice(0, 3).map(q => (
                <button key={q} onClick={() => send(q)} disabled={loading}
                  style={{ textAlign: 'left', fontSize: 12, padding: '7px 10px', borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1.4 }}>
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
  );
}


