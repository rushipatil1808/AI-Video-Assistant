import { NavLink, useLocation } from 'react-router-dom';
import { Video } from 'lucide-react';
import { useEffect } from 'react';

const LINKS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Analyze Video', to: '/analysis' },
  { label: 'PDF Summary', to: '/pdf' },
  { label: 'Chat', to: '/chat' },
];

const TITLES = {
  '/': 'Dashboard',
  '/analysis': 'Analyze Video',
  '/pdf': 'PDF Summary',
  '/chat': 'Chat',
};

export default function Navbar() {
  const { pathname } = useLocation();
  const base = '/' + pathname.split('/')[1];
  const title = TITLES[base] || 'QuickNotes AI';

  useEffect(() => {
    document.title = `QuickNotes AI | ${title}`;
  }, [title]);

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar-brand">
        <div className="navbar-brand-icon">
          <Video size={17} />
        </div>
        QuickNotes AI
      </div>

      {/* Nav Links */}
      <div className="navbar-links">
        {LINKS.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
