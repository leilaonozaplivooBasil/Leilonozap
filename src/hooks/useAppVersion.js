import { useEffect, useRef, useState } from 'react';

// 🔄 CAMADA 1 — detecção de novo deploy.
// O arquivo /version.json é reescrito em CADA build (plugin no vite.config.js).
// Guardamos a versão lida na primeira checagem e comparamos nas seguintes:
// diferente = deploy novo no ar → sinaliza atualização.
//
// ⚠️ MOBILE: setInterval congela quando o app vai pro background. Por isso a
// checagem também acontece em 'visibilitychange' e 'focus' (voltar do banco).
// Falha de rede é silenciosa — nunca aparece erro pro usuário.

// 💸 Custo: eram 60s × cada aba aberta × cada usuário — muita requisição só pra
// perguntar "mudou?". 5 minutos continua pegando o deploy novo rápido, e o
// usuário que volta do background é checado NA HORA (visibilitychange/focus),
// que é o caminho real de quase toda atualização percebida.
const INTERVALO = 300000; // 5 min

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