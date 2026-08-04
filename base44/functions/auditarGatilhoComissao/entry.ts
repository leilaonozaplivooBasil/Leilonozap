// auditarGatilhoComissao — AUDITORIA 100% LEITURA do gatilho oficial de comissão.
//
// 📕 REGRA AUDITADA (docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md + ditado do dono 04/08/2026):
//   "Lance é lance. Comissão só existe quando a venda está concretizada."
//   ✅ PAGA: arremate PAGO · venda na loja PAGA · adesão/expansão de plano PAGA
//   ❌ NÃO PAGA: lance · depósito de carteira (passaporte) · frete
//
// ⚠️ ESTA FUNÇÃO NÃO ESCREVE NADA. Só GET no PostgREST. Nenhum POST/PATCH/DELETE.
//    Serve para PROVAR com número, não para corrigir.
//
// Uso: { } → roda todos os testes. { limite_vendas: 20 } ajusta a amostra do teste 2.
// ⚠️ ARMADILHA JÁ REGISTRADA NO PROJETO: o secret SUPABASE_URL pode vir com
// barra final ou já com /rest/v1 — sem normalizar, TODO GET volta 404 PGRST125.
const RAW = Deno.env.get('SUPABASE_URL') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// GET defensivo: tabela/coluna que não existe NÃO derruba a auditoria —
// devolve erro explícito para o relatório poder dizer "NÃO VERIFIQUEI".
async function q(path: string): Promise<{ ok: boolean; rows: any[]; erro?: string }> {
  try {
    const r = await fetch(`${BASE}/rest/v1/${path}`, {
      headers: { apikey: SR!, Authorization: `Bearer ${SR}` },
    });
    const txt = await r.text();
    if (!r.ok) return { ok: false, rows: [], erro: `HTTP ${r.status}: ${txt.slice(0, 200)}` };
    const j = JSON.parse(txt);
    return { ok: true, rows: Array.isArray(j) ? j : [j] };
  } catch (e) {
    return { ok: false, rows: [], erro: String((e as any)?.message || e) };
  }
}

const ATIVO = ['pending', 'confirmed', 'paid'];
const porStatus = (rows: any[]) => {
  const m: Record<string, { n: number; total: number }> = {};
  for (const r of rows) {
    const s = String(r.status || 'sem_status');
    m[s] = m[s] || { n: 0, total: 0 };
    m[s].n++;
    m[s].total = round2(m[s].total + (Number(r.amount) || 0));
  }
  return m;
};

Deno.serve(async (req) => {
  if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
  const body = await req.json().catch(() => ({}));
  const limiteVendas = Math.min(Number(body.limite_vendas) || 20, 100);
  const parte = String(body.parte || 'tudo'); // 'tudo' | '1' | '2' | '34' | '5' | 'panorama'
  const rodar = (p: string) => parte === 'tudo' || parte === p;
  const out: any = { modo: 'LEITURA — nenhuma escrita executada', regra: 'comissão só em venda concretizada' };

  // ══════════════════════════════════════════════════════════
  // TESTE 1 — DEPÓSITO / PASSAPORTE NÃO COMISSIONA
  // ══════════════════════════════════════════════════════════
  if (rodar('1')) {
    const t: any = {};
    // 1a. commission_records com role/sale_type de depósito ou carteira
    const dep = await q('commission_records?select=id,user_id,user_name,role,amount,status,sale_id,sale_type&or=(role.ilike.*deposit*,role.ilike.*wallet*,role.ilike.*passaporte*,sale_type.ilike.*deposit*,sale_type.ilike.*wallet*)&limit=1000');
    if (!dep.ok) t.erro_leitura = dep.erro;
    else {
      const ativos = dep.rows.filter((r) => ATIVO.includes(String(r.status)));
      t.total_registros = dep.rows.length;
      t.por_status = porStatus(dep.rows);
      t.ativos_qtd = ativos.length;
      t.ativos_total_rs = round2(ativos.reduce((s, r) => s + (Number(r.amount) || 0), 0));
      t.ativos_lista = ativos.slice(0, 30).map((r) => ({ quem: r.user_name, role: r.role, valor: r.amount, sale_id: r.sale_id, status: r.status }));
    }
    // 1b. CRUZAMENTO REAL: pega depósitos de carteira e procura comissão pelo id deles
    const depTx = await q('digital_wallet_transactions?select=id,user_id,amount,type,status,related_payment_id&type=eq.deposit&order=created_date.desc&limit=100');
    if (!depTx.ok) t.erro_depositos = depTx.erro;
    else {
      t.depositos_analisados = depTx.rows.length;
      const ids = depTx.rows.map((d) => d.id).filter(Boolean);
      if (ids.length) {
        const lista = ids.map((x) => `"${x}"`).join(',');
        const cr = await q(`commission_records?select=id,user_name,role,amount,status,sale_id&sale_id=in.(${lista})&limit=500`);
        if (!cr.ok) t.erro_cruzamento = cr.erro;
        else {
          t.comissoes_geradas_por_deposito = cr.rows.length;
          t.comissoes_deposito_ativas = cr.rows.filter((r) => ATIVO.includes(String(r.status))).length;
          t.comissoes_deposito_detalhe = cr.rows.slice(0, 20).map((r) => ({ quem: r.user_name, role: r.role, valor: r.amount, status: r.status }));
        }
      }
    }
    out.teste_1_deposito = t;
  }

  // ══════════════════════════════════════════════════════════
  // TESTE 2 — FRETE FORA DA BASE DE COMISSÃO
  // ══════════════════════════════════════════════════════════
  if (rodar('2')) {
    const t: any = {};
    // 2a. existe commission_record ligado a frete?
    const fr = await q('commission_records?select=id,user_name,role,amount,status&or=(role.ilike.*frete*,role.ilike.*freight*,role.ilike.*shipping*)&limit=500');
    if (!fr.ok) t.erro_leitura_frete = fr.erro;
    else {
      t.registros_de_frete = fr.rows.length;
      t.frete_por_status = porStatus(fr.rows);
      t.frete_ativos = fr.rows.filter((r) => ATIVO.includes(String(r.status))).length;
    }
    // 2b. o frete vazou para a BASE de comissão? (compara sale_amount x total_amount x frete)
    const vendas = await q(`catalog_sales?select=id,product_title,total_amount,sale_price,raw_base44,status,created_date&status=in.(paid,shipped,delivered)&order=created_date.desc&limit=${limiteVendas}`);
    if (!vendas.ok) t.erro_leitura_vendas = vendas.erro;
    else {
      const detalhe: any[] = [];
      let vazou = 0, semFrete = 0;
      for (const v of vendas.rows) {
        let raw = v.raw_base44;
        if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = {}; } }
        const frete = round2(Number(raw?.frete?.valor ?? raw?.frete ?? 0));
        const cobrado = round2(Number(raw?.amount_charged ?? 0));
        const produtos = round2(Number(v.total_amount) || 0);
        const cr = await q(`commission_records?select=amount,sale_amount&sale_id=eq.${encodeURIComponent(v.id)}&limit=200`);
        const linhas = cr.ok ? cr.rows : [];
        const somaComissao = round2(linhas.reduce((s, r) => s + (Number(r.amount) || 0), 0));
        // base declarada nos lançamentos: tem que ser SÓ produtos, nunca produtos+frete
        const baseUsada = linhas.length ? round2(Number(linhas[0].sale_amount) || 0) : null;
        const freteVazou = baseUsada !== null && frete > 0 && Math.abs(baseUsada - produtos) > 0.01;
        if (freteVazou) vazou++;
        if (frete === 0) semFrete++;
        detalhe.push({
          venda: v.id, produto: String(v.product_title || '').slice(0, 32),
          produtos, frete, cobrado_total: cobrado,
          base_usada_na_comissao: baseUsada, soma_comissao: somaComissao,
          pct_sobre_produtos: produtos ? round2((somaComissao / produtos) * 100) : null,
          frete_vazou_para_base: freeteFlag(freteVazou),
          tem_lancamento: linhas.length,
        });
      }
      t.vendas_analisadas = vendas.rows.length;
      t.vendas_com_frete_vazando = vazou;
      t.vendas_sem_frete_registrado = semFrete;
      t.detalhe = detalhe;
    }
    out.teste_2_frete = t;
  }

  // ══════════════════════════════════════════════════════════
  // TESTE 3 e 4 — LANCE / ARREMATE SÓ COMISSIONA QUANDO PAGO
  // ══════════════════════════════════════════════════════════
  if (rodar('34')) {
    const t: any = {};
    const cra = await q('commission_records?select=id,sale_id,user_name,role,amount,status,sale_type&sale_type=eq.auction&limit=1000');
    if (!cra.ok) t.erro_leitura = cra.erro;
    else {
      t.comissoes_de_leilao = cra.rows.length;
      const ids = [...new Set(cra.rows.map((r) => r.sale_id).filter(Boolean))];
      t.leiloes_distintos = ids.length;
      if (ids.length) {
        const lista = ids.slice(0, 200).map((x) => `"${x}"`).join(',');
        const au = await q(`auctions?select=id,title,status,order_status,current_price,commissions_distributed&id=in.(${lista})&limit=200`);
        if (!au.ok) t.erro_leiloes = au.erro;
        else {
          const map = Object.fromEntries(au.rows.map((a) => [a.id, a]));
          const naoPagos = cra.rows.filter((r) => {
            const a = map[r.sale_id];
            return a && a.order_status !== 'paid' && a.order_status !== 'delivered' && a.order_status !== 'shipped';
          });
          t.comissoes_em_leilao_NAO_pago = naoPagos.length;
          t.valor_rs_em_leilao_nao_pago = round2(naoPagos.reduce((s, r) => s + (Number(r.amount) || 0), 0));
          t.detalhe_nao_pagos = naoPagos.slice(0, 25).map((r) => ({
            quem: r.user_name, valor: r.amount, status_comissao: r.status,
            leilao: String(map[r.sale_id]?.title || '').slice(0, 32),
            status_leilao: map[r.sale_id]?.status, pagamento: map[r.sale_id]?.order_status,
          }));
        }
      }
    }
    // 4b. leilão marcado como comissão distribuída mas SEM pagamento
    const dist = await q('auctions?select=id,title,status,order_status,current_price,commissions_distributed,winner_name&commissions_distributed=is.true&limit=300');
    if (!dist.ok) t.erro_flag_distribuida = dist.erro;
    else {
      const semPagto = dist.rows.filter((a) => a.order_status !== 'paid' && a.order_status !== 'shipped' && a.order_status !== 'delivered');
      t.flag_distribuida_total = dist.rows.length;
      t.flag_distribuida_SEM_pagamento = semPagto.length;
      t.flag_detalhe = semPagto.slice(0, 25).map((a) => ({ leilao: String(a.title || '').slice(0, 32), preco: a.current_price, status: a.status, pagamento: a.order_status, vencedor: a.winner_name }));
    }
    // 4c. leilões encerrados com vencedor e ainda sem pagamento (universo de risco)
    const trav = await q('auctions?select=id&status=in.(ended,sold)&order_status=eq.awaiting_payment&winner_id=not.is.null&limit=1000');
    t.leiloes_encerrados_aguardando_pagamento = trav.ok ? trav.rows.length : `ERRO: ${trav.erro}`;
    out.teste_3e4_leilao = t;
  }

  // ══════════════════════════════════════════════════════════
  // TESTE 5 — EXPANSÃO / ADESÃO COMISSIONA MESMO? (ausência = defeito)
  // ══════════════════════════════════════════════════════════
  if (rodar('5')) {
    const t: any = {};
    const fontes = [
      { nome: 'catalog_sales kind=adesao', path: 'catalog_sales?select=id,product_title,total_amount,status,kind&kind=not.is.null&status=in.(paid,shipped,delivered)&limit=300' },
      { nome: 'partner_plan_purchases', path: 'partner_plan_purchases?select=*&limit=200' },
      { nome: 'influencer_purchases', path: 'influencer_purchases?select=*&limit=200' },
      { nome: 'mercado_pago_payments adesao', path: 'mercado_pago_payments?select=id,user_id,amount,status,deposit_type&deposit_type=eq.seller_adhesion&limit=200' },
      { nome: 'asaas_payments plano', path: 'asaas_payments?select=id,value,status,partner_plan_code&partner_plan_code=not.is.null&limit=200' },
    ];
    t.fontes = {};
    for (const f of fontes) {
      const r = await q(f.path);
      t.fontes[f.nome] = r.ok ? { encontrados: r.rows.length, amostra: r.rows.slice(0, 5) } : { NAO_VERIFIQUEI: r.erro };
    }
    // quais tipos (kind) existem em catalog_sales — mostra se adesão vira venda comissionável
    const kinds = await q('catalog_sales?select=kind,status&status=in.(paid,shipped,delivered)&limit=1000');
    if (kinds.ok) {
      const m: Record<string, number> = {};
      for (const k of kinds.rows) { const key = String(k.kind || 'sem_kind'); m[key] = (m[key] || 0) + 1; }
      t.tipos_de_venda_paga = m;
    } else t.erro_kinds = kinds.erro;
    out.teste_5_expansao = t;
  }

  // ══════════════════════════════════════════════════════════
  // PANORAMA — o que existe em commission_records por role e status
  // ══════════════════════════════════════════════════════════
  if (rodar('panorama')) {
    const all = await q('commission_records?select=role,status,amount,sale_type&limit=5000');
    if (all.ok) {
      const porRole: Record<string, { n: number; rs: number }> = {};
      const porTipo: Record<string, number> = {};
      const st: Record<string, number> = {};
      for (const r of all.rows) {
        const k = String(r.role || 'sem_role');
        porRole[k] = porRole[k] || { n: 0, rs: 0 };
        porRole[k].n++; porRole[k].rs = round2(porRole[k].rs + (Number(r.amount) || 0));
        porTipo[String(r.sale_type || 'sem_tipo')] = (porTipo[String(r.sale_type || 'sem_tipo')] || 0) + 1;
        st[String(r.status || 'sem_status')] = (st[String(r.status || 'sem_status')] || 0) + 1;
      }
      out.panorama = { total_lancamentos: all.rows.length, por_role: porRole, por_sale_type: porTipo, por_status: st };
    } else out.panorama = { NAO_VERIFIQUEI: all.erro };
  }

  // ══════════════════════════════════════════════════════════
  // TESTE 7 — RISCO DE CONTÁGIO: quantas linhas NÃO-VENDA estão em
  // catalog_sales com status pago? (o motor de recálculo em lote lê
  // catalog_sales SÓ por status — se não filtrar por kind, comissiona
  // depósito e frete.)
  // ══════════════════════════════════════════════════════════
  if (rodar('kinds')) {
    const t: any = {};
    const r = await q('catalog_sales?select=kind,total_amount,status&status=in.(paid,shipped,delivered)&limit=2000');
    if (!r.ok) t.NAO_VERIFIQUEI = r.erro;
    else {
      const m: Record<string, { n: number; rs: number }> = {};
      for (const v of r.rows) {
        const k = String(v.kind || 'sem_kind');
        m[k] = m[k] || { n: 0, rs: 0 };
        m[k].n++; m[k].rs = round2(m[k].rs + (Number(v.total_amount) || 0));
      }
      t.total_vendas_pagas = r.rows.length;
      t.por_kind = m;
      const NAO_VENDA = ['wallet_deposit', 'passaporte', 'frete', 'seller_freight', 'deposit'];
      const risco = Object.entries(m).filter(([k]) => NAO_VENDA.some((x) => k.toLowerCase().includes(x)));
      t.linhas_NAO_VENDA_em_catalog_sales = risco.map(([k, v]) => ({ kind: k, registros: v.n, valor_rs: v.rs }));
      t.valor_exposto_rs = round2(risco.reduce((s, [, v]) => s + v.rs, 0));
      t.comissao_30pct_se_recalculo_rodar = round2(risco.reduce((s, [, v]) => s + v.rs, 0) * 0.30);
    }
    out.teste_7_risco_contagio = t;
  }

  return Response.json(out);
});

function freeteFlag(v: boolean) { return v ? 'SIM — INVESTIGAR' : 'nao'; }