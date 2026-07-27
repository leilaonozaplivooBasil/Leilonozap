// recalcularVenda — refaz a comissão de UMA venda já paga, com a regra vigente.
// Protegido por DIAG_KEY. Preview por padrão; grava com confirm 'RECALCULAR'.
//
// POR QUE (27/07/2026): a venda de R$ 101,98 foi paga sem o código do link
// (ref_code chegou vazio no checkout), então caiu no indicador do cadastro do
// comprador — o Site Oficial — e a linha que divulgou não recebeu nada. Além disso
// o 1% do Sócio Executivo tinha sido rateado entre dois executivos, o que a regra
// não permite. Este endpoint corrige uma venda específica sem tocar nas outras.
//
// COMO É SEGURO:
//   • estorna linha a linha o que foi creditado antes (debita da carteira de cada um)
//   • apaga os lançamentos antigos SÓ dessa venda
//   • recalcula com calcularComissao (o motor real) e credita de novo
//   • guarda o retrato do antes em system_logs, para poder reconstruir
//   • nunca deixa saldo negativo: o débito para no zero
//
//   POST { key, sale_id, seller_id?, mode:'executar', confirm:'RECALCULAR' }
//   seller_id (ou seller: nome/e-mail) troca a loja da venda — use quando a venda
//   registrou o vendedor errado.

import { calcularComissao } from '../_lib/arvoreOficial.js';
import { oid } from '../_lib/oid.js';

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

const lista = (x) => (Array.isArray(x) ? x : []);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const EMPRESA = 'Leilão NoZap - Site Oficial';

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

    const saleId = String(body.sale_id || '').trim();
    if (!saleId) return res.status(400).json({ error: 'informe sale_id' });

    const vendas = lista(await (await sb(`catalog_sales?select=*&id=eq.${encodeURIComponent(saleId)}&limit=1`)).json());
    const venda = vendas[0];
    if (!venda) return res.status(404).json({ error: 'venda não encontrada', sale_id: saleId });

    const users = lista(await (await sb(
      'app_users?select=id,full_name,email,career_levels,referred_by_id,commission_balance,licenciado_context,active&limit=5000'
    )).json());
    const byId = new Map(users.map((u) => [u.id, u]));
    const ativos = users.filter((u) => u.active !== false);

    // troca de loja, quando a venda registrou o vendedor errado
    let novoSeller = venda.seller_id;
    if (body.seller_id || body.seller) {
      const busca = String(body.seller_id || body.seller).trim().toLowerCase();
      const achado =
        byId.get(String(body.seller_id || '')) ||
        ativos.find((u) => (u.email || '').toLowerCase() === busca) ||
        ativos.find((u) => (u.full_name || '').toLowerCase().includes(busca));
      if (!achado) return res.status(404).json({ error: 'vendedor informado não encontrado', busca });
      novoSeller = achado.id;
    }

    // o que já foi lançado para esta venda
    const antigos = lista(await (await sb(`commission_records?select=*&sale_id=eq.${encodeURIComponent(saleId)}&limit=2000`)).json());
    const antigoPorPessoa = {};
    for (const r of antigos) {
      if (!r.user_id) continue;
      antigoPorPessoa[r.user_id] = round2((antigoPorPessoa[r.user_id] || 0) + Number(r.amount || 0));
    }

    // o que a regra de hoje manda pagar
    const alvo = { ...venda, seller_id: novoSeller };
    const { assignments, companyAmount, companyPercent, total } = calcularComissao(alvo, ativos);
    const novoPorPessoa = {};
    for (const a of assignments) {
      novoPorPessoa[a.user_id] = round2((novoPorPessoa[a.user_id] || 0) + a.amount);
    }

    // diferença por pessoa (o que falta creditar ou o que precisa voltar)
    const todos = new Set([...Object.keys(antigoPorPessoa), ...Object.keys(novoPorPessoa)]);
    const ajustes = [...todos].map((id) => {
      const antes = round2(antigoPorPessoa[id] || 0);
      const depois = round2(novoPorPessoa[id] || 0);
      return {
        id,
        nome: byId.get(id)?.full_name || id,
        recebeu_antes: antes,
        recebe_agora: depois,
        diferenca: round2(depois - antes),
        saldo_atual: round2(Number(byId.get(id)?.commission_balance) || 0),
      };
    }).filter((a) => Math.abs(a.diferenca) > 0.005)
      .sort((a, b) => b.diferenca - a.diferenca);

    const detalhe = assignments.map((a) => ({
      quem: a.user_name,
      papel: a.role,
      tipo: a.tipo === 'governanca' ? 'TOPO (pelo cargo)' : a.tipo === 'estrutura' ? 'Sócio Executivo' : 'CADEIA (da loja)',
      pct: Math.round(a.percent * 1000) / 1000,
      valor: round2(a.amount),
    })).sort((a, b) => b.valor - a.valor);

    if (body.mode !== 'executar' || body.confirm !== 'RECALCULAR') {
      return res.status(200).json({
        ok: true,
        modo: 'preview',
        instrucao: "para gravar: { key, sale_id, seller_id?, mode:'executar', confirm:'RECALCULAR' }",
        venda: {
          id: venda.id,
          valor: round2(venda.total_amount),
          status: venda.status,
          comprador: venda.buyer_name || byId.get(venda.buyer_id)?.full_name || null,
          loja_atual: byId.get(venda.seller_id)?.full_name || '(sem)',
          loja_nova: byId.get(novoSeller)?.full_name || '(sem)',
        },
        lancado_antes: round2(antigos.reduce((a, r) => a + Number(r.amount || 0), 0)),
        vai_lancar: round2(total + companyAmount),
        para_a_rede: round2(total),
        para_a_empresa: round2(companyAmount),
        distribuicao_nova: detalhe,
        ajustes_de_carteira: ajustes,
      });
    }

    // ---- EXECUTA ----
    // 1) retrato do antes, para poder reconstruir
    await sb('system_logs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: oid(),
        raw_base44: {
          kind: 'recalculo_venda',
          at: new Date().toISOString(),
          sale_id: saleId,
          motivo: body.motivo || 'link de indicação não capturado no checkout + 1% do executivo não pode ser rateado',
          seller_antes: venda.seller_id,
          seller_depois: novoSeller,
          records_antes: antigos,
          saldos_antes: ajustes.map((a) => ({ id: a.id, nome: a.nome, saldo: a.saldo_atual })),
        },
      }),
    });

    // 2) apaga os lançamentos antigos DESTA venda
    await sb(`commission_records?sale_id=eq.${encodeURIComponent(saleId)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });

    // 3) grava os novos
    const now = new Date().toISOString();
    const anchor = byId.get(novoSeller) || null;
    const site = users.find((u) => u.full_name === EMPRESA);
    const linhas = assignments.map((a) => {
      const id = oid();
      return {
        id, base44_id: id, sale_id: saleId, user_id: a.user_id, user_name: a.user_name, role: a.role,
        percent: Math.round(a.percent * 1000) / 1000, amount: a.amount, sale_amount: round2(venda.total_amount),
        sale_type: 'catalog', status: 'confirmed', product_title: venda.product_title || null,
        anchor_user_id: anchor?.id || null, anchor_user_name: anchor?.full_name || null, created_date: now,
      };
    });
    if (companyAmount > 0 && site) {
      const id = oid();
      linhas.push({
        id, base44_id: id, sale_id: saleId, user_id: site.id, user_name: site.full_name, role: 'empresa_rollup',
        percent: Math.round(companyPercent * 1000) / 1000, amount: companyAmount, sale_amount: round2(venda.total_amount),
        sale_type: 'catalog', status: 'confirmed', product_title: venda.product_title || null,
        anchor_user_id: anchor?.id || null, anchor_user_name: anchor?.full_name || null, created_date: now,
      });
    }
    if (linhas.length) {
      await sb('commission_records', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(linhas) });
    }

    // 4) acerta a carteira de cada um pela diferença (nunca deixa saldo negativo)
    let acertados = 0;
    const falhas = [];
    for (const a of ajustes) {
      const novoSaldo = Math.max(0, round2(a.saldo_atual + a.diferenca));
      const r = await sb(`app_users?id=eq.${encodeURIComponent(a.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ commission_balance: novoSaldo, updated_date: now }),
      });
      if (r.ok) acertados += 1;
      else falhas.push({ nome: a.nome, status: r.status });
    }

    // 5) atualiza a venda (loja e total de comissão)
    await sb(`catalog_sales?id=eq.${encodeURIComponent(saleId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ seller_id: novoSeller, commission_total: round2(total), updated_at: now }),
    });

    return res.status(200).json({
      ok: true,
      modo: 'executado',
      sale_id: saleId,
      loja_agora: byId.get(novoSeller)?.full_name || null,
      lancamentos_gravados: linhas.length,
      carteiras_acertadas: acertados,
      falhas,
      para_a_rede: round2(total),
      para_a_empresa: round2(companyAmount),
      distribuicao: detalhe,
      ajustes_de_carteira: ajustes,
    });
  } catch (e) {
    return res.status(500).json({ error: 'erro', details: String(e?.message || e) });
  }
}
