import { useState, useCallback } from 'react';
import { analyzeVideo } from '../services/api.jsx';
import { useSessionStore } from './useSessionStore.jsx';

export function useAnalyze() {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { addSession, setActive } = useSessionStore();

  const analyze = useCallback(async (source, language = 'english') => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeVideo(source, language);
      addSession(result);
      setActive(result);
      return result;
    } catch (e) {
      // BUG FIX: axios wraps backend errors in e.response.data.detail
      // Fallback chain: backend detail → axios message → generic
      let msg = e.response?.data?.detail || e.message || 'Analysis failed. Check that the backend is running.';
      if (Array.isArray(msg)) {
        msg = msg.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [addSession, setActive]);

  return { analyze, isLoading, error };
}


