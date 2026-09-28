// adminListDeposits — lista TODOS os depósitos (carteira, passaporte, comissão)
// de TODOS os usuários, pra tela AdminDepositosConfirmados.jsx.
//
// Antes, essa tela consultava a entidade WalletTransaction (tabela
// wallet_transactions), que nunca é escrita por nenhum fluxo de depósito real —
// ficava sempre vazia. Os depósitos de verdade são gravados em catalog_sales
// (kind = wallet_deposit/passaporte/commission_deposit) por createMPWalletDeposit.js
// e confirmados por mpWebhook.js. Esta função lê da fonte certa.
//
// Autenticação: body.actorId precisa ser admin/super_admin.

import { exigirSessao } from '../_lib/sessao.js';
import { situacaoDaComissao } from '../../src/lib/comissaoDoDeposito.js';
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

const DEPOSIT_KINDS = ['wallet_deposit', 'passaporte', 'commission_deposit'];
const COLS = 'id,kind,status,payment_method,total_amount,sale_price,created_date,buyer_id,buyer_name,buyer_email';

// Lista de ids para o PostgREST, em lotes (1.000 ids numa URL passam do limite).
const LOTE = 150;
const lista = (ids) => ids.map((i) => `"${String(i).replace(/"/g, '')}"`).join(',');
async function emLotes(ids, montar) {
  const unicos = [...new Set(ids.filter(Boolean))];
  const saida = [];
  for (let i = 0; i < unicos.length; i += LOTE) {
    const r = await (await sb(montar(encodeURIComponent(lista(unicos.slice(i, i + LOTE)))))).json().catch(() => []);
    if (Array.isArray(r)) saida.push(...r);
  }
  return saida;
}

/** Quem indicou cada comprador, o lançamento de comissão de cada depósito e se já foi paga. */
async function comissoesDosDepositos(rows) {
  const vazio = { indicadorDe: new Map(), lancamentoDe: new Map(), pagos: new Set() };
  try {
    const compradores = await emLotes(rows.map((r) => r.buyer_id), (ids) => `app_users?select=id,referred_by_id&id=in.(${ids})`);
    const quemIndicou = new Map(compradores.map((u) => [u.id, u.referred_by_id]));
    const indicadores = await emLotes([...quemIndicou.values()], (ids) => `app_users?select=id,full_name,active,referral_code&id=in.(${ids})`);
    const porId = new Map(indicadores.map((u) => [u.id, {
      id: u.id, nome: String(u.full_name || '').trim(), ativo: u.active !== false, empresa: u.referral_code === 'leilaonozap',
    }]));
    const indicadorDe = new Map([...quemIndicou].map(([comprador, ind]) => [comprador, porId.get(ind) || null]));

    const pagosIds = rows.filter((r) => r.kind === 'wallet_deposit' && r.status === 'paid').map((r) => r.id);
    const lancamentos = await emLotes(pagosIds, (ids) => `commission_ledger?select=sale_id,beneficiary_id,beneficiary_name,amount,status,release_at&role_in_sale=eq.indicacao_deposito&sale_id=in.(${ids})`);
    const lancamentoDe = new Map(lancamentos.map((l) => [l.sale_id, l]));
    const liberados = lancamentos.filter((l) => l.status !== 'a_liberar').map((l) => l.sale_id);
    const registros = await emLotes(liberados, (ids) => `commission_records?select=sale_id,user_id,status&sale_type=eq.deposito&sale_id=in.(${ids})`);
    const pagos = new Set(registros.filter((r) => r.status === 'paid').map((r) => `${r.sale_id}|${r.user_id}`));
    return { indicadorDe, lancamentoDe, pagos };
  } catch (e) {
    // A lista de depósitos nunca pode sumir por causa da coluna de comissão.
    console.warn('[adminListDeposits] comissões:', e?.message);
    return vazio;
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido', deposits: [] });
  if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente', deposits: [] });

  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const actorId = String(body?.actorId || '').trim();
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
  const _ses = exigirSessao(req, actorId, 'adminListDeposits');
  if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
  if (!actorId) return res.status(403).json({ success: false, error: 'actorId obrigatório', deposits: [] });

  const actorRows = await (await sb(`app_users?select=primary_career_level,role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
  const actor = Array.isArray(actorRows) ? actorRows[0] : null;
  const isAdmin = actor && (['admin', 'super_admin'].includes(actor.role) || ['admin', 'super_admin'].includes(actor.primary_career_level));
  if (!isAdmin) return res.status(403).json({ success: false, error: 'Acesso restrito a administradores', deposits: [] });

  try {
    const kindFilter = DEPOSIT_KINDS.map(k => encodeURIComponent(k)).join(',');
    const rows = await (await sb(
      `catalog_sales?select=${COLS}&kind=in.(${kindFilter})&order=created_date.desc&limit=1000`
    )).json();

    const lista = Array.isArray(rows) ? rows : [];
    const extras = await comissoesDosDepositos(lista);
    const deposits = lista.map(r => ({
      id: r.id,
      user_id: r.buyer_id,
      email: r.buyer_email || '',
      name: r.buyer_name || '',
      kind: r.kind,
      amount: Number(r.total_amount) || Number(r.sale_price) || 0,
      // 28/09/2026 — 'cancelado' (em português, é como o sistema grava hoje)
      // ficava fora do filtro "Cancelado/Falhou".
      status: r.status === 'paid' ? 'confirmed' : (r.status === 'pending_payment' ? 'pending' : (['canceled', 'cancelled', 'cancelado'].includes(r.status) ? 'failed' : (r.status || 'pending'))),
      payment_method: r.payment_method || '',
      created_date: r.created_date,
    })).map((d) => {
      // 💸 28/09/2026 — pedido da Beatriz: a comissão de cada depósito na
      // própria linha (ver src/lib/comissaoDoDeposito.js).
      const ind = extras.indicadorDe.get(d.user_id) || null;
      const lanc = extras.lancamentoDe.get(d.id) || null;
      const pago = !!(lanc && extras.pagos.has(`${d.id}|${lanc.beneficiary_id}`));
      return {
        ...d,
        indicador: ind ? { id: ind.id, nome: ind.nome, empresa: ind.empresa } : null,
        comissao: { ...situacaoDaComissao({ deposito: d, indicador: ind, lancamento: lanc, pago }), recebe: lanc?.beneficiary_name || null },
      };
    });

    return res.status(200).json({ success: true, deposits });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e), deposits: [] });
  }
}
