// approveWithdrawal — admin aprova (paga) ou rejeita (devolve saldo) um pedido de saque.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round(n * 100) / 100;
function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
async function isAdmin(actorId) {
  if (!actorId) return false;
  const a = (await (await sb(`app_users?select=role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json())[0];
  return a && ['admin', 'super_admin'].includes(a.role);
}
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { actor_id, withdrawal_id, decision, reason, mp_transfer_id } = body || {};
    if (!withdrawal_id || !['approve', 'reject'].includes(decision)) return res.status(400).json({ success: false, error: 'Parâmetros inválidos' });
    if (!await isAdmin(actor_id)) return res.status(403).json({ success: false, error: 'Apenas admin pode aprovar saque' });

    const w = (await (await sb(`withdrawal_requests?select=*&id=eq.${withdrawal_id}&limit=1`)).json())[0];
    if (!w) return res.status(200).json({ success: false, error: 'Pedido não encontrado' });
    if (w.status !== 'pending') return res.status(200).json({ success: false, error: 'Pedido já processado' });
    const valor = round2(Number(w.valor) || 0);

    // ══════════════════════════════════════════════════════════════════════════
    // 🔴 PONTO 101 (21/08/2026) — APROVAR/REJEITAR DUAS VEZES CRIAVA DINHEIRO
    // ══════════════════════════════════════════════════════════════════════════
    // Antes o `if (w.status !== 'pending')` acima era a única proteção, e ele é
    // uma LEITURA — não trava nada. Dois admins clicando junto (ou um clique
    // duplo, ou um retry da rede) passavam os dois pela conferência.
    //
    // No REJEITAR isso era criação de dinheiro pura: os dois somavam o valor de
    // volta em commission_balance. Um pedido de R$ 100 rejeitado duas vezes
    // devolvia R$ 200. E como a leitura de `alocado` era a mesma nos dois, o
    // débito do saldo_alocado não compensava.
    //
    // A trava agora é o FLIP ATÔMICO do status: o PATCH só casa enquanto o
    // pedido ainda estiver 'pending'. Quem chegar em segundo recebe zero linhas
    // e para aqui, antes de encostar em saldo. É o mesmo padrão que o
    // settleAuctionWithBalance.js:76 já usava para o arremate.
    const novoStatus = decision === 'approve' ? 'paid' : 'rejected';
    const flip = await sb(`withdrawal_requests?id=eq.${encodeURIComponent(withdrawal_id)}&status=eq.pending`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(decision === 'approve'
        ? { status: 'paid', reviewed_at: new Date().toISOString(), mp_transfer_id: mp_transfer_id || null }
        : { status: 'rejected', reviewed_at: new Date().toISOString(), reject_reason: reason || 'Reprovado' }),
    });
    const flipado = await flip.json().catch(() => []);
    if (!Array.isArray(flipado) || flipado.length === 0) {
      // outro admin (ou outro clique) processou primeiro — nada de saldo foi tocado
      return res.status(200).json({ success: false, error: 'Pedido já processado', raced: true });
    }

    // A partir daqui SÓ UM caminho de execução existe para este pedido.
    // 💸 saldo_alocado: o valor sai do reservado nos dois casos (aprovado = foi
    // pago no PIX; rejeitado = volta pro sacável logo abaixo).
    // Decremento com CAS pra não apagar movimento paralelo de outro pedido do
    // mesmo usuário: relê e só grava se o alocado continuar como foi lido.
    for (let tentativa = 0; tentativa < 3; tentativa += 1) {
      const atual = (await (await sb(`app_users?select=saldo_alocado&id=eq.${encodeURIComponent(w.user_id)}&limit=1`)).json())[0];
      const alocado = round2(Number(atual?.saldo_alocado) || 0);
      const filtro = alocado === 0 ? 'or(saldo_alocado.eq.0,saldo_alocado.is.null)' : `saldo_alocado.eq.${alocado}`;
      const r = await sb(`app_users?id=eq.${encodeURIComponent(w.user_id)}&${filtro}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ saldo_alocado: round2(Math.max(0, alocado - valor)) }),
      });
      const linhas = await r.json().catch(() => []);
      if (Array.isArray(linhas) && linhas.length > 0) break;
    }

    if (decision === 'reject') {
      // 💰 devolve o valor pro saldo sacável com INCREMENTO ATÔMICO no banco
      // (rpc/credit_commission — o mesmo que a comissão de loja usa). Ler e
      // somar em JS aqui é o que permitia a devolução dobrada.
      const credito = await sb('rpc/credit_commission', { method: 'POST', body: JSON.stringify({ _user: w.user_id, _amount: valor }) });
      if (!credito.ok) {
        // 🔴 O status já virou 'rejected' e o dinheiro NÃO voltou. Não dá pra
        // desfazer o flip com segurança (outro processo pode já ter lido), então
        // grita no log com tudo que um humano precisa pra devolver na mão.
        console.error(`[SAQUE] REJEIÇÃO SEM DEVOLUÇÃO — devolver manualmente: pedido ${withdrawal_id}, usuário ${w.user_id}, R$ ${valor}`);
        return res.status(200).json({ success: true, status: 'rejected', credito_pendente: valor, error: 'Pedido rejeitado, mas a devolução do saldo falhou — avise o suporte.' });
      }
    }

    return res.status(200).json({ success: true, status: novoStatus });
  } catch (e) { return res.status(200).json({ success: false, error: String(e?.message || e) }); }
}
