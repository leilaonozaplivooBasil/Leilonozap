// 🔑 LOGIN COM GOOGLE SOB DEMANDA (27/09/2026)
//
// O script do Google (gsi/client, ~90 KB) carregava em TODAS as páginas, para
// todo visitante, mas só as telas de entrar e de cadastrar usam. Agora quem
// precisa chama `garantirScriptGoogle()` e ele entra na hora, uma vez só.

const SRC = 'https://accounts.google.com/gsi/client';
let promessa = null;

/** Carrega o script do login do Google (uma vez) e resolve quando ele estiver pronto. */
export function garantirScriptGoogle() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.id) return Promise.resolve(true);
  if (promessa) return promessa;
  promessa = new Promise((resolve) => {
    const jaTem = document.querySelector(`script[src="${SRC}"]`);
    const s = jaTem || document.createElement('script');
    s.addEventListener('load', () => resolve(true), { once: true });
    s.addEventListener('error', () => { promessa = null; resolve(false); }, { once: true });
    if (!jaTem) { s.src = SRC; s.async = true; document.head.appendChild(s); }
  });
  return promessa;
}
