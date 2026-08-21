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
import { cotarFreteDoLeilao } from '../_lib/freteLeilao.js';
import { emitirSelo } from '../_lib/freteSelo.js';

// ══════════════════════════════════════════════════════════════════════════════
// 🔴 BLOQUEADOR 3 (auditoria OpenAI, 21/08/2026) — ASSINAR O QUE O CLIENTE MANDOU
// ══════════════════════════════════════════════════════════════════════════════
// COMO ESTAVA: mesmo com auction_id e user_id no corpo, a cotação era feita com
// `body.items` e `body.cep` — os dois vindos do NAVEGADOR — e SÓ DEPOIS o
// resultado era assinado. Ou seja, o selo carimbava o pedido do cliente.
//
// O ataque, sem nenhuma ferramenta especial:
//   1. chama cotarFrete com o auction_id verdadeiro (é público, está na URL da sala)
//      e o user_id verdadeiro (é o dele mesmo);
//   2. troca `items` por um produto leve qualquer, ou `cep` por um CEP vizinho
//      do galpão;
//   3. recebe um selo LEGÍTIMO, assinado pela chave do servidor, dizendo
//      "frete R$ 3,20";
//   4. dá o lance com esse selo. O submitAtomicBid confere a assinatura, ela
//      bate, e o servidor reserva R$ 3,20 de um frete que vai custar R$ 40.
//
// A assinatura estava certa. O que estava errado era o que ela assinava. Um selo
// só vale se o servidor escolheu TODOS os campos que ele carimba.
//
// COMO FICOU: se vier `auction_id`, o corpo perde a autoridade inteira. O
// produto sai de `auctions.product_id` lido no banco e o CEP sai do cadastro do
// próprio usuário. `body.items` e `body.cep` são IGNORADOS neste caminho — nem
// como sugestão. O caminho da loja (sem auction_id) continua como era, e
// continua SEM selo: lá o frete é reconferido no checkout, não vira reserva.
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

    const auctionId = String(body?.auction_id || '').trim();
    const userId = String(body?.user_id || '').trim();

    // ── CAMINHO DO LEILÃO: servidor manda em tudo ─────────────────────────
    if (auctionId) {
      if (!userId) {
        return res.status(400).json({ success: false, configured: true, error: 'Informe quem está cotando.' });
      }
      // 🔐 Crachá de sessão — ETAPA 1 (só anota no log enquanto SESSAO_MODO não
      // for 'bloquear'). Esta rota não move dinheiro, mas emite selo que MOVE:
      // sem isto qualquer um pede selo no nome de qualquer pessoa.
      const { exigirSessao } = await import('../_lib/sessao.js');
      const _ses = exigirSessao(req, userId, 'cotarFrete');
      if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });

      // ⚠️ body.items e body.cep NÃO são lidos aqui. De propósito.
      const cot = await cotarFreteDoLeilao({ auctionId, userId });
      if (!cot.ok) {
        return res.status(200).json({ success: false, configured: true, motivo: cot.motivo, error: {
          sem_cep: 'Cadastre seu CEP no perfil para calcularmos o frete.',
          produto_nao_vinculado: 'Este leilão está sem produto vinculado. Avise o suporte.',
          cotacao_indisponivel: 'Não conseguimos calcular o frete para o seu CEP agora.',
          leilao_nao_encontrado: 'Leilão não encontrado.',
          config_ausente: 'Frete não configurado no servidor.',
        }[cot.motivo] || 'Não foi possível calcular o frete.' });
      }

      const opcoes = cot.opcoes.map((o) => ({
        ...o,
        selo: emitirSelo({
          auctionId, userId, freteId: o.id, valor: o.preco,
          cep: cot.cep, productId: cot.productId,
          empresa: o.empresa, servico: o.nome, prazo: o.prazo,
        }),
      }));
      return res.status(200).json({ success: true, configured: true, opcoes, cep: cot.cep });
    }

    // ── CAMINHO DA LOJA: como sempre foi, e sem selo ──────────────────────
    const r = await cotarOpcoes({ cep: body.cep, items: body.items });
    if (!r.ok) {
      return res.status(200).json({ success: false, configured: true, error: r.error });
    }
    return res.status(200).json({ success: true, configured: true, opcoes: r.opcoes });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
