// cotarFrete (Vercel) — cotação REAL de frete via Melhor Envio.
// Espelho de base44/functions/cotarFrete: o front chama /api/functions/cotarFrete.
// Devolve as opções ORDENADAS da mais barata pra mais cara (melhor preço pro cliente primeiro).
// 🟢 Somente leitura: não toca em saldo, pedido nem comissão.
//
// 🩹 CAUSA-RAIZ CORRIGIDA: antes este endpoint calculava com as medidas que o NAVEGADOR
// mandava (que nunca incluíam peso/dimensões reais) e sempre caía na caixa padrão mínima
// dos Correios. Agora delega para cotarOpcoes (api/_lib/frete.js), que busca peso/altura/
// largura/comprimento REAIS de cada produto na tabela products — mesma fonte usada na
// recotação de segurança do checkout.
//
// Variáveis necessárias na Vercel: MELHOR_ENVIO_TOKEN e MELHOR_ENVIO_FROM_CEP.
import { cotarOpcoes } from '../_lib/frete.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const r = await cotarOpcoes({ cep: body.cep, items: body.items });
    if (!r.ok) {
      return res.status(200).json({ success: false, configured: true, error: r.error });
    }
    return res.status(200).json({ success: true, configured: true, opcoes: r.opcoes });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}