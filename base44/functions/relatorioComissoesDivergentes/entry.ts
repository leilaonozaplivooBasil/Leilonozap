// 📊 relatorioComissoesDivergentes — SOMENTE LEITURA (não grava nada, nunca).
//
// Varre as vendas PAGAS do catálogo a partir de uma data e compara, venda por venda:
//   • o que JÁ foi lançado em commission_records (fora o empresa_rollup)
//   • contra o que o PLANO OFICIAL manda pagar (30% = 20% cadeia telescópica + 10% topo)
//
// Serve para achar todas as vendas contaminadas pelo motor antigo (que pagava só o
// rebate na venda direta e jogava o resto em empresa_rollup).
//
// Fonte: Supabase de PRODUÇÃO via REST + service role (o SDK asServiceRole aponta
// para o store interno do Base44 e NÃO serve aqui).
//
// Payload: { desde?: 'YYYY-MM-DD' (default 2026-07-14), limite?: number (default 500),
//            so_divergentes?: boolean (default true), detalhar_por_pessoa?: boolean }

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const sb = (path: string) =>
  fetch(`${BASE}/rest/v1/${path}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
  });

// ── PLANO OFICIAL (idêntico ao acertarComissaoVenda) ──────────────
const POOLS = [
  { id: 'ceo', pct: 3.0 }, { id: 'livoo_live', pct: 2.0 }, { id: 'embaixador', pct: 1.0 },
  { id: 'conselheiro', pct: 1.0 }, { id: 'fundador', pct: 1.0 },
  { id: 'diretoria_executiva', pct: 0.5 }, { id: 'diretoria_operacao', pct: 0.5 },
];
const NIVEIS = [
  { id: 'influenciador', pct: 5.0 }, { id: 'vendedor', pct: 10.0 }, { id: 'licenciado', pct: 13.0 },
  { id: 'parceiro', pct: 15.0 }, { id: 'ponto_retirada', pct: 16.0 },
  { id: 'loja_fisica', pct: 19.0 }, { id: 'distribuidor', pct: 20.0 },
];
const CADEIA_TETO = 20.0;
const PCT_EXECUTIVO = 1.0;
const TOTAL_PCT = 30.0;
const EMPRESA = 'Leilão NoZap - Site Oficial';

const ALIAS: Record<string, string[]> = {
  licenciado: ['licenciado', 'licenciado_catalogo'],
  influenciador: ['influenciador', 'influencer', 'licenciado_aplicativo'],
  executivo: ['executivo', 'executivo_conta'],
  diretoria_executiva: ['diretoria_executiva', 'diretoria'],
  diretoria_operacao: ['diretoria_operacao', 'diretor'],
};
const temCargo = (u: any, cargo: string) => {
  const meus = Array.isArray(u?.career_levels) ? u.career_levels : [];
  return (ALIAS[cargo] || [cargo]).some((c) => meus.includes(c));
};
const carteiraExec = (u: any) => {
  if (!u) return null;
  if (u.executive_owner_id) return u.executive_owner_id;
  try {
    const p = typeof u.licenciado_context === 'string' ? JSON.parse(u.licenciado_context) : u.licenciado_context;
    return p?.executive_owner_id || null;
  } catch { return null; }
};

function calcular(sale: any, users: any[], byId: Map<string, any>, elegiveis: any[]) {
  const valor = Number(sale.total_amount) || 0;
  const assignments: any[] = [];
  if (!valor) return { assignments, cadeiaPct: 0, chain: [] as string[] };

  const chain: any[] = [];
  const vistos = new Set();
  let cur = (sale.seller_id && byId.get(sale.seller_id)) || (sale.licensee_id && byId.get(sale.licensee_id)) || null;
  while (cur && !vistos.has(cur.id) && chain.length < 50) {
    chain.push(cur); vistos.add(cur.id);
    cur = cur.referred_by_id ? byId.get(cur.referred_by_id) : null;
  }

  for (const p of POOLS) {
    const donos = elegiveis.filter((u) => temCargo(u, p.id));
    if (!donos.length) continue;
    const centavosTotais = Math.round(valor * p.pct);
    if (centavosTotais <= 0) continue;
    const base = Math.floor(centavosTotais / donos.length);
    let sobra = centavosTotais - base * donos.length;
    const ord = [...donos].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const seed = String(sale.id || '').split('').reduce((s, ch) => (s + ch.charCodeAt(0)) % 9973, 0);
    const off = seed % ord.length;
    for (const u of [...ord.slice(off), ...ord.slice(0, off)]) {
      const cent = base + (sobra > 0 ? 1 : 0);
      if (sobra > 0) sobra--;
      if (cent <= 0) continue;
      assignments.push({ role: p.id, user_id: u.id, user_name: u.full_name, amount: cent / 100 });
    }
  }

  let exec = chain.find((u) => temCargo(u, 'executivo'));
  if (!exec) {
    for (const u of chain) {
      const dono = byId.get(carteiraExec(u));
      if (dono && temCargo(dono, 'executivo')) { exec = dono; break; }
    }
  }
  if (exec) assignments.push({ role: 'executivo', user_id: exec.id, user_name: exec.full_name, amount: Math.round(valor * PCT_EXECUTIVO) / 100 });

  const nivelDe = (u: any) => {
    let melhor: any = null;
    for (const n of NIVEIS) if (temCargo(u, n.id) && (!melhor || n.pct > melhor.pct)) melhor = n;
    return melhor;
  };
  let piso = 0, pctCadeia = 0;
  for (const u of chain) {
    if (pctCadeia >= CADEIA_TETO - 0.0001) break;
    const nivel = nivelDe(u);
    if (!nivel) continue;
    const rebate = nivel.pct - piso;
    if (rebate <= 0) continue;
    const fatia = Math.min(rebate, CADEIA_TETO - pctCadeia);
    assignments.push({ role: nivel.id, user_id: u.id, user_name: u.full_name, amount: Math.round(valor * fatia) / 100 });
    piso = nivel.pct; pctCadeia += fatia;
  }

  return { assignments, cadeiaPct: pctCadeia, chain: chain.map((u) => u.full_name) };
}

Deno.serve(async (req) => {
  try {
    if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const desde = body.desde || '2026-07-14';
    const limite = Math.min(Number(body.limite) || 500, 1000);
    const soDivergentes = body.so_divergentes !== false;

    // 1) vendas PAGAS desde a data
    const vendasRes = await sb(`catalog_sales?select=*&status=in.(paid,shipped,delivered)&created_date=gte.${desde}&order=created_date.asc&limit=${limite}`);
    if (!vendasRes.ok) return Response.json({ error: 'falha ao ler catalog_sales', details: await vendasRes.text() }, { status: 500 });
    const vendas = await vendasRes.json();
    if (!Array.isArray(vendas)) return Response.json({ error: 'resposta inesperada em catalog_sales' }, { status: 500 });

    // 2) contas ativas (uma vez só)
    const users = await (await sb('app_users?select=id,full_name,career_levels,referred_by_id,licenciado_context&active=neq.false&limit=3000')).json();
    if (!Array.isArray(users) || !users.length) return Response.json({ error: 'falha ao ler app_users' }, { status: 500 });
    const byId = new Map(users.map((u: any) => [u.id, u]));
    const elegiveis = users.filter((u: any) => u.full_name !== EMPRESA);

    // 3) lançamentos existentes de todas essas vendas (em lotes, pra não estourar a URL)
    const pagoPorVenda: Record<string, Record<string, number>> = {};
    const rollupPorVenda: Record<string, number> = {};
    const ids = vendas.map((v: any) => v.id);
    for (let i = 0; i < ids.length; i += 40) {
      const fatia = ids.slice(i, i + 40).map((x: string) => `"${x}"`).join(',');
      const recs = await (await sb(`commission_records?select=sale_id,user_id,role,amount&sale_id=in.(${fatia})&limit=5000`)).json();
      for (const r of (Array.isArray(recs) ? recs : [])) {
        if (r.role === 'empresa_rollup') {
          rollupPorVenda[r.sale_id] = round2((rollupPorVenda[r.sale_id] || 0) + Number(r.amount || 0));
          continue;
        }
        pagoPorVenda[r.sale_id] = pagoPorVenda[r.sale_id] || {};
        pagoPorVenda[r.sale_id][r.user_id] = round2((pagoPorVenda[r.sale_id][r.user_id] || 0) + Number(r.amount || 0));
      }
    }

    // 4) compara venda por venda
    const nomes: Record<string, string> = {};
    users.forEach((u: any) => { nomes[u.id] = u.full_name; });

    const linhas: any[] = [];
    const porPessoa: Record<string, number> = {};
    let totalPagoGeral = 0, totalDevidoGeral = 0, totalRollupGeral = 0;

    for (const v of vendas) {
      const pago = pagoPorVenda[v.id] || {};
      const { assignments, cadeiaPct, chain } = calcular(v, users, byId, elegiveis);
      const devido: Record<string, number> = {};
      for (const a of assignments) devido[a.user_id] = round2((devido[a.user_id] || 0) + a.amount);

      const somaPago = round2(Object.values(pago).reduce((s, n) => s + n, 0));
      const somaDevido = round2(Object.values(devido).reduce((s, n) => s + n, 0));
      const rollup = round2(rollupPorVenda[v.id] || 0);
      totalPagoGeral = round2(totalPagoGeral + somaPago);
      totalDevidoGeral = round2(totalDevidoGeral + somaDevido);
      totalRollupGeral = round2(totalRollupGeral + rollup);

      const deltas = Object.keys({ ...pago, ...devido })
        .map((uid) => ({ user_id: uid, nome: nomes[uid] || '(?)', pago: round2(pago[uid] || 0), devido: round2(devido[uid] || 0), delta: round2((devido[uid] || 0) - (pago[uid] || 0)) }))
        .filter((d) => Math.abs(d.delta) > 0.001);

      for (const d of deltas) porPessoa[d.nome] = round2((porPessoa[d.nome] || 0) + d.delta);

      const divergente = deltas.length > 0;
      if (soDivergentes && !divergente) continue;

      linhas.push({
        sale_id: v.id,
        data: String(v.created_date || '').slice(0, 10),
        produto: String(v.product_title || '').slice(0, 42),
        valor: round2(Number(v.total_amount)),
        cadeia_pct: cadeiaPct,
        vendedor: chain[0] || '(sem cadeia)',
        pago: somaPago,
        devido: somaDevido,
        falta: round2(somaDevido - somaPago),
        rollup_indevido: rollup,
        pessoas: body.detalhar_por_pessoa ? deltas : deltas.length,
      });
    }

    return Response.json({
      success: true,
      somente_leitura: true,
      filtro: { desde, status: 'paid/shipped/delivered', limite },
      vendas_analisadas: vendas.length,
      vendas_divergentes: linhas.length,
      resumo: {
        total_pago: totalPagoGeral,
        total_devido: totalDevidoGeral,
        falta_creditar: round2(totalDevidoGeral - totalPagoGeral),
        rollup_indevido_acumulado: totalRollupGeral,
      },
      por_pessoa: Object.entries(porPessoa)
        .filter(([, v]) => Math.abs(v) > 0.001)
        .sort((a, b) => b[1] - a[1])
        .map(([nome, delta]) => ({ nome, delta })),
      vendas: linhas,
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});