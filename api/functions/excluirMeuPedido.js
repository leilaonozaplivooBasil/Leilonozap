// excluirMeuPedido — o COMPRADOR exclui um pedido PRÓPRIO da Loja Virtual.
//
// Por que existe: a tabela catalog_sales é protegida por RLS (o navegador não pode
// escrever nela) e a rota genérica entityWrite não aceita essa tabela. Sem esta rota
// o botão "Excluir Pedido" falhava para TODOS os usuários.
//
// Travas de segurança (nesta ordem):
//   1. Só apaga pedido cujo buyer_id é o próprio usuário (admin também pode)
//   2. Só apaga pedido AGUARDANDO PAGAMENTO ou CANCELADO — pedido pago nunca é apagado
//   3. Pedido que JÁ gerou cobrança (mp_payment_id) nunca é apagado — só cancelado,
//      senão um pagamento atrasado chega e não encontra a venda (dinheiro órfão)
//   4. Nada mais é liberado: só DELETE/cancelamento, só nesta tabela
import { exigirSessao } from '../_lib/sessao.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Status em que o pedido pode ser removido pelo próprio comprador
const EXCLUIVEIS = ['pending_payment', 'canceled', 'cancelado'];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, userId, 'excluirMeuPedido');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    const saleId = String(body?.sale_id || '').trim();
    if (!userId || !saleId) return res.status(400).json({ success: false, error: 'Pedido e usuário obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const sale = (await (await sb(`catalog_sales?select=id,buyer_id,status,mp_payment_id&id=eq.${encodeURIComponent(saleId)}&limit=1`)).json())[0];
    if (!sale) return res.status(200).json({ success: false, error: 'Pedido não encontrado' });

    // 1) dono do pedido (ou admin)
    if (sale.buyer_id !== userId) {
      const actor = (await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(userId)}&limit=1`)).json())[0];
      if (!actor || !['admin', 'super_admin'].includes(actor.role)) {
        return res.status(200).json({ success: false, error: 'Você só pode excluir os seus próprios pedidos' });
      }
    }

    // 2) nunca apagar pedido pago / em andamento
    if (!EXCLUIVEIS.includes(sale.status)) {
      return res.status(200).json({ success: false, error: 'Só é possível excluir pedidos aguardando pagamento ou cancelados' });
    }

    // 3) 🔴 TRAVA FINANCEIRA (03/08/2026): se JÁ existe cobrança gerada (PIX/cartão),
    // apagar a linha faz o pagamento atrasado chegar e não encontrar a venda — o
    // webhook responde "sale_notfound" e o dinheiro entra sem pedido nenhum
    // (foi exatamente o que aconteceu com 2 PIX reais). Nesse caso NÃO apagamos:
    // cancelamos, mantendo a linha viva para o webhook conseguir reconciliar.
    if (sale.mp_payment_id) {
      const c = await sb(`catalog_sales?id=eq.${encodeURIComponent(saleId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'canceled' }),
      });
      if (!c.ok) {
        const t = await c.text();
        return res.status(200).json({ success: false, error: 'Falha ao cancelar', detail: t.slice(0, 200) });
      }
      return res.status(200).json({ success: true, cancelado: true });
    }

    const r = await sb(`catalog_sales?id=eq.${encodeURIComponent(saleId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    if (!r.ok) {
      const t = await r.text();
      return res.status(200).json({ success: false, error: 'Falha ao excluir', detail: t.slice(0, 200) });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}