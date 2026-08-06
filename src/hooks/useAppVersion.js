import { useEffect, useRef, useState } from 'react';

// 🔄 CAMADA 1 — detecção de novo deploy.
// O arquivo /version.json é reescrito em CADA build (plugin no vite.config.js).
// Guardamos a versão lida na primeira checagem e comparamos nas seguintes:
// diferente = deploy novo no ar → sinaliza atualização.
//
// ⚠️ MOBILE: setInterval congela quando o app vai pro background. Por isso a
// checagem também acontece em 'visibilitychange' e 'focus' (voltar do banco).
// Falha de rede é silenciosa — nunca aparece erro pro usuário.

// ⏱️ 06/08 — o intervalo foi elevado a 5 min por custo de requisição, mas isso
// deixou o aviso demorando até 5 MINUTOS pra quem está com a tela aberta (sem
// sair e voltar, visibilitychange/focus nunca disparam). Voltou pra 60s: é uma
// requisição minúscula (version.json) e a percepção de atualização é imediata.
const INTERVALO = 60000; // 1 min

export function useAppVersion() {
  const [temAtualizacao, setTemAtualizacao] = useState(false);
  const versaoInicial = useRef(null);

  useEffect(() => {
    let cancelado = false;

    const checar = async () => {
      if (cancelado || !navigator.onLine) return;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        // Se o servidor devolver o index.html (fallback SPA), ignora: não é versão.
        const texto = await res.text();
        if (!texto.trim().startsWith('{')) return;
        const v = JSON.parse(texto)?.version;
        if (!v || cancelado) return;
        if (versaoInicial.current === null) {
          versaoInicial.current = v;
          return;
        }
        if (v !== versaoInicial.current) setTemAtualizacao(true);
      } catch {
        // silêncio total (offline, CDN instável, etc.)
      }
    };

    checar();
    const timer = setInterval(checar, INTERVALO);
    const aoVoltar = () => { if (!document.hidden) checar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', checar);

    return () => {
      cancelado = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', checar);
    };
  }, []);

  return temAtualizacao;
}

export default useAppVersion;