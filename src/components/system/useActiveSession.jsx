import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// 🚀 OTIMIZAÇÃO (fase 1 - 18/08/2026):
// 1) O efeito antes dependia de `location.pathname` — como o Layout remonta a
//    cada navegação e esse hook roda dentro dele, TODA troca de página recriava
//    o timeout/interval do heartbeat (um novo delay de 5s + rede a cada nav).
//    Agora a página atual é lida por ref, sem disparar o efeito de novo.
// 2) Heartbeat só roda com a aba visível (regra mobile: nada de rede em
//    background) — antes o setInterval seguia rodando mesmo em segundo plano.
export function useActiveSession(currentUser) {
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  const sessionIdRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
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
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      // 🛰️ 15/09/2026 — a batida vai pelo SERVIDOR. Antes o navegador inseria
      // direto em live_sessions com a chave pública, e a RLS só deixa
      // `authenticated` escrever: eram ~900 respostas 401 por dia e NENHUMA
      // presença gravada desde 26/05 — o "pessoas navegando agora" da Home
      // estava morto. A rota grava com a chave de serviço e limita por IP.
      try {
        const r = await fetch('/api/functions/liveHeartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            user_id: currentUser?.id || null,
            page: pathRef.current,
            user_agent: navigator.userAgent,
          }),
        });
        // Silenciosamente ignora rate limit
        if (!r.ok && r.status !== 429) console.debug('Session heartbeat error:', r.status);
      } catch (error) {
        console.debug('Session heartbeat error:', error?.message);
      }
    };

    // Heartbeat inicial com delay de 5s (evita sobrecarga no mount)
    const initialTimeout = setTimeout(updateSession, 5000);

    // Heartbeat a cada 2 minutos
    intervalRef.current = setInterval(updateSession, 120000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentUser?.id]);

  return null;
}