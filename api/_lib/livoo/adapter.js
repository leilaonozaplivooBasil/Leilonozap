// Adapter Leilão NoZap → Livoo Connect. Mapeia LOTES DE LEILÃO (core do NoZap) → LivooLot
// e produtos do catálogo → LivooProduct. Preços no NoZap estão em REAIS → convertidos p/ cents.
const reais = (n) => Math.round((Number(n) || 0) * 100);
const firstImg = (urls) => {
  if (Array.isArray(urls)) return urls[0] || null;
  if (typeof urls === 'string') { try { const a = JSON.parse(urls); return Array.isArray(a) ? (a[0] || null) : urls; } catch { return urls; } }
  return null;
};

// auctions (leilão) → LivooLot (modo auction / leilão ao vivo)
export function toLivooLot(a) {
  return {
    external_id: String(a.id),
    title: a.title || a.description || 'Lote',
    start_cents: reais(a.starting_price),
    increment_cents: reais(a.increment) || 100,
    current_cents: reais(a.current_price ?? a.starting_price),
    type: 'venda', // NoZap leiloa pra VENDER (reverso é caso do AGA)
    ends_at: a.end_time || null,
  };
}

// products (catálogo) → LivooProduct (modo commerce)
export function toLivooProduct(p) {
  return {
    external_id: String(p.id),
    title: p.description || p.title || 'Produto',
    price_cents: reais(p.price_catalog ?? p.selling_price_retail),
    image_url: firstImg(p.image_urls),
    stock: p.quantity ?? null,
  };
}
