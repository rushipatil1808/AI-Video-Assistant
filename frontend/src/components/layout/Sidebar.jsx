import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Video, MessageSquare,
  Database, Search, Settings, Zap, ChevronLeft, ChevronRight, Library,
} from 'lucide-react';
import { useSessionStore } from '../../hooks/useSessionStore';

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Video Analysis', icon: Video, to: '/analysis' },
  { label: 'Chat / Q&A', icon: MessageSquare, to: '/chat' },
  { label: 'Library', icon: Library, to: '/library' },
  { label: 'Knowledge Base', icon: Database, to: '/knowledge' },
  { label: 'Search', icon: Search, to: '/search' },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { sessions } = useSessionStore();

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon" style={{ background: 'transparent', padding: 0, border: 'none' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="url(#logo-grad)" />
            <path d="M13 10l9 6-9 6V10z" fill="white" />
            <defs>
              <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1" />
                <stop offset="1" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        {!collapsed && <span className="logo-text">VideoIQ</span>}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {!collapsed && <p className="nav-section-label">Menu</p>}
        {NAV.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item${isActive ? ' active' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="nav-icon" />
            {!collapsed && <span className="nav-label">{label}</span>}
            {!collapsed && to === '/library' && sessions.length > 0 && (
              <span className="badge badge-indigo" style={{ marginLeft: 'auto', padding: '1px 7px' }}>
                {sessions.length}
              </span>
            )}
          </NavLink>
        ))}

        {/* Recent sessions */}
        {!collapsed && sessions.length > 0 && (
          <>
            <p className="nav-section-label">Recent</p>
            {sessions.slice(0, 4).map(s => (
              <NavLink
                key={s.session_id}
                to={`/analysis/${s.session_id}`}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <Video className="nav-icon" style={{ width: 14, height: 14 }} />
                <span className="nav-label truncate" style={{ fontSize: 12.5 }}>{s.title}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Toggle button */}
      <div className="sidebar-footer">
        <button
          className="nav-item"
          onClick={onToggle}
          style={{ width: '100%', background: 'none' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight className="nav-icon" />
            : <><ChevronLeft className="nav-icon" /><span className="nav-label">Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}


