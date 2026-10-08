// 🧾 resolverPendencia — o botão da conciliação: "Devolver pelo Mercado Pago" ou
// "Marcar resolvida", sempre com motivo e com rastro (03/10/2026, DIR-198).
//
// Dono: "faz o que é o certo… precisamos ter segurança real nisso."
//
// Só admin/super_admin, com crachá. A ação é registrada em gateway_acoes ANTES
// de ser executada (api/_lib/gatewayAcoes.js), executada na hora, e o resultado
// fica na linha. Se a devolução no gateway falhar, a ação fica pendente e o cron
// da conciliação tenta de novo (até 3 vezes). Nada aqui muda status de venda nem
// credita carteira: devolver ao pagador é pelo gateway; resolver é só marcar.
//
// 🛡️ DIR-211 (08/10/2026) — terceiro botão, "Liberar agora", para o depósito que o
// antifraude segurou: grava a decisão 'liberado' (só se ninguém decidiu antes) e pede a
// ação 'liberar', que chama o próprio webhook por dentro — é ele que vira 'paid' e
// credita. "Devolver" num depósito em espera grava 'recusado' ANTES de pedir ao gateway.
import { exigirSessao } from '../_lib/sessao.js';
import { pedirAcao, executarAcao } from '../_lib/gatewayAcoes.js';
import { marcarDecisao } from '../_lib/antifraudeDeposito.js';

const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    const saleId = String(body?.sale_id || '').trim();
    const modo = String(body?.modo || '').trim(); // 'devolver' | 'resolver' | 'liberar' (DIR-211)
    const motivo = String(body?.motivo || '').trim();
    const _ses = exigirSessao(req, userId, 'resolverPendencia');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    if (!userId || !saleId) return res.status(400).json({ success: false, error: 'user_id e sale_id obrigatórios' });
    if (!['devolver', 'resolver', 'liberar'].includes(modo)) return res.status(400).json({ success: false, error: 'modo inválido' });
    if (motivo.length < 5) return res.status(400).json({ success: false, error: 'Escreva o motivo (mínimo 5 letras): ele fica no histórico.' });

    const ator = (await (await sb(`app_users?select=id,role,full_name&id=eq.${encodeURIComponent(userId)}&limit=1`)).json())[0];
    if (!ator || !['admin', 'super_admin'].includes(ator.role)) return res.status(403).json({ success: false, error: 'Acesso restrito a administradores' });

    const sale = (await (await sb(`catalog_sales?select=id,mp_payment_id,status,kind,buyer_name,total_amount,sale_price,gateway,conciliacao_resolvida_em,antifraude_motivo,antifraude_espera_ate,antifraude_decisao&id=eq.${encodeURIComponent(saleId)}&limit=1`)).json())[0];
    if (!sale) return res.status(200).json({ success: false, error: 'Venda não encontrada' });
    if (modo === 'devolver' && !sale.mp_payment_id) return res.status(200).json({ success: false, error: 'Esta venda não tem pagamento no gateway para devolver' });
    if (modo === 'devolver' && ['devolvido', 'chargeback'].includes(sale.gateway?.situacao)) return res.status(200).json({ success: false, error: 'O gateway já diz que este pagamento foi devolvido' });

    // 🛡️ DIR-211 — depósito em espera do antifraude: a decisão entra ANTES da ação, e só se
    // ninguém decidiu no meio-tempo (corrida Beatriz × cron × poll).
    const emEspera = !!sale.antifraude_espera_ate && !sale.antifraude_decisao;
    const quem = `${ator.full_name || ''} (${ator.id})`.trim();
    if (modo === 'liberar') {
      // recusado cuja devolução no gateway não aconteceu (refund recusado, ação falhou) pode voltar a liberado
      const recusadoSemDevolucao = !!sale.antifraude_espera_ate && sale.antifraude_decisao === 'recusado' && !['devolvido', 'devolvido_parcial', 'chargeback'].includes(sale.gateway?.situacao);
      if (!emEspera && !recusadoSemDevolucao) return res.status(200).json({ success: false, error: sale.antifraude_decisao ? `Este depósito já foi decidido (${sale.antifraude_decisao}).` : 'Este depósito não está em conferência.' });
      if (!sale.mp_payment_id) return res.status(200).json({ success: false, error: 'Depósito sem pagamento no gateway; não há o que liberar.' });
      if (recusadoSemDevolucao) {
        const feitas = await (await sb(`gateway_acoes?select=id&sale_id=eq.${encodeURIComponent(sale.id)}&acao=eq.devolver&status=eq.feita&limit=1`)).json().catch(() => []);
        if (Array.isArray(feitas) && feitas.length) return res.status(200).json({ success: false, error: 'A devolução pelo gateway já foi feita; não dá para liberar.' });
      }
      const gravou = await marcarDecisao(sb, sale.id, 'liberado', quem, recusadoSemDevolucao ? { de: 'recusado' } : {});
      if (!gravou) return res.status(200).json({ success: false, error: 'Este depósito acabou de ser decidido por outro caminho; atualize a tela.' });
    } else if (modo === 'devolver' && emEspera) {
      // devolver um depósito em espera = recusar: se alguém liberou no meio-tempo, NÃO devolve
      // (devolveríamos pelo gateway um dinheiro que já virou saldo na Carteira).
      const gravou = await marcarDecisao(sb, sale.id, 'recusado', quem);
      if (!gravou) return res.status(200).json({ success: false, error: 'Este depósito já foi liberado; trate pela conciliação normal.' });
    }

    // o valor devolvido é o que o gateway COBROU (produto + frete / taxa), nunca o nosso campo
    const valor = modo === 'devolver' ? Number(sale.gateway?.valor ?? sale.total_amount ?? sale.sale_price ?? 0) : Number(sale.gateway?.valor ?? sale.total_amount ?? 0);
    const acao = await pedirAcao({ sale_id: sale.id, payment_id: sale.mp_payment_id, acao: modo, valor, motivo, pedida_por: `${ator.full_name || ''} (${ator.id})`.trim() });
    const r = await executarAcao(acao);
    return res.status(200).json({ success: r.ok, acao_id: acao.id, modo, valor, resultado: { ...r.resultado, bruto: undefined }, error: r.ok ? undefined : (r.resultado?.erro || 'A ação ficou pendente; o cron tenta de novo em até 30 min.') });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e).slice(0, 200) });
  }
}
