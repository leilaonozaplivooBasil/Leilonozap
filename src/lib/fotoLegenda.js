/**
 * Legenda escrita sobre a foto do leilão, SEM coluna nova no banco:
 * o texto vai no fragment da própria URL (https://...jpg#txt=Meu%20texto).
 * Navegadores ignoram o fragment ao carregar a imagem, então todo consumidor
 * de image_urls continua funcionando — quem quiser exibir a legenda usa capOf().
 */
export function capOf(url) {
  try {
    const hash = String(url).split('#')[1];
    if (!hash) return '';
    return new URLSearchParams(hash).get('txt') || '';
  } catch {
    return '';
  }
}

export function withCap(url, txt) {
  const base = String(url).split('#')[0];
  const t = (txt || '').trim();
  return t ? `${base}#txt=${encodeURIComponent(t)}` : base;
}
