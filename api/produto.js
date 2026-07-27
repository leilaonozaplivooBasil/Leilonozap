// produto — landing server-side dos links de produto (/p/:id?ref=...).
// (1) emite meta tags OG com a FOTO REAL do produto (preview no WhatsApp),
// (2) redireciona o navegador real pra página SPA /CatalogProductDetails?id=...
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = 'https://leilaonozap.net';

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function handler(req, res) {
  try {
    const id = String(req.query?.id || '').trim();
    const ref = String(req.query?.ref || '').trim();
    if (!id) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.status(200).send(`<script>location.replace('${SITE}')</script>`); }

    let p = null;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,description,price_catalog,selling_price_retail,image_urls&id=eq.${encodeURIComponent(id)}&limit=1`, {
        headers: { apikey: SR, Authorization: `Bearer ${SR}` },
      });
      const rows = await r.json();
      p = Array.isArray(rows) ? rows[0] : null;
    } catch (_) { /* segue sem produto */ }

    const destino = `${SITE}/CatalogProductDetails?id=${encodeURIComponent(id)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`;
    const title = p?.description ? `${p.description} — Leilão NoZap` : 'Produto — Leilão NoZap';
    const price = Number(p?.price_catalog) > 0 ? Number(p.price_catalog) : Number(p?.selling_price_retail) || 0;
    const desc = price > 0
      ? `Por apenas ${money(price)} no PIX. Aproveite na loja da Leilão NoZap!`
      : 'Confira este produto na loja da Leilão NoZap!';
    // FOTO REAL do produto — é isso que o WhatsApp mostra no preview
    const ogImage = (Array.isArray(p?.image_urls) && p.image_urls[0]) ? p.image_urls[0] : `${SITE}/brand/logo-horizontal-og.jpg`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600');
    res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta property="og:type" content="product" />
<meta property="og:site_name" content="Leilão NoZap" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="og:url" content="${esc(destino)}" />
<meta property="og:locale" content="pt_BR" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${esc(ogImage)}" />
<meta http-equiv="refresh" content="0; url=${esc(destino)}" />
<script>window.location.replace(${JSON.stringify(destino)});</script>
<style>body{background:#0a0f0d;color:#e5e7eb;font-family:system-ui,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}</style>
</head>
<body>
<a href="${esc(destino)}" style="color:#34d399;text-decoration:none;font-weight:700">Ver produto →</a>
</body>
</html>`);
  } catch (e) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<script>location.replace('${SITE}')</script>`);
  }
}
