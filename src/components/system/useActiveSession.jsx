import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export function useActiveSession(currentUser) {
  const location = useLocation();
  const sessionIdRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Gera ou recupera session_id único
    if (!sessionIdRef.current) {
      const stored = sessionStorage.getItem('live_session_id');
      if (stored) {
        sessionIdRef.current = stored;
      } else {
        sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('live_session_id', sessionIdRef.current);
      }
    }

    const updateSession = async () => {
      try {
        const existingSessions = await base44.entities.LiveSession.filter({ 
          session_id: sessionIdRef.current 
        });

        const sessionData = {
          session_id: sessionIdRef.current,
          user_id: currentUser?.id || null,
          last_heartbeat: new Date().toISOString(),
          page: location.pathname,
          user_agent: navigator.userAgent
        };

        if (existingSessions.length > 0) {
          await base44.entities.LiveSession.update(existingSessions[0].id, sessionData);
        } else {
          await base44.entities.LiveSession.create(sessionData);
        }
      } catch (error) {
        // Silenciosamente ignora rate limit
        if (error.status !== 429) {
          console.debug('Session heartbeat error:', error.message);
        }
      }
    };

    // Heartbeat inicial com delay de 5s (evita sobrecarga no mount)
    const initialTimeout = setTimeout(updateSession, 5000);

    // Heartbeat a cada 2 minutos (reduzido de 30s para evitar rate limit)
    intervalRef.current = setInterval(updateSession, 120000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentUser?.id, location.pathname]);

  return null;
}