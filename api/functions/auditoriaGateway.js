// 🧾 auditoriaGateway — TUDO que o gateway recebeu num período × TUDO que foi pago aqui
// no mesmo período, pagamento por pagamento (08/10/2026).
//
// Dono: "auditoria em todos os depósitos dos últimos 30 dias… conferência com a
// plataforma; isso é sério e precisa estar tudo batendo".
//
// Admin ou super_admin, com crachá. SÓ LEITURA: lê o gateway (busca paginada por data
// de criação) e o banco; não grava nada, não credita, não devolve.
//
// POST { actor_id | user_id, de?: 'AAAA-MM-DD', ate?: 'AAAA-MM-DD', dias?: 1..62 }
//   → { ok, janela, truncado, totais, pago_aqui_sem_pagamento_la: [...], linhas: [...] }
// A régua e as contas ficam em api/_lib/auditoriaGateway.js (puro, testado).
import { exigirSessao } from '../_lib/sessao.js';
import { listarPagamentosDoGateway } from '../_lib/varreduraGateway.js';
import { janelaDaAuditoria, classificarPagamentos, vendasPagasSemPagamento, PAGOS } from '../_lib/auditoriaGateway.js';

const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
// A listagem do gateway para em 10 páginas de 100; se encheu, o período é grande demais para uma chamada.
const TETO_PAGAMENTOS = 1000;
const CAMPOS = 'id,kind,status,buyer_name,total_amount,created_date,mp_payment_id,payment_method,amount_charged:raw_base44->>amount_charged';

function sb(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } });
}
async function lerLista(path) {
  const j = await (await sb(path)).json().catch(() => []);
  return Array.isArray(j) ? j : [];
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'Config ausente' });
    if (!MP_TOKEN) return res.status(500).json({ ok: false, error: 'MP_ACCESS_TOKEN ausente no servidor' });
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body && typeof body === 'object' ? body : {};

    // 🔐 crachá + papel: só administrador vê o extrato do gateway
    const actorId = String(body.actor_id || body.user_id || '').trim();
    const _ses = exigirSessao(req, actorId, 'auditoriaGateway');
    if (!_ses.liberado) return res.status(_ses.http).json({ ok: false, error: 'nao_autenticado' });
    const ator = (await lerLista(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`))[0];
    if (!ator || !['admin', 'super_admin'].includes(ator.role)) return res.status(403).json({ ok: false, error: 'Acesso restrito a administradores' });

    const janela = janelaDaAuditoria({ de: body.de, ate: body.ate, dias: body.dias });
    // quem somos no gateway: pagamento cujo recebedor não é a nossa conta é a conta PAGANDO alguém
    const eu = await fetch('https://api.mercadopago.com/users/me', { headers: { Authorization: `Bearer ${MP_TOKEN}` } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const nossoId = eu?.id != null ? String(eu.id) : null;
    const lista = await listarPagamentosDoGateway({ de: janela.de, ate: janela.ate, token: MP_TOKEN });
    if (!lista.ok) return res.status(200).json({ ok: false, error: `gateway: ${lista.erro}`, janela });
    const pagamentos = lista.pagamentos;

    // as nossas vendas que podem casar: pelo id do pagamento e pela referência que mandamos ao gateway
    const ids = [...new Set(pagamentos.filter((p) => p && p.id != null).map((p) => String(p.id)))];
    const refs = [...new Set(pagamentos.map((p) => String(p?.external_reference || '')).filter((s) => /^[A-Za-z0-9_-]{1,64}$/.test(s)))];
    const vendas = [];
    for (let i = 0; i < ids.length; i += 200) vendas.push(...await lerLista(`catalog_sales?select=${CAMPOS}&mp_payment_id=in.(${encodeURIComponent(ids.slice(i, i + 200).map((s) => `"${s}"`).join(','))})&limit=1000`));
    for (let i = 0; i < refs.length; i += 200) vendas.push(...await lerLista(`catalog_sales?select=${CAMPOS}&id=in.(${encodeURIComponent(refs.slice(i, i + 200).map((s) => `"${s}"`).join(','))})&limit=1000`));

    // o outro lado: tudo que foi pago aqui pelo gateway no mesmo período
    const vendasPagas = await lerLista(`catalog_sales?select=${CAMPOS}&mp_payment_id=not.is.null&status=in.(${PAGOS.join(',')})&created_date=gte.${encodeURIComponent(janela.de)}&created_date=lte.${encodeURIComponent(janela.ate)}&order=created_date.desc&limit=2000`);

    const { linhas, totais } = classificarPagamentos(pagamentos, vendas, { nossoId });
    const semPagamento = vendasPagasSemPagamento(vendasPagas, pagamentos);
    return res.status(200).json({
      ok: true, janela, truncado: pagamentos.length >= TETO_PAGAMENTOS, conta: nossoId,
      totais: { ...totais, vendas_pagas_aqui: vendasPagas.length, pago_aqui_sem_pagamento_la: semPagamento.length },
      pago_aqui_sem_pagamento_la: semPagamento,
      linhas,
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e).slice(0, 200) });
  }
}
