import { useState } from 'react';
import { Search as SearchIcon, FileText, Video } from 'lucide-react';
import { useSessionStore } from '../hooks/useSessionStore.jsx';
import { useNavigate } from 'react-router-dom';

export default function Search() {
  const [query, setQuery] = useState('');
  const { sessions } = useSessionStore();
  const navigate = useNavigate();

  const results = query.trim()
    ? sessions.filter(s =>
        s.title?.toLowerCase().includes(query.toLowerCase()) ||
        s.summary?.toLowerCase().includes(query.toLowerCase()) ||
        s.transcript?.toLowerCase().includes(query.toLowerCase()) ||
        s.source?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  function highlight(text, q) {
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text.slice(0, 120) + '…';
    const start = Math.max(0, idx - 60);
    const end = Math.min(text.length, idx + q.length + 80);
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Search</h1>
        <p className="page-subtitle">Full-text search across all your sessions</p>
      </div>

      <div className="input-icon-wrap" style={{ marginBottom: 24 }}>
        <SearchIcon className="icon" size={16} />
        <input
          className="input"
          style={{ fontSize: 15, padding: '12px 12px 12px 40px' }}
          placeholder="Search transcripts, summaries, titles…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {query && results.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><SearchIcon size={24} /></div>
          <p className="empty-title">No results</p>
          <p className="empty-desc">No sessions match "{query}"</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
            {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map(s => (
              <div
                key={s.session_id}
                className="card card-p cursor-pointer"
                onClick={() => navigate(`/analysis/${s.session_id}`)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Video size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }} className="truncate">{s.title}</p>
                </div>
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <span className="badge badge-indigo">{s.language}</span>
                </div>
                {s.summary && (
                  <div className="flex items-start gap-2">
                    <FileText size={12} style={{ color: 'var(--text-subtle)', flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {highlight(s.summary, query)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!query && sessions.length > 0 && (
        <div style={{ color: 'var(--text-subtle)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
          Start typing to search across {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}


