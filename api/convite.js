// convite — landing server-side dos links de cadastro (/c/:cargo?ref=...).
// Faz 2 coisas: (1) emite as meta tags OG por cargo (preview bonito no WhatsApp),
// (2) redireciona o navegador real pro funil SPA /Cadastro?cargo=...&ref=...
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = 'https://leilaonozap.net';

const LABEL = { usuario: 'Usuário', influenciador: 'Influenciador', vendedor: 'Vendedor', licenciado: 'Licenciado', parceiro: 'Parceiro', ponto_retirada: 'Ponto de Retirada', loja_fisica: 'Loja Física', distribuidor: 'Distribuidor' };
const money = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 });
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default async function handler(req, res) {
  try {
    const cargo = String((req.query?.cargo || 'licenciado')).trim();
    const ref = String((req.query?.ref || '')).trim();
    const cargoNome = LABEL[cargo] || 'Parceiro';

    // busca dados do cargo (preço/comissão) pra montar a descrição
    let adesao = 0, pct = 0;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/career_levels?select=adesao_valor,venda_direta_pct&id=eq.${encodeURIComponent(cargo)}&limit=1`, {
        headers: { apikey: SR, Authorization: `Bearer ${SR}` },
      });
      const rows = await r.json();
      if (Array.isArray(rows) && rows[0]) { adesao = Number(rows[0].adesao_valor) || 0; pct = Number(rows[0].venda_direta_pct) || 0; }
    } catch (_) { /* segue com defaults */ }

    const title = `Seja um ${cargoNome} — Leilão NoZap`;
    const desc = adesao > 0
      ? `Adesão de ${money(adesao)} (100% volta em produto). Comissão de ${pct}% nas suas vendas. Cadastre-se agora e comece a ganhar.`
      : `Cadastro grátis! Comissão de ${pct}% nas suas vendas. Faça parte da rede da Leilão NoZap.`;

    const ogImage = `${SITE}/api/og?cargo=${encodeURIComponent(cargo)}`;
    const destino = `${SITE}/Cadastro?cargo=${encodeURIComponent(cargo)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600');
    res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Leilão NoZap" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
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
<a href="${esc(destino)}" style="color:#34d399;text-decoration:none;font-weight:700">Abrir convite — Seja um ${esc(cargoNome)} →</a>
</body>
</html>`);
  } catch (e) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<script>location.replace('https://leilaonozap.net/')</script>`);
  }
}
