// excluirMeuPedido — o COMPRADOR exclui um pedido PRÓPRIO da Loja Virtual.
//
// Por que existe: a tabela catalog_sales é protegida por RLS (o navegador não pode
// escrever nela) e a rota genérica entityWrite não aceita essa tabela. Sem esta rota
// o botão "Excluir Pedido" falhava para TODOS os usuários.
//
// Travas de segurança (nesta ordem):
//   1. Só apaga pedido cujo buyer_id é o próprio usuário (admin também pode)
//   2. Só apaga pedido AGUARDANDO PAGAMENTO ou CANCELADO — pedido pago nunca é apagado
//   3. Nada mais é liberado: só a ação DELETE, só nesta tabela
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
    const saleId = String(body?.sale_id || '').trim();
    if (!userId || !saleId) return res.status(400).json({ success: false, error: 'Pedido e usuário obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const sale = (await (await sb(`catalog_sales?select=id,buyer_id,status&id=eq.${encodeURIComponent(saleId)}&limit=1`)).json())[0];
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