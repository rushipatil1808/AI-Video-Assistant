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
      const msg = e.response?.data?.detail || e.message || 'Analysis failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [addSession, setActive]);

  return { analyze, isLoading, error };
}


