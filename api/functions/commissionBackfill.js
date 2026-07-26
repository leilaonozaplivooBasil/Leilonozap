// commissionBackfill — roda as comissões das vendas JÁ PAGAS que ficaram sem distribuição.
// Protegido por DIAG_KEY. Preview por padrão; só grava com confirm 'RODAR'.
//
// CONTEXTO (26/07/2026): a auditoria mostrou que o commission_ledger tinha só 14
// lançamentos para 472 vendas — e que o TOPO do plano (10%) nunca foi pago, porque o
// motor do webhook só distribui a cadeia (20%). Depois da zeragem de abertura, este
// backfill reconstrói o histórico aplicando os cargos que estão em vigor HOJE:
//   • CADEIA 20% — venda direta de quem indicou o comprador + overrides subindo (teto 20%)
//   • TOPO 10%  — CEO, Livoo Live, Embaixador, Conselheiros, Fundadores, Diretorias
//   • 1% do Sócio Executivo sobre a própria estrutura
//
// IDEMPOTENTE: venda que já tem lançamento no ledger é pulada. Rodar duas vezes não duplica.

import { computeTopPool } from '../_lib/topPool.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const lista = (x) => (Array.isArray(x) ? x : []);

/** Cadeia de 20%: igual ao motor do webhook (venda direta + overrides, teto 20%). */
function computeChain(sale, byId, levels, ov) {
  const value = Number(sale.total_amount) || 0;
  if (!value || !sale.buyer_id) return [];

  const chain = [];
  let node = byId.get(sale.buyer_id);
  const seen = new Set(node ? [node.id] : []);
  for (let i = 0; i < 10 && node?.referred_by_id; i++) {
    const anc = byId.get(node.referred_by_id);
    if (!anc || seen.has(anc.id)) break;
    seen.add(anc.id);
    chain.push({ child: node, anc });
    node = anc;
  }

  const cap = 0.2 * value;
  let running = 0;
  const out = [];
  for (let i = 0; i < chain.length && running < cap - 0.001; i++) {
    const { child, anc } = chain[i];
    const pct = i === 0
      ? Number(levels[anc.primary_career_level]?.venda_direta_pct || 0)
      : Number((ov[anc.primary_career_level] || {})[child.primary_career_level] || 0);
    let amount = round2((value * pct) / 100);
    if (running + amount > cap) amount = round2(cap - running);
    if (amount > 0.001) {
      out.push({
        beneficiary_id: anc.id,
        beneficiary_name: anc.full_name,
        beneficiary_level: anc.primary_career_level,
        role_in_sale: i === 0 ? 'venda_direta' : 'override',
        pct,
        amount,
      });
      running += amount;
    }
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    if (!process.env.DIAG_KEY || body.key !== process.env.DIAG_KEY) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ error: 'config_ausente' });

    const executar = body.mode === 'executar' && body.confirm === 'RODAR';
    const limite = Math.min(Number(body.limit) || 1000, 2000);

    // base de cálculo
    const users = lista(await (await sb(
      'app_users?select=id,full_name,email,career_levels,primary_career_level,referred_by_id,commission_balance,licenciado_context,active&limit=5000'
    )).json());
    const byId = new Map(users.map((u) => [u.id, u]));

    const levels = Object.fromEntries(
      lista(await (await sb('career_levels?select=id,venda_direta_pct')).json()).map((l) => [l.id, l])
    );
    const ovRows = lista(await (await sb('commission_overrides?select=earner_level,on_level,pct&condicao=eq.direto')).json());
    const ov = {};
    ovRows.forEach((r) => { (ov[r.earner_level] = ov[r.earner_level] || {})[r.on_level] = r.pct; });

    // vendas pagas e o que já foi lançado
    const vendas = lista(await (await sb(
      `catalog_sales?select=id,total_amount,status,kind,buyer_id,seller_id,created_at&status=eq.paid&order=created_at.asc&limit=${limite}`
    )).json());
    const ledger = lista(await (await sb('commission_ledger?select=sale_id&limit=20000')).json());
    const jaPagas = new Set(ledger.map((l) => l.sale_id));

    const pendentes = vendas.filter(
      (v) => !jaPagas.has(v.id) && Number(v.total_amount) > 0 && v.kind !== 'wallet_deposit' && v.kind !== 'commission_deposit'
    );

    // calcula tudo antes de gravar
    const plano = [];
    for (const v of pendentes) {
      const cadeia = computeChain(v, byId, levels, ov);
      const ancora = v.seller_id || byId.get(v.buyer_id)?.referred_by_id || null;
      const topo = computeTopPool(v.total_amount, users, ancora);
      const linhas = [...cadeia, ...topo];
      if (linhas.length) plano.push({ sale: v, linhas });
    }

    const totalGeral = round2(
      plano.reduce((a, p) => a + p.linhas.reduce((b, l) => b + l.amount, 0), 0)
    );
    const porBeneficiario = {};
    for (const p of plano) {
      for (const l of p.linhas) {
        const k = l.beneficiary_name || l.beneficiary_id;
        porBeneficiario[k] = round2((porBeneficiario[k] || 0) + l.amount);
      }
    }

    if (!executar) {
      return res.status(200).json({
        ok: true,
        modo: 'preview',
        instrucao: "para gravar: { key, mode: 'executar', confirm: 'RODAR' }",
        vendas_pagas: vendas.length,
        ja_com_comissao: vendas.length - pendentes.length,
        a_processar: plano.length,
        total_a_distribuir: totalGeral,
        por_beneficiario: Object.fromEntries(
          Object.entries(porBeneficiario).sort((a, b) => b[1] - a[1])
        ),
        amostra: plano.slice(0, 3),
      });
    }

    // grava: ledger + saldo, venda a venda
    const creditos = new Map();
    let lancamentos = 0;
    const falhas = [];

    for (const p of plano) {
      for (const l of p.linhas) {
        const r = await sb('commission_ledger', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ sale_id: p.sale.id, ...l }),
        });
        if (r.ok) {
          lancamentos += 1;
          creditos.set(l.beneficiary_id, round2((creditos.get(l.beneficiary_id) || 0) + l.amount));
        } else {
          falhas.push({ sale_id: p.sale.id, beneficiario: l.beneficiary_name, status: r.status });
        }
      }
    }

    // credita o saldo de cada beneficiário (uma vez por pessoa)
    for (const [id, valor] of creditos) {
      const atualArr = lista(await (await sb(`app_users?select=commission_balance&id=eq.${encodeURIComponent(id)}&limit=1`)).json());
      const atual = Number(atualArr[0]?.commission_balance || 0);
      await sb(`app_users?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ commission_balance: round2(atual + valor), updated_date: new Date().toISOString() }),
      });
    }

    return res.status(200).json({
      ok: true,
      modo: 'executado',
      vendas_processadas: plano.length,
      lancamentos,
      falhas,
      total_distribuido: totalGeral,
      creditado_por_pessoa: Object.fromEntries(
        [...creditos.entries()].map(([id, v]) => [byId.get(id)?.full_name || id, v])
      ),
    });
  } catch (e) {
    return res.status(500).json({ error: 'erro', details: String(e?.message || e) });
  }
}
