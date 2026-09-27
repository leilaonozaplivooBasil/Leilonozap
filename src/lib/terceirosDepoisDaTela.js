// 🐢➡️🐇 SCRIPTS DE TERCEIROS DEPOIS DA TELA (27/09/2026, "4 ok" do dono)
//
// Tag Manager, Analytics, Datadog e o Pixel da Meta carregavam junto com a
// página e disputavam a internet do celular com ela. A regra agora é uma só:
// a FILA de eventos nasce na hora (nada se perde), o SCRIPT só entra depois do
// evento `load`, quando o navegador fica ocioso — no máximo 3 s depois.
//
// O index.html faz o mesmo para GTM/GA/Datadog (ele roda antes deste módulo
// existir). Este arquivo serve o que nasce dentro do app: o Pixel da Meta.

/** Roda `fn` depois que a página terminou de abrir e o navegador ficou ocioso. */
export function depoisDaTela(fn, janela = typeof window !== 'undefined' ? window : null) {
  if (!janela || typeof fn !== 'function') return;
  let feito = false;
  const rodar = () => { if (feito) return; feito = true; try { fn(); } catch { /* terceiro nunca derruba a página */ } };
  const ocioso = () => {
    if (typeof janela.requestIdleCallback === 'function') janela.requestIdleCallback(rodar, { timeout: 3000 });
    else janela.setTimeout(rodar, 1500);
  };
  if (janela.document?.readyState === 'complete') ocioso();
  else janela.addEventListener('load', ocioso, { once: true });
}
