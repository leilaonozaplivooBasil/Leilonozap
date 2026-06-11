// og — imagem dinâmica do convite (1200x630) por cargo, pro preview do WhatsApp.
// Render via @vercel/og (satori). Sem JSX (createElement) pra buildar como função .js.
import { ImageResponse } from '@vercel/og';
import React from 'react';

export const config = { runtime: 'edge' };

const h = React.createElement;
const LABEL = { usuario: 'Usuário', influenciador: 'Influenciador', vendedor: 'Vendedor', licenciado: 'Licenciado', parceiro: 'Parceiro', ponto_retirada: 'Ponto de Retirada', loja_fisica: 'Loja Física', distribuidor: 'Distribuidor' };
const money = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 });

export default async function handler(req) {
  const url = new URL(req.url);
  const cargo = (url.searchParams.get('cargo') || 'licenciado').trim();
  const cargoNome = LABEL[cargo] || 'Parceiro';

  // preço/comissão (edge suporta fetch)
  let adesao = 0, pct = 0;
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/career_levels?select=adesao_valor,venda_direta_pct&id=eq.${encodeURIComponent(cargo)}&limit=1`, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } });
    const rows = await r.json();
    if (Array.isArray(rows) && rows[0]) { adesao = Number(rows[0].adesao_valor) || 0; pct = Number(rows[0].venda_direta_pct) || 0; }
  } catch (_) { /* defaults */ }

  const priceLine = adesao > 0 ? `${money(adesao)} • 100% volta em produto` : 'Cadastro grátis';

  return new ImageResponse(
    h('div', {
      style: {
        width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', position: 'relative',
        background: 'linear-gradient(135deg, #052e1e 0%, #0a3d29 45%, #064e3b 100%)',
        color: 'white', fontFamily: 'sans-serif',
      },
    }, [
      // brilho decorativo
      h('div', { key: 'glow', style: { position: 'absolute', top: '-150px', right: '-120px', width: '500px', height: '500px', borderRadius: '500px', background: 'rgba(16,185,129,0.25)', display: 'flex' } }),
      // martelo / marca topo
      h('div', { key: 'brand', style: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' } }, [
        h('div', { key: 'g', style: { fontSize: '56px', display: 'flex' } }, '🔨'),
        h('div', { key: 't', style: { display: 'flex', fontSize: '40px', fontWeight: 900, letterSpacing: '1px' } }, [
          h('span', { key: 'a', style: { color: '#7dd3fc', display: 'flex' } }, 'LEILÃO'),
          h('span', { key: 'b', style: { color: '#34d399', display: 'flex', marginLeft: '12px' } }, 'NOZAP'),
        ]),
      ]),
      // "SEJA UM"
      h('div', { key: 'seja', style: { display: 'flex', fontSize: '34px', fontWeight: 700, color: '#34d399', letterSpacing: '8px', marginBottom: '6px' } }, 'SEJA UM'),
      // cargo grande
      h('div', { key: 'cargo', style: { display: 'flex', fontSize: '110px', fontWeight: 900, lineHeight: 1, textAlign: 'center', marginBottom: '30px' } }, cargoNome.toUpperCase()),
      // pill preço
      h('div', {
        key: 'pill',
        style: { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.10)', border: '2px solid rgba(52,211,153,0.6)', borderRadius: '999px', padding: '16px 36px', fontSize: '34px', fontWeight: 800, color: '#d1fae5' },
      }, priceLine),
      // comissão
      h('div', { key: 'pct', style: { display: 'flex', fontSize: '28px', color: '#a7f3d0', marginTop: '24px' } }, `Comissão de ${pct}% nas suas vendas`),
      // rodapé CTA
      h('div', { key: 'cta', style: { display: 'flex', position: 'absolute', bottom: '40px', fontSize: '26px', color: 'rgba(255,255,255,0.7)' } }, 'Cadastre-se agora em leilaonozap.net'),
    ]),
    { width: 1200, height: 630 }
  );
}
