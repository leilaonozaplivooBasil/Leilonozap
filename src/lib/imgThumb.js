// Miniatura redimensionada no servidor (ver api/functions/resizeImage.js) para
// fotos de produto de fornecedor — evita baixar o arquivo ORIGINAL (às vezes
// vários MB) só pra desenhar um ícone pequeno em listas grandes.
// data: URI (ícones locais/inline) e SVG não precisam de resize.
export function thumbUrl(url, width = 160) {
  if (!url || url.startsWith('data:') || /\.svg(\?|$)/i.test(url)) return url;
  return `/api/functions/resizeImage?url=${encodeURIComponent(url)}&w=${width}`;
}
