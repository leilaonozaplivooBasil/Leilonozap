// commissionSimulate — SIMULA uma venda e mostra quem receberia o quê.
// Protegido por DIAG_KEY. NÃO grava nada: nem ledger, nem saldo, nem venda.
// Usa exatamente o mesmo cálculo do motor ao vivo (mpWebhook/stripeWebhook).
//
// Serve para conferir a régua antes de pagar de verdade:
//   POST /api/functions/commissionSimulate
//   { key, valor: 100, comprador: "TTT" }        (nome, e-mail ou id)
//
// Devolve a cadeia (20%) linha a linha, o topo (10%) por cargo e o total.

import { computeTopPool } from '../_lib/topPool.js';
import { bestSellingLevel, overridePct } from '../_lib/networkChain.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
  });
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const lista = (x) => (Array.isArray(x) ? x : []);

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

    const valor = Number(body.valor || 100);
    const busca = String(body.comprador || '').trim();
    if (!busca) return res.status(400).json({ error: 'informe o comprador (nome, e-mail ou id)' });

    const users = lista(await (await sb(
      'app_users?select=id,full_name,email,career_levels,primary_career_level,referred_by_id,active,licenciado_context&limit=5000'
    )).json());
    const byId = new Map(users.map((u) => [u.id, u]));

    const comprador =
      byId.get(busca) ||
      users.find((u) => (u.email || '').toLowerCase() === busca.toLowerCase()) ||
      users.find((u) => (u.full_name || '').toLowerCase().includes(busca.toLowerCase()));
    if (!comprador) return res.status(404).json({ error: 'comprador não encontrado', busca });

    const levels = Object.fromEntries(
      lista(await (await sb('career_levels?select=id,venda_direta_pct')).json()).map((l) => [l.id, l])
    );
    const ovRows = lista(await (await sb('commission_overrides?select=earner_level,on_level,pct&condicao=eq.direto')).json());
    const ov = {};
    ovRows.forEach((r) => { (ov[r.earner_level] = ov[r.earner_level] || {})[r.on_level] = r.pct; });

    // ---- CADEIA 20% ----
    const chain = [];
    let node = comprador;
    const seen = new Set([node.id]);
    for (let i = 0; i < 10 && node?.referred_by_id; i++) {
      const anc = byId.get(node.referred_by_id);
      if (!anc || seen.has(anc.id)) break;
      seen.add(anc.id);
      chain.push({ child: node, anc });
      node = anc;
    }

    const cap = 0.2 * valor;
    let running = 0;
    const cadeia = [];
    for (let i = 0; i < chain.length && running < cap - 0.001; i++) {
      const { child, anc } = chain[i];
      const pct = i === 0 ? bestSellingLevel(anc, levels).pct : overridePct(ov, anc, child);
      let amount = round2((valor * pct) / 100);
      if (running + amount > cap) amount = round2(cap - running);
      if (amount > 0.001) {
        cadeia.push({
          quem: anc.full_name,
          cargo_usado: i === 0 ? bestSellingLevel(anc, levels).level : anc.primary_career_level,
          papel: i === 0 ? 'venda direta (indicou o comprador)' : `rebate sobre ${child.full_name}`,
          pct,
          valor: amount,
        });
        running += amount;
      }
    }

    // ---- TOPO 10% ----
    const ancora = comprador.referred_by_id || null;
    const topo = computeTopPool(valor, users, ancora).map((l) => ({
      quem: l.beneficiary_name,
      cargo: l.beneficiary_level,
      tipo: l.role_in_sale.startsWith('pool_') ? 'POOL (dividido)' :
            l.role_in_sale === 'estrutura_executivo' ? 'Sócio Executivo (só da estrutura dele)' : 'individual',
      pct: l.pct,
      valor: l.amount,
    }));

    const totalCadeia = round2(cadeia.reduce((a, l) => a + l.valor, 0));
    const totalTopo = round2(topo.reduce((a, l) => a + l.valor, 0));

    return res.status(200).json({
      ok: true,
      aviso: 'SIMULAÇÃO — nada foi gravado',
      venda: { valor, comprador: comprador.full_name, indicado_por: byId.get(ancora)?.full_name || '(ninguém)' },
      cadeia_20: { linhas: cadeia, total: totalCadeia, teto: round2(cap) },
      topo_10: { linhas: topo, total: totalTopo },
      resumo: {
        total_comissao: round2(totalCadeia + totalTopo),
        percentual_da_venda: round2(((totalCadeia + totalTopo) / valor) * 100),
        fica_com_a_empresa: round2(valor - totalCadeia - totalTopo),
      },
    });
  } catch (e) {
    return res.status(500).json({ error: 'erro', details: String(e?.message || e) });
  }
}
