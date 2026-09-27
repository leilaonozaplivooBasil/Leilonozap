// 🪶 SERVICE WORKER LEVE — o que entra no precache (27/09/2026, "pode ir" do dono)
//
// Antes o service worker baixava o SITE INTEIRO na primeira visita: 322 arquivos,
// ~9 MB (todas as telas de admin, PDF, planilha, gráficos), disputando a internet
// do celular com a página que a pessoa estava abrindo.
//
// Agora o precache leva só o que a PRIMEIRA TELA usa: os scripts que o
// index.html carrega (entrada + modulepreload), o CSS, ícones e fontes. O resto
// entra no cache sob demanda, na primeira vez que a pessoa abre aquela tela
// (runtimeCaching `assets-imutaveis` no vite.config.js). Os nomes têm hash, então
// um arquivo guardado nunca fica velho.
//
// Arquivo puro, sem dependência de build: o vite.config.js passa o HTML e a lista.

/** Os scripts e estilos que o index.html pede (script src, modulepreload, stylesheet). */
export function arquivosDaPrimeiraTela(html) {
  const achados = new Set();
  const re = /<(?:script[^>]*\bsrc|link[^>]*\bhref)="\/?(assets\/[^"]+\.(?:js|css))"/g;
  for (const m of String(html || '').matchAll(re)) achados.add(m[1]);
  return achados;
}

/**
 * Filtra o manifesto do Workbox: fica o que não é JS (css, ico, woff2) e o JS
 * da primeira tela. Se o HTML não trouxer nenhum script (algo deu errado na
 * leitura), NÃO filtra: melhor precache pesado do que site sem cache.
 */
export function filtrarPrecache(entradas, primeiraTela) {
  const lista = Array.isArray(entradas) ? entradas : [];
  const temScript = [...(primeiraTela || [])].some((u) => u.endsWith('.js'));
  if (!temScript) return lista;
  return lista.filter((e) => {
    const url = String(e?.url || '').replace(/^\//, '');
    if (!url.endsWith('.js')) return true;
    return primeiraTela.has(url);
  });
}
