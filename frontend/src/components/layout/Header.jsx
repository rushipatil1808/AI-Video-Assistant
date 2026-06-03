import { Search, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const TITLES = {
  '/': 'Dashboard',
  '/analysis': 'Video Analysis',
  '/chat': 'Chat / Q&A',
  '/library': 'Library',
  '/knowledge': 'Knowledge Base',
  '/search': 'Search',
  '/settings': 'Settings',
};

export default function Header() {
  const { pathname } = useLocation();
  const base = '/' + pathname.split('/')[1];
  const title = TITLES[base] || 'VideoIQ';

  useEffect(() => {
    document.title = `VideoIQ | ${title}`;
  }, [title]);

  return (
    <header className="header">
      <div className="flex items-center gap-3">
        <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{title}</h1>
      </div>
      <div className="flex items-center gap-3" style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Search */}
        <div className="header-search">
          <Search size={14} />
          <span>Search…</span>
        </div>
        {/* Notifications */}
        <button className="icon-btn" title="Notifications">
          <Bell size={16} />
        </button>
        {/* Avatar */}
        <div
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', flexShrink: 0,
          }}
          title="Profile"
        >
          V
        </div>
      </div>
    </header>
  );
}


