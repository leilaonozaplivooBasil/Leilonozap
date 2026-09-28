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

/**
 * 🎬 28/09/2026 — Quais pedidos ao Storage o service worker pode intermediar.
 *
 * Até o #522 nenhuma regra de cache sob demanda funcionava (a rota de
 * navegação quebrava o registro de todas). Quando voltaram a funcionar, a do
 * Storage passou a pegar TAMBÉM os vídeos dos destaques (iPhone 17, Harley) —
 * e vídeo que passa por service worker não toca no Safari do iPhone: ele pede
 * o arquivo em pedaços (Range) e exige resposta 206. Sintoma no print do dono:
 * card sem vídeo.
 *
 * Vídeo e áudio vão direto para a rede, como sempre foram. Só imagem passa.
 *
 * ⚠️ O Workbox COPIA esta função como texto para dentro do sw.js: ela não
 * pode usar nada de fora dela (nem constante, nem import).
 */
export function storageSemVideo({ url, request }) {
  if (url.hostname !== 'gezvviyegtxytnwjkrjv.supabase.co') return false;
  if (!url.pathname.startsWith('/storage/')) return false;
  const destino = request && request.destination;
  if (destino === 'video' || destino === 'audio') return false;
  if (request && request.headers && request.headers.has('range')) return false;
  if (url.pathname.includes('/videos-produtos/')) return false;
  if (/\.(?:mp4|webm|mov|m4v|mp3|m4a|ogg|wav)$/i.test(url.pathname)) return false;
  return true;
}
