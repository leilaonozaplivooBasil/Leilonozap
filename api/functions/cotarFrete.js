// cotarFrete (Vercel) — cotação REAL de frete via Melhor Envio.
// Espelho de base44/functions/cotarFrete: o front chama /api/functions/cotarFrete.
// Devolve as opções ORDENADAS da mais barata pra mais cara (melhor preço pro cliente primeiro).
// 🟢 Somente leitura: não toca em saldo, pedido nem comissão.
//
// Variáveis necessárias na Vercel: MELHOR_ENVIO_TOKEN e MELHOR_ENVIO_FROM_CEP.

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const TOKEN = process.env.MELHOR_ENVIO_TOKEN;
    const FROM_CEP = String(process.env.MELHOR_ENVIO_FROM_CEP || '').replace(/\D/g, '');

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const toCep = String(body.cep || '').replace(/\D/g, '');
    if (toCep.length !== 8) {
      return res.status(200).json({ success: false, error: 'CEP inválido. Informe os 8 números.' });
    }
    if (!TOKEN) {
      return res.status(200).json({ success: false, configured: false, error: 'Frete ainda não configurado.' });
    }
    if (FROM_CEP.length !== 8) {
      return res.status(200).json({ success: false, configured: false, error: 'CEP de origem inválido nas configurações.' });
    }

    // Volumes. Sem medidas do produto, usa caixa pequena padrão (mínimos dos Correios: 16x11x2).
    const itens = Array.isArray(body.items) && body.items.length ? body.items : [{}];
    const products = itens.map((it, idx) => ({
      id: String(it?.id || idx + 1),
      width: Math.max(11, Number(it?.largura) || 11),
      height: Math.max(2, Number(it?.altura) || 4),
      length: Math.max(16, Number(it?.comprimento) || 16),
      weight: Math.max(0.1, Number(it?.peso) || 0.3),
      insurance_value: Math.max(0, Number(it?.valor) || 0),
      quantity: Math.max(1, parseInt(it?.quantidade) || 1),
    }));

    const resp = await fetch('https://www.melhorenvio.com.br/api/v2/me/shipment/calculate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Leilao NoZap (contato@leilaonozap.net)',
      },
      body: JSON.stringify({ from: { postal_code: FROM_CEP }, to: { postal_code: toCep }, products }),
    });

    const raw = await resp.text();
    let cot = null;
    try { cot = JSON.parse(raw); } catch { cot = null; }

    if (!resp.ok || !Array.isArray(cot)) {
      // CEP inexistente devolve 422 com erro em postal_code. Sem isso o cliente via
      // "não conseguimos calcular agora" e ficava sem saber que o CEP dele é que está errado.
      const cepInvalido = /postal_code|cep_destino/i.test(String(raw));
      return res.status(200).json({
        success: false,
        configured: true,
        error: cepInvalido
          ? 'CEP não encontrado. Confira os números do seu CEP.'
          : 'Não conseguimos calcular o frete agora.',
        details: String(raw).slice(0, 300),
      });
    }

    const opcoes = cot
      .filter((o) => !o.error && o.price)
      .map((o) => ({
        id: String(o.id),
        nome: o.name || '',
        empresa: o.company?.name || '',
        logo: o.company?.picture || '',
        preco: Number(o.price),
        prazo: Number(o.delivery_time) || null,
      }))
      .sort((a, b) => a.preco - b.preco);

    if (!opcoes.length) {
      return res.status(200).json({
        success: false,
        configured: true,
        error: 'Nenhuma transportadora atende esse CEP com as medidas informadas.',
      });
    }

    return res.status(200).json({ success: true, configured: true, origem: FROM_CEP, opcoes });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}