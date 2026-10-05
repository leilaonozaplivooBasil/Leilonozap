// leilao — landing server-side dos links de LEILÃO (/l/:id).
// MESMO PROCESSO do api/produto.js (Loja Virtual), que já funciona:
// (1) emite meta tags OG com a FOTO REAL do leilão (preview no WhatsApp),
// (2) redireciona o navegador real pra sala /AuctionRoom?id=...
//
// ⚠️ NÃO QUEBRAR O QUE FUNCIONA: esta rota é APENAS leitura + HTML. Não dá lance,
// não mexe em saldo, carteira, comissão nem status do leilão. Se a consulta falhar,
// usa a logo como imagem e AINDA redireciona — o usuário nunca fica preso.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
import { ehPreLancamento, textoDeAbertura } from '../src/lib/preLancamento.js';

const SITE = 'https://leilaonozap.net';

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function handler(req, res) {
  try {
    const id = String(req.query?.id || '').trim();
    const ref = String(req.query?.ref || '').trim();
    if (!id) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.status(200).send(`<script>location.replace('${SITE}')</script>`); }

    let a = null;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/auctions?select=id,title,current_price,starting_price,image_urls,status,product_id,end_time&id=eq.${encodeURIComponent(id)}&limit=1`, {
        headers: { apikey: SR, Authorization: `Bearer ${SR}` },
      });
      const rows = await r.json();
      a = Array.isArray(rows) ? rows[0] : null;
    } catch (_) { /* segue sem leilão */ }

    // 🎬 17/09/2026 — O VÍDEO NO PREVIEW DO LINK.
    //
    // O vídeo mora no PRODUTO ligado (`products.video_urls`), igual à sala e ao
    // card do destaque leem. Aqui só interessa ARQUIVO NOSSO: `og:video` de um
    // embed de terceiro não toca em lugar nenhum e ainda entrega o link deles.
    //
    // 🔴 O WHATSAPP NÃO TOCA ISTO. Ele ignora `og:video` e segue mostrando a
    // imagem — não há tag que mude isso. Quem aproveita é Facebook e X, que
    // tocam embutido. A tag entra porque é barata e correta, não porque
    // resolve o WhatsApp; lá quem resolve é o anexo do botão compartilhar.
    //
    // Sem `twitter:card=player` de propósito: o X exige que `twitter:player`
    // seja uma URL de IFRAME, não um mp4 cru, e ainda pede liberação manual
    // do domínio. Um card de player mal formado vale menos que o
    // `summary_large_image` que já está acima — e duplicar `twitter:card`
    // só faz o rastreador escolher um dos dois no escuro.
    //
    // Best-effort: falha aqui não pode atrapalhar o preview nem o redirecionamento.
    let videoUrl = '';
    if (a?.product_id) {
      try {
        const rv = await fetch(`${SUPABASE_URL}/rest/v1/products?select=video_urls&id=eq.${encodeURIComponent(a.product_id)}&limit=1`, {
          headers: { apikey: SR, Authorization: `Bearer ${SR}` },
        });
        const p = (await rv.json())?.[0];
        const bruto = Array.isArray(p?.video_urls) ? String(p.video_urls[0] || '').trim() : '';
        // a MESMA régua da loja e da sala, reduzida ao que serve aqui: precisa
        // ser https, do nosso host e do balde de vídeo de produto
        if (/^https:\/\//i.test(bruto)) {
          const u = new URL(bruto);
          if (u.hostname.endsWith('supabase.co') && u.pathname.includes('/videos-produtos/')) videoUrl = bruto;
        }
      } catch (_) { /* sem vídeo, o preview segue com a imagem */ }
    }

    const destino = `${SITE}/AuctionRoom?id=${encodeURIComponent(id)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`;
    const title = a?.title ? `${a.title} — Leilão NoZap` : 'Leilão — Leilão NoZap';
    const price = Number(a?.current_price) > 0 ? Number(a.current_price) : Number(a?.starting_price) || 0;
    const encerrado = a?.status && a.status !== 'active';
    // 🚀 pré-lançamento (src/lib/preLancamento.js): agendado sem lance inicial
    const preLancamento = ehPreLancamento(a);
    const desc = preLancamento
      ? `Pré-lançamento: ${textoDeAbertura(a).toLowerCase()}. Entre na sala e acompanhe no Leilão NoZap!`
      : price > 0
      ? (encerrado
        ? `Arrematado por ${money(price)}. Veja outros leilões no Leilão NoZap!`
        : `Lance atual ${money(price)}. Dê seu lance agora no Leilão NoZap!`)
      : 'Entre na sala e dê seu lance no Leilão NoZap!';
    // CARD COMPOSTO: foto real do produto + leiloeiro NoZap + lance atual (api/og-leilao).
    // Se o leilão não foi encontrado, cai na logo (o preview nunca fica vazio).
    const ogImage = a
      ? `${SITE}/api/og-leilao?id=${encodeURIComponent(id)}`
      : `${SITE}/brand/logo-horizontal-og.jpg`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
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
${videoUrl ? `<meta property="og:video" content="${esc(videoUrl)}" />
<meta property="og:video:secure_url" content="${esc(videoUrl)}" />
<meta property="og:video:type" content="video/mp4" />` : ''}
<meta http-equiv="refresh" content="0; url=${esc(destino)}" />
<script>window.location.replace(${JSON.stringify(destino)});</script>
<style>body{background:#0a0f0d;color:#e5e7eb;font-family:system-ui,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}</style>
</head>
<body>
<a href="${esc(destino)}" style="color:#34d399;text-decoration:none;font-weight:700">Ver leilão →</a>
</body>
</html>`);
  } catch (e) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<script>location.replace('${SITE}')</script>`);
  }
}