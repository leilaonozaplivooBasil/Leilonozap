// 🔧 acertarComissaoVenda — recalcula a comissão de vendas de catálogo pela ÁRVORE
// OFICIAL corrigida (30% = 20% cadeia TELESCÓPICA + 10% topo) e acerta os saldos.
//
// Criada em 01/08/2026 para corrigir o vazamento da cadeia: o motor antigo usava a
// tabela de REBATES como fatias fixas, então venda direta de nível alto pagava só o
// rebate (Distribuidor 1% em vez de 20%) e o resto ia para empresa_rollup.
//
// REGRAS CONFIRMADAS PELO SANTANA (01/08/2026):
//   • Venda da Loja Oficial → ela tem cargo distribuidor, leva os 20% da cadeia.
//   • Os 10% do topo distribuem SEMPRE pra toda a cadeia do topo (por cargo).
//   • Venda sem cadeia nenhuma → os 20% ficam com a empresa (Site Oficial).
//   • Comissão de conta inativa/inexistente → deixa de ser paga e volta pra empresa.
//
// ⚠️ Fala DIRETO com o Supabase de produção via REST + service role (o SDK
// asServiceRole aponta para o store interno do Base44 — não serve aqui).
//
// Payload (uma venda):  { sale_id? , order_code? , dry_run?: boolean (default TRUE) }
// Payload (em lote):    { lote: true, desde?: 'YYYY-MM-DD', limite?: number, dry_run? }
// dry_run=true  → só relatório, NÃO grava nada.
// dry_run=false → apaga os lançamentos antigos, grava os novos e acerta os saldos.

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const sb = (path: string, opts: RequestInit = {}) =>
  fetch(`${BASE}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });

// ── PLANO OFICIAL ────────────────────────────────────────────────
// 📕 FONTE DE VERDADE DESTES NÚMEROS: docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md
// (transcrição da apresentação oficial de negócio, entregue pelo dono em 04/08/2026)
//
// ⚠️ NÃO ALTERE NENHUM PERCENTUAL AQUI com base em número falado numa conversa.
// Se alguém disser um valor diferente, o DOCUMENTO OFICIAL vence — aponte a
// divergência e peça confirmação por escrito antes de mexer.
//
// Validado em 04/08/2026, 100% alinhado ao documento:
//   Influenciador 5% · Vendedor 10% · Licenciado 13% · Parceiro 15%
//   Ponto de Retirada 16% · Loja Física 19% · Distribuidor 20%
//
//   FÓRMULA OFICIAL:  30% = 20% (cadeia telescópica) + 10% (topo)
//
//   ⚠️ ATENÇÃO — O 1% DO EXECUTIVO ESTÁ DENTRO DOS 10% DO TOPO.
//   Os 10% do topo se decompõem assim (confirmado pelo dono em 05/08/2026):
//        1%  executivo de conta (sobre a estrutura dele) ....... PCT_EXECUTIVO
//      + 9%  pools institucionais (CEO → fundadores) .......... soma de POOLS
//      = 10% topo
//   Por isso a constante POOLS soma 9,0 e NÃO 10,0 — o décimo ponto é o do
//   executivo, lançado à parte (linha do `assignments` com role='executivo').
//   Somar POOLS e achar "9%" e concluir que falta 1% é LEITURA ERRADA: o 1%
//   do executivo é justamente o que fecha os 10%. Confirmado na venda real de
//   R$ 101,98 → cadeia R$ 20,40 (20%) + exec R$ 1,02 (1%) + pools R$ 9,18 (9%)
//   = R$ 30,60 = 30,0% exato.
//   "por fora" do executivo significa fora dos 20% DA CADEIA — nunca fora dos 30%.
// POOLS = os 9% institucionais. Somados ao 1% do executivo (PCT_EXECUTIVO,
// logo abaixo) fecham os 10% do topo. NÃO "corrija" para somar 10 aqui —
// isso pagaria 31% no total e estouraria o plano oficial.
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

function calcular(sale: any, users: any[]) {
  const valor = Number(sale.total_amount) || 0;
  const byId = new Map(users.map((u) => [u.id, u]));
  const assignments: any[] = [];
  if (!valor) return { assignments, companyAmount: 0, cadeiaPct: 0, chain: [] as string[] };

  const chain: any[] = [];
  const vistos = new Set();
  let cur = (sale.seller_id && byId.get(sale.seller_id)) || null;
  while (cur && !vistos.has(cur.id) && chain.length < 50) {
    chain.push(cur); vistos.add(cur.id);
    cur = cur.referred_by_id ? byId.get(cur.referred_by_id) : null;
  }

  const elegiveis = users.filter((u) => u.full_name !== EMPRESA);
  // TOPO — pools em centavos inteiros (maior resto), rotação estável pela venda
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
      assignments.push({ role: p.id, user_id: u.id, user_name: u.full_name, percent: p.pct / donos.length, amount: cent / 100, tipo: 'governanca' });
    }
  }
  // EXECUTIVO — própria estrutura, nunca pool.
  // ⚠️ REGRA ESPELHADA de api/_lib/resolveExecutivo.js (fonte única da regra).
  // Este arquivo roda em Deno e o outro em Node/Vercel — os dois ambientes NÃO
  // compartilham import. Mudou a regra? Mude NOS DOIS, sempre.
  //
  // "Migrou para um executivo, vai com tudo" (dono, 04/08/2026):
  //   1) carteira migrada da PRÓPRIA pessoa vence — inclusive sobre a árvore
  //   2) senão, a própria pessoa é executiva
  //   3) senão, sobe pra quem indicou
  //   4) linha acabou → executivo raiz (executivo + ceo)
  let exec: any = null;
  {
    const vistosExec = new Set();
    let atual: any = chain[0] || null;
    while (atual && !vistosExec.has(atual.id) && vistosExec.size < 50) {
      vistosExec.add(atual.id);
      const dono = byId.get(carteiraExec(atual));
      if (dono && temCargo(dono, 'executivo')) { exec = dono; break; }
      if (temCargo(atual, 'executivo')) { exec = atual; break; }
      atual = atual.referred_by_id ? byId.get(atual.referred_by_id) : null;
    }
    if (!exec) exec = elegiveis.find((u) => temCargo(u, 'executivo') && temCargo(u, 'ceo')) || null;
  }
  if (exec) assignments.push({ role: 'executivo', user_id: exec.id, user_name: exec.full_name, percent: PCT_EXECUTIVO, amount: Math.round(valor * PCT_EXECUTIVO) / 100, tipo: 'estrutura' });

  // CADEIA TELESCÓPICA
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
    assignments.push({ role: nivel.id, user_id: u.id, user_name: u.full_name, percent: fatia, amount: Math.round(valor * fatia) / 100, tipo: piso === 0 ? 'venda_direta' : 'rebate' });
    piso = nivel.pct; pctCadeia += fatia;
  }

  const centRede = Math.round(assignments.reduce((s, a) => s + a.amount, 0) * 100);
  const companyAmount = Math.max(0, Math.round(valor * TOTAL_PCT) - centRede) / 100;
  return { assignments, companyAmount, cadeiaPct: pctCadeia, chain: chain.map((u) => u.full_name) };
}

// ── acerta UMA venda (usado tanto no avulso quanto no lote) ───────
async function processarVenda(sale: any, users: any[], nomes: Record<string, string>, dryRun: boolean, resumo: boolean) {
  const antigos = await (await sb(`commission_records?select=id,user_id,user_name,role,percent,amount&sale_id=eq.${encodeURIComponent(sale.id)}`)).json();
  const pagoPor: Record<string, number> = {};
  for (const r of (Array.isArray(antigos) ? antigos : [])) {
    if (r.role === 'empresa_rollup') continue; // rollup é só contábil, não vira saldo
    pagoPor[r.user_id] = round2((pagoPor[r.user_id] || 0) + Number(r.amount || 0));
  }

  const { assignments, companyAmount, cadeiaPct, chain } = calcular(sale, users);
  const devidoPor: Record<string, number> = {};
  for (const a of assignments) devidoPor[a.user_id] = round2((devidoPor[a.user_id] || 0) + a.amount);

  const deltas = Object.keys({ ...pagoPor, ...devidoPor }).map((uid) => ({
    user_id: uid, nome: nomes[uid] || '(conta inativa)',
    pago: round2(pagoPor[uid] || 0), devido: round2(devidoPor[uid] || 0),
    delta: round2((devidoPor[uid] || 0) - (pagoPor[uid] || 0)),
  })).filter((d) => Math.abs(d.delta) > 0.001);

  const relatorio: any = {
    venda: { id: sale.id, produto: sale.product_title, valor: Number(sale.total_amount), seller_id: sale.seller_id, status: sale.status },
    cadeia: chain, cadeia_pct: cadeiaPct,
    antes: { linhas: (antigos || []).length, total_pago: round2(Object.values(pagoPor).reduce((s, v) => s + v, 0)) },
    depois: { linhas: assignments.length, total_devido: round2(Object.values(devidoPor).reduce((s, v) => s + v, 0)), empresa_rollup: companyAmount },
    novas_linhas: resumo ? undefined : assignments.map((a) => ({ nome: a.user_name, role: a.role, pct: round2(a.percent), valor: a.amount, tipo: a.tipo })),
    ajustes_de_saldo: deltas,
    dry_run: dryRun,
  };

  if (dryRun) return { ...relatorio, aplicado: false };

  // APLICA — apaga lançamentos antigos, grava os novos, acerta saldos
  await sb(`commission_records?sale_id=eq.${encodeURIComponent(sale.id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });

  const now = new Date().toISOString();
  const site = users.find((u: any) => u.full_name === EMPRESA);
  const oid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  const linhas: any[] = assignments.map((a) => {
    const id = oid();
    return {
      id, base44_id: id, sale_id: sale.id, user_id: a.user_id, user_name: a.user_name, role: a.role,
      percent: Math.round(a.percent * 1000) / 1000, amount: a.amount, sale_amount: Number(sale.total_amount),
      sale_type: 'catalog', status: 'confirmed', product_title: sale.product_title || null, created_date: now,
    };
  });
  if (companyAmount > 0 && site) {
    const id = oid();
    linhas.push({
      id, base44_id: id, sale_id: sale.id, user_id: site.id, user_name: site.full_name, role: 'empresa_rollup',
      percent: Math.round((companyAmount / Number(sale.total_amount)) * 100000) / 1000, amount: companyAmount,
      sale_amount: Number(sale.total_amount), sale_type: 'catalog', status: 'confirmed',
      product_title: sale.product_title || null, created_date: now,
    });
  }
  if (linhas.length) {
    const ins = await sb('commission_records', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(linhas) });
    if (!ins.ok) return { ...relatorio, aplicado: false, erro: 'falha ao gravar commission_records: ' + (await ins.text()) };
  }

  const saldos: any[] = [];
  for (const d of deltas) {
    // conta que não existe mais em app_users: a fatia dela simplesmente não é mais paga
    // (volta pra empresa via empresa_rollup) — não tenta mexer em saldo inexistente.
    const existe = users.some((x: any) => x.id === d.user_id);
    if (!existe) { saldos.push({ nome: d.nome, ignorado: 'conta inativa — fatia devolvida à empresa', valor: d.delta }); continue; }
    if (d.delta > 0.001) {
      const r = await sb('rpc/credit_commission', { method: 'POST', body: JSON.stringify({ _user: d.user_id, _amount: d.delta }) });
      saldos.push({ nome: d.nome, creditado: d.delta, ok: r.ok });
    } else if (d.delta < -0.001) {
      const u = users.find((x: any) => x.id === d.user_id);
      const novo = round2(Math.max(0, (Number(u?.commission_balance) || 0) + d.delta));
      const r = await sb(`app_users?id=eq.${d.user_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_balance: novo }) });
      saldos.push({ nome: d.nome, estornado: d.delta, novo_saldo: novo, ok: r.ok });
    }
  }

  await sb(`catalog_sales?id=eq.${sale.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: relatorio.depois.total_devido }) });

  return { ...relatorio, aplicado: true, saldos };
}

Deno.serve(async (req) => {
  try {
    if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // padrão: NÃO grava

    // contas ativas (uma leitura só, serve pra venda avulsa e pro lote)
    const users = await (await sb('app_users?select=id,full_name,career_levels,referred_by_id,licenciado_context,commission_balance&active=neq.false&limit=3000')).json();
    if (!Array.isArray(users) || !users.length) return Response.json({ error: 'falha ao ler app_users' }, { status: 500 });
    const nomes: Record<string, string> = {};
    users.forEach((u: any) => { nomes[u.id] = u.full_name; });

    // ── MODO LOTE ────────────────────────────────────────────────
    if (body.lote) {
      const desde = body.desde || '2026-07-14';
      const limite = Math.min(Number(body.limite) || 500, 1000);
      // 🛡️ TRAVA ANTI-CONTÁGIO (04/08/2026 — autorizada pelo dono)
      // A consulta filtrava SÓ por status. Resultado: depósito de carteira, crédito de
      // passaporte, frete de vendedor, adesão e plano de expansão entravam no recálculo
      // como se fossem venda de produto — e ganhavam 30% de comissão indevida.
      // REGRA OFICIAL: comissão SÓ em venda confirmada de produto.
      // Aceita: kind='loja' (venda de catálogo) e kind NULL (vendas antigas legítimas,
      // criadas antes da coluna existir). Todo o resto fica FORA.
      const vendasRes = await sb(`catalog_sales?select=*&status=in.(paid,shipped,delivered)&or=(kind.eq.loja,kind.is.null)&created_date=gte.${desde}&order=created_date.asc&limit=${limite}`);
      if (!vendasRes.ok) return Response.json({ error: 'falha ao ler catalog_sales', details: await vendasRes.text() }, { status: 500 });
      const brutas = await vendasRes.json();
      // 🔒 Segunda barreira em código: se algum dia o filtro do banco falhar (coluna
      // renomeada, cache de schema), nada que NÃO seja venda de produto passa daqui.
      const NAO_E_VENDA = ['wallet_deposit', 'commission_deposit', 'passaporte', 'seller_freight', 'adesao', 'seller_adhesion', 'partner_plan'];
      const vendas = (Array.isArray(brutas) ? brutas : []).filter((v: any) => {
        const k = String(v?.kind ?? '').trim().toLowerCase();
        if (NAO_E_VENDA.includes(k)) return false; // depósito/passaporte/frete/adesão/plano
        return k === '' || k === 'loja';           // só venda de produto
      });
      const descartadas = (Array.isArray(brutas) ? brutas.length : 0) - vendas.length;

      const resultados: any[] = [];
      const porPessoa: Record<string, number> = {};
      let totalCreditado = 0, comErro = 0, ajustadas = 0;

      for (const v of vendas) {
        const r = await processarVenda(v, users, nomes, dryRun, true);
        if (r.erro) comErro++;
        const deltas = r.ajustes_de_saldo || [];
        if (!deltas.length) continue; // já estava certa
        ajustadas++;
        for (const d of deltas) {
          porPessoa[d.nome] = round2((porPessoa[d.nome] || 0) + d.delta);
          if (d.delta > 0) totalCreditado = round2(totalCreditado + d.delta);
        }
        resultados.push({
          sale_id: v.id, data: String(v.created_date || '').slice(0, 10),
          produto: String(v.product_title || '').slice(0, 40), valor: round2(Number(v.total_amount)),
          vendedor: r.cadeia?.[0] || '(sem cadeia → empresa)', cadeia_pct: r.cadeia_pct,
          pago: r.antes.total_pago, devido: r.depois.total_devido, rollup_empresa: r.depois.empresa_rollup,
          aplicado: r.aplicado, erro: r.erro || undefined,
        });
      }

      return Response.json({
        success: true, modo: 'lote', dry_run: dryRun,
        filtro: { desde, limite, status: 'paid/shipped/delivered', tipo: "SOMENTE venda de produto (kind='loja' ou nulo)", excluidos: NAO_E_VENDA },
        registros_barrados_pela_trava: descartadas,
        vendas_analisadas: vendas.length, vendas_ajustadas: ajustadas, com_erro: comErro,
        total_creditado: totalCreditado,
        por_pessoa: Object.entries(porPessoa).filter(([, v]) => Math.abs(v) > 0.001).sort((a, b) => b[1] - a[1]).map(([nome, delta]) => ({ nome, delta })),
        vendas: body.resumo ? undefined : resultados,
      });
    }

    // ── MODO VENDA AVULSA ────────────────────────────────────────
    const saleId = body.sale_id || null;
    const orderCode = body.order_code || null;
    if (!saleId && !orderCode) return Response.json({ error: 'informe sale_id, order_code ou lote:true' }, { status: 400 });

    let sale: any = null;
    if (saleId) {
      const r = await (await sb(`catalog_sales?select=*&id=eq.${encodeURIComponent(saleId)}&limit=1`)).json();
      sale = Array.isArray(r) ? r[0] : null;
    }
    if (!sale && orderCode) {
      // o nome da coluna de código já variou entre versões: order_code / codigo / code
      const recentes = await (await sb('catalog_sales?select=*&order=created_date.desc&limit=300')).json();
      if (Array.isArray(recentes)) {
        const alvo = String(orderCode).trim().toUpperCase();
        sale = recentes.find((s: any) => Object.values(s).some((v) => typeof v === 'string' && v.trim().toUpperCase() === alvo)) || null;
      }
    }
    if (!sale) return Response.json({ error: 'venda não encontrada', saleId, orderCode }, { status: 404 });

    const r = await processarVenda(sale, users, nomes, dryRun, !!body.resumo);
    return Response.json({ success: !r.erro, ...r });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});