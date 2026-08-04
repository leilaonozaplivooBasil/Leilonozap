// 🔎 auditarVendaComissao — SOMENTE LEITURA (nunca grava, nunca credita).
//
// Auditoria de UMA venda: acha a venda (por sale_id ou por parte do título),
// e devolve:
//   • dados da venda (valor, status, vendedor/âncora)
//   • a CADEIA de indicação a partir do vendedor, com os cargos de cada um
//   • o que JÁ foi lançado em commission_records (por pessoa e por cargo)
//   • o que o PLANO OFICIAL manda pagar (20% cadeia telescópica + 10% topo + 1% executivo)
//   • o delta por pessoa (falta / sobra)
//
// Fonte: Supabase de PRODUÇÃO via REST + service role.
// Payload: { sale_id?: string, titulo?: string, valor?: number, limite?: number }

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const sb = (path: string) =>
  fetch(`${BASE}/rest/v1/${path}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
  });

// ── PLANO OFICIAL (idêntico a acertarComissaoVenda / relatorioComissoesDivergentes) ──
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

Deno.serve(async (req) => {
  try {
    if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    const body = await req.json().catch(() => ({}));

    // 1) localizar a venda
    let vendas: any[] = [];
    if (body.sale_id) {
      vendas = await (await sb(`catalog_sales?select=*&id=eq.${encodeURIComponent(body.sale_id)}&limit=1`)).json();
    } else if (body.titulo) {
      const q = encodeURIComponent(`*${String(body.titulo)}*`);
      vendas = await (await sb(`catalog_sales?select=*&product_title=ilike.${q}&order=created_date.desc&limit=${Math.min(Number(body.limite) || 10, 50)}`)).json();
    } else {
      return Response.json({ error: 'informe sale_id ou titulo' }, { status: 400 });
    }
    if (!Array.isArray(vendas) || !vendas.length) return Response.json({ error: 'venda não encontrada', filtro: body }, { status: 404 });

    // 2) contas
    const users = await (await sb('app_users?select=id,full_name,career_levels,primary_career_level,referred_by_id,licenciado_context,active,commission_balance&limit=3000')).json();
    const byId = new Map((Array.isArray(users) ? users : []).map((u: any) => [u.id, u]));
    const elegiveis = (Array.isArray(users) ? users : []).filter((u: any) => u.active !== false && u.full_name !== EMPRESA);

    const saida: any[] = [];

    for (const v of vendas) {
      const valor = Number(v.total_amount) || 0;

      // cadeia a partir do vendedor/âncora
      const chain: any[] = [];
      const vistos = new Set<string>();
      let cur = (v.seller_id && byId.get(v.seller_id)) || (v.licensee_id && byId.get(v.licensee_id)) || null;
      while (cur && !vistos.has(cur.id) && chain.length < 50) {
        chain.push(cur); vistos.add(cur.id);
        cur = cur.referred_by_id ? byId.get(cur.referred_by_id) : null;
      }

      // devido pelo plano
      const devido: Record<string, { nome: string; itens: any[]; total: number }> = {};
      const add = (u: any, cargo: string, pct: number, amount: number) => {
        if (!(amount > 0.001)) return;
        const k = u.id;
        devido[k] = devido[k] || { nome: u.full_name, itens: [], total: 0 };
        devido[k].itens.push({ cargo, pct, amount: round2(amount) });
        devido[k].total = round2(devido[k].total + amount);
      };

      for (const p of POOLS) {
        const donos = elegiveis.filter((u: any) => temCargo(u, p.id));
        if (!donos.length) continue;
        const centavos = Math.round(valor * p.pct);
        if (centavos <= 0) continue;
        const base = Math.floor(centavos / donos.length);
        let sobra = centavos - base * donos.length;
        const ord = [...donos].sort((a, b) => String(a.id).localeCompare(String(b.id)));
        const seed = String(v.id || '').split('').reduce((s, ch) => (s + ch.charCodeAt(0)) % 9973, 0);
        const off = seed % ord.length;
        for (const u of [...ord.slice(off), ...ord.slice(0, off)]) {
          const cent = base + (sobra > 0 ? 1 : 0);
          if (sobra > 0) sobra--;
          add(u, p.id, p.pct / donos.length, cent / 100);
        }
      }

      let exec = chain.find((u) => temCargo(u, 'executivo'));
      let execOrigem = exec ? 'cargo na própria cadeia' : '';
      if (!exec) {
        for (const u of chain) {
          const dono = byId.get(carteiraExec(u));
          if (dono && temCargo(dono, 'executivo')) { exec = dono; execOrigem = `carteira executiva de ${u.full_name}`; break; }
        }
      }
      if (exec) add(exec, 'executivo', PCT_EXECUTIVO, Math.round(valor * PCT_EXECUTIVO) / 100);

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
        add(u, nivel.id, fatia, Math.round(valor * fatia) / 100);
        piso = nivel.pct; pctCadeia += fatia;
      }

      // pago
      const recs = await (await sb(`commission_records?select=user_id,user_name,role,percent,amount,status&sale_id=eq.${encodeURIComponent(v.id)}&limit=500`)).json();
      const pago: Record<string, { nome: string; itens: any[]; total: number }> = {};
      for (const r of (Array.isArray(recs) ? recs : [])) {
        const k = r.user_id || `role:${r.role}`;
        pago[k] = pago[k] || { nome: r.user_name || '(?)', itens: [], total: 0 };
        pago[k].itens.push({ cargo: r.role, pct: r.percent, amount: round2(Number(r.amount) || 0), status: r.status });
        pago[k].total = round2(pago[k].total + (Number(r.amount) || 0));
      }

      const chaves = new Set([...Object.keys(pago), ...Object.keys(devido)]);
      const comparativo = [...chaves].map((k) => ({
        user_id: k,
        nome: devido[k]?.nome || pago[k]?.nome || '(?)',
        pago_total: round2(pago[k]?.total || 0),
        devido_total: round2(devido[k]?.total || 0),
        delta: round2((devido[k]?.total || 0) - (pago[k]?.total || 0)),
        cargos_pagos: pago[k]?.itens || [],
        cargos_devidos: devido[k]?.itens || [],
      })).sort((a, b) => b.delta - a.delta);

      saida.push({
        sale_id: v.id,
        data: v.created_date,
        produto: v.product_title,
        valor,
        status: v.status,
        commission_processed: v.commission_processed,
        vendedor: chain[0]?.full_name || '(sem cadeia)',
        cadeia: chain.map((u) => ({ nome: u.full_name, cargos: u.career_levels, principal: u.primary_career_level })),
        cadeia_pct: pctCadeia,
        executivo_aplicado: exec ? { nome: exec.full_name, origem: execOrigem } : null,
        total_pago: round2(Object.values(pago).reduce((s, x) => s + x.total, 0)),
        total_devido: round2(Object.values(devido).reduce((s, x) => s + x.total, 0)),
        comparativo,
      });
    }

    // filtro opcional: só uma pessoa no comparativo (resposta enxuta para auditoria pontual)
    if (body.so_pessoa) {
      const alvo = String(body.so_pessoa).toLowerCase();
      for (const s of saida) s.comparativo = s.comparativo.filter((c: any) => String(c.nome).toLowerCase().includes(alvo));
    }

    // opcional: quem detém os cargos do topo (para conferir se o cadastro está certo)
    let donos_cargos: any = undefined;
    if (body.listar_cargos) {
      donos_cargos = {};
      for (const p of [...POOLS, { id: 'executivo', pct: 1 }]) {
        donos_cargos[p.id] = elegiveis.filter((u: any) => temCargo(u, p.id)).map((u: any) => u.full_name);
      }
    }

    return Response.json({ success: true, somente_leitura: true, donos_cargos, vendas: saida });
  } catch (e) {
    return Response.json({ error: String((e as any)?.message || e) }, { status: 500 });
  }
});