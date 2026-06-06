import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { listSessions, deleteSession as apiDeleteSession } from '../services/api.jsx';

const SessionCtx = createContext(null);

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [active, setActiveState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch from backend on mount
  useEffect(() => {
    listSessions()
      .then(data => setSessions(data))
      .catch(err => console.error("Failed to load sessions", err))
      .finally(() => setLoading(false));
  }, []);

  const addSession = useCallback((result) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.session_id !== result.session_id);
      return [result, ...filtered];
    });
  }, []);

  const setActive = useCallback((session) => {
    setActiveState(session);
  }, []);

  const removeSession = useCallback(async (id) => {
    try {
      await apiDeleteSession(id);
      setSessions(prev => prev.filter(s => s.session_id !== id));
      setActiveState(prev => prev?.session_id === id ? null : prev);
      return true;
    } catch (e) {
      console.error("Failed to delete session", e);
      return false;
    }
  }, []);

  return (
    <SessionCtx.Provider value={{ sessions, active, addSession, setActive, removeSession, loading }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSessionStore() {
  return useContext(SessionCtx);
}
