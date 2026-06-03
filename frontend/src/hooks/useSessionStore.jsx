// Simple in-memory + localStorage session store (no external library needed)
import { useState, useCallback, createContext, useContext, useEffect } from 'react';

const SessionCtx = createContext(null);

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('viq_sessions') || '[]'); }
    catch { return []; }
  });
  const [active, setActiveState] = useState(null);

  // Persist on change
  useEffect(() => {
    try { localStorage.setItem('viq_sessions', JSON.stringify(sessions)); }
    catch {}
  }, [sessions]);

  const addSession = useCallback((result) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.session_id !== result.session_id);
      return [result, ...filtered];
    });
  }, []);

  const setActive = useCallback((session) => {
    setActiveState(session);
  }, []);

  const removeSession = useCallback((id) => {
    setSessions(prev => prev.filter(s => s.session_id !== id));
    setActiveState(prev => prev?.session_id === id ? null : prev);
  }, []);

  return (
    <SessionCtx.Provider value={{ sessions, active, addSession, setActive, removeSession }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSessionStore() {
  return useContext(SessionCtx);
}


