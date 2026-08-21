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
    // 🔏 SELO — cada opção sai assinada pelo servidor. É o selo que o lance vai
    // devolver, e é dele que sai o valor financeiramente reservado. Sem isso, o
    // valor do frete era o que o navegador dissesse (ver api/_lib/freteSelo.js).
    const auctionId = String(body?.auction_id || '').trim();
    const userId = String(body?.user_id || '').trim();
    let opcoes = r.opcoes;
    if (auctionId && userId) {
      const { emitirSelo } = await import('../_lib/freteSelo.js');
      const cepLimpo = String(body?.cep || '').replace(/\D/g, '');
      opcoes = r.opcoes.map((o) => ({
        ...o,
        selo: emitirSelo({
          auctionId, userId, freteId: o.id, valor: o.preco, cep: cepLimpo,
          empresa: o.empresa, servico: o.nome, prazo: o.prazo,
        }),
      }));
    }
    return res.status(200).json({ success: true, configured: true, opcoes });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}