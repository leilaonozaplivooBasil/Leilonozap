// comparaiDemo — "prova ao vivo" do CompareAQUI (19/08/2026, pedido do dono).
//
// Por que existe: o dono quer um jeito de o CLIENTE testar o motor de
// comparação de verdade, dentro do site, sem sair pra lugar nenhum — pra
// comprovar que a busca funciona antes mesmo de ele estar olhando um produto
// específico. Diferente de comparaiPrices (que exige um productId/auctionId
// já cadastrado), este endpoint aceita QUALQUER texto digitado pelo visitante
// e roda o MESMO motor de busca (searchMarket) — não é uma simulação, é uma
// chamada real às mesmas fontes que os produtos de verdade usam.
//
// Segurança: somente leitura, não expõe nada sensível, mesma proteção de
// timeout já aplicada em marketSearch.js. Query curta demais é rejeitada
// pra não gastar cota das APIs de terceiro à toa.
import { searchMarket, cleanTitle } from '../_lib/marketSearch.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });

  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const query = String(body?.query || '').trim().slice(0, 120);
    if (query.length < 3) {
      return res.status(400).json({ success: false, error: 'Digite pelo menos 3 letras do produto.' });
    }
    if (cleanTitle(query).length < 4) {
      return res.status(400).json({ success: false, error: 'Descreva melhor o produto (nome mais específico).' });
    }

    const resultado = await searchMarket(query, null);
    return res.status(200).json({ success: true, ...resultado });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
