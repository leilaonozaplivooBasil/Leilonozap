// og-leilao — imagem dinâmica (1200x630) do preview de compartilhamento de um LEILÃO.
// Monta um card único: foto REAL do produto + o leiloeiro NoZap + o lance atual.
// ⚠️ Somente LEITURA. Não dá lance, não toca saldo/carteira/comissão/status.
import { ImageResponse } from '@vercel/og';
import React from 'react';

export const config = { runtime: 'edge' };

const h = React.createElement;
const SITE = 'https://leilaonozap.net';
const LEILOEIRO = `${SITE}/midia/b85495f57_image.png`;
const money = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function handler(req) {
  const url = new URL(req.url);
  const id = (url.searchParams.get('id') || '').trim();

  let a = null;
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/auctions?select=title,current_price,starting_price,image_urls,status&id=eq.${encodeURIComponent(id)}&limit=1`, {
      headers: { apikey: SR, Authorization: `Bearer ${SR}` },
    });
    const rows = await r.json();
    a = Array.isArray(rows) ? rows[0] : null;
  } catch (_) { /* segue sem dados */ }

  const titulo = (a?.title || 'Leilão NoZap').slice(0, 70);
  const preco = Number(a?.current_price) > 0 ? Number(a.current_price) : Number(a?.starting_price) || 0;
  const encerrado = a?.status && a.status !== 'active';
  // 🖼️ A foto do produto costuma vir de domínios que recusam requisição sem
  // navegador (gstatic etc). Por isso baixamos aqui com User-Agent e embutimos
  // como data URI — assim o card SEMPRE mostra a foto real. Formato não suportado
  // no render (webp) cai na logo, sem quebrar o card.
  const bruta = (Array.isArray(a?.image_urls) && a.image_urls[0]) ? a.image_urls[0] : null;
  let foto = `${SITE}/brand/logo-horizontal-og.jpg`;
  if (bruta) {
    try {
      const ir = await fetch(bruta, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } });
      const ct = (ir.headers.get('content-type') || '').toLowerCase();
      if (ir.ok && (ct.includes('jpeg') || ct.includes('jpg') || ct.includes('png'))) {
        const buf = new Uint8Array(await ir.arrayBuffer());
        let bin = '';
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        foto = `data:${ct.includes('png') ? 'image/png' : 'image/jpeg'};base64,${btoa(bin)}`;
      }
    } catch (_) { /* mantém a logo */ }
  }

  return new ImageResponse(
    h('div', {
      style: {
        width: '1200px', height: '630px', display: 'flex', position: 'relative',
        background: 'linear-gradient(135deg, #06231a 0%, #0A1611 55%, #052e1e 100%)',
        fontFamily: 'sans-serif', color: 'white',
      },
    }, [
      h('div', { key: 'glow', style: { position: 'absolute', top: '-160px', left: '-120px', width: '520px', height: '520px', borderRadius: '520px', background: 'rgba(16,185,129,0.22)', display: 'flex' } }),

      // COLUNA ESQUERDA — foto do produto
      h('div', { key: 'foto', style: { display: 'flex', width: '470px', height: '630px', alignItems: 'center', justifyContent: 'center', padding: '40px' } }, [
        h('div', { key: 'placa', style: { display: 'flex', width: '400px', height: '400px', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '28px', border: '4px solid rgba(52,211,153,0.55)', padding: '14px' } }, [
          h('img', { key: 'i', src: foto, width: 360, height: 360, style: { width: '360px', height: '360px', objectFit: 'contain' } }),
        ]),
      ]),

      // COLUNA DIREITA — texto + leiloeiro embaixo
      h('div', { key: 'txt', style: { display: 'flex', flexDirection: 'column', flex: 1, padding: '46px 50px 0 0', position: 'relative' } }, [
        h('div', { key: 'marca', style: { display: 'flex', fontSize: '30px', fontWeight: 900, letterSpacing: '2px', marginBottom: '18px' } }, [
          h('span', { key: 'a', style: { color: '#e5e7eb', display: 'flex' } }, 'LEILÃO'),
          h('span', { key: 'b', style: { color: '#34d399', display: 'flex', marginLeft: '10px' } }, 'NOZAP'),
        ]),
        h('div', { key: 'tit', style: { display: 'flex', fontSize: '40px', fontWeight: 800, lineHeight: 1.15, marginBottom: '26px' } }, titulo),
        h('div', { key: 'lbl', style: { display: 'flex', fontSize: '24px', letterSpacing: '4px', color: '#a7f3d0' } }, encerrado ? 'ARREMATADO POR' : 'LANCE ATUAL'),
        h('div', { key: 'val', style: { display: 'flex', fontSize: '100px', fontWeight: 900, color: '#34d399', lineHeight: 1.1 } }, money(preco)),
        h('div', { key: 'cta', style: { display: 'flex', marginTop: '22px', background: 'rgba(52,211,153,0.14)', border: '2px solid rgba(52,211,153,0.55)', borderRadius: '999px', padding: '14px 30px', fontSize: '28px', fontWeight: 800, color: '#d1fae5' } }, encerrado ? 'Veja outros leilões' : 'Dê seu lance agora'),
        // 🔨 leiloeiro ancorado no canto inferior direito
        h('img', { key: 'leil', src: LEILOEIRO, width: 300, height: 300, style: { position: 'absolute', right: '10px', bottom: '0px', width: '300px', height: '300px', objectFit: 'contain' } }),
      ]),
    ]),
    { width: 1200, height: 630 }
  );
}