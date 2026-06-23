// calcularFrete — cotação de frete via Melhor Envio (quando o token estiver configurado).
// Sem token (MELHOR_ENVIO_TOKEN), devolve {configured:false} e o checkout cai no "combinar no WhatsApp".
// Pronto pra ir ao ar assim que setarem MELHOR_ENVIO_TOKEN (+ MELHOR_ENVIO_FROM_CEP) na Vercel.
const ME_TOKEN = process.env.MELHOR_ENVIO_TOKEN;
const FROM_CEP = (process.env.MELHOR_ENVIO_FROM_CEP || '21810000').replace(/\D/g, '');
const ME_BASE = process.env.MELHOR_ENVIO_BASE || 'https://www.melhorenvio.com.br';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const toCep = String(body?.cep || '').replace(/\D/g, '');
    const items = Array.isArray(body?.items) ? body.items : [];
    if (toCep.length !== 8) return res.status(200).json({ success: false, error: 'CEP inválido' });

    if (!ME_TOKEN) {
      // ainda não configurado — fallback honesto (sem preço inventado)
      return res.status(200).json({ success: true, configured: false, message: 'Frete combinado direto no WhatsApp da loja.' });
    }

    // dimensões/peso reais dos produtos (fallback padrão de caixa pequena)
    let peso = 0, valorSeguro = 0;
    const ids = items.map((i) => i.product_id).filter(Boolean);
    let pmap = {};
    if (ids.length && SUPABASE_URL && SR) {
      const prods = await (await sb(`products?select=id,peso,altura,largura,comprimento,price_catalog&id=in.(${ids.map((x) => `"${x}"`).join(',')})`)).json();
      pmap = Object.fromEntries((Array.isArray(prods) ? prods : []).map((p) => [p.id, p]));
    }
    const products = items.map((it) => {
      const p = pmap[it.product_id] || {};
      const q = Math.max(1, parseInt(it.quantity) || 1);
      peso += (Number(p.peso) || 0.3) * q;
      valorSeguro += (Number(p.price_catalog) || 0) * q;
      return { id: it.product_id, width: Math.max(11, Number(p.largura) || 11), height: Math.max(2, Number(p.altura) || 4), length: Math.max(16, Number(p.comprimento) || 16), weight: Math.max(0.1, Number(p.peso) || 0.3), insurance_value: Number(p.price_catalog) || 0, quantity: q };
    });

    const r = await fetch(`${ME_BASE}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ME_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'Leilao NoZap (contato@leilaonozap.net)' },
      body: JSON.stringify({ from: { postal_code: FROM_CEP }, to: { postal_code: toCep }, products }),
    });
    const cot = await r.json();
    if (!r.ok || !Array.isArray(cot)) return res.status(200).json({ success: false, error: 'Falha na cotação', details: JSON.stringify(cot).slice(0, 200) });

    const opcoes = cot.filter((o) => !o.error && o.price).map((o) => ({
      id: o.id, nome: `${o.company?.name || ''} ${o.name}`.trim(), preco: Number(o.price), prazo: o.delivery_time,
    })).sort((a, b) => a.preco - b.preco);

    return res.status(200).json({ success: true, configured: true, opcoes });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
