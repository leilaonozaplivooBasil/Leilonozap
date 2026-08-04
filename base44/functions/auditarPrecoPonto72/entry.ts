// 🔍 TEMPORÁRIA — AUDITORIA PONTO 72 (100% LEITURA, ZERO ESCRITA)
// Compara o current_price de cada leilão com o MAIOR lance real registrado
// em auction_messages e classifica as divergências por exposição financeira.
// Nenhum PATCH/POST/DELETE é feito aqui. Apagar após o saneamento.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawUrl = Deno.env.get('SUPABASE_URL') || '';
    const SB = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
    const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!SB || !KEY) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });

    // GET paginado — PostgREST devolve no máximo 1000 linhas por chamada
    const getAll = async (table, query) => {
      const out = [];
      let from = 0;
      const page = 1000;
      while (true) {
        const res = await fetch(`${SB}/rest/v1/${table}?${query}`, {
          headers: {
            apikey: KEY,
            Authorization: `Bearer ${KEY}`,
            Range: `${from}-${from + page - 1}`,
            'Range-Unit': 'items',
          },
        });
        if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
        const rows = await res.json();
        out.push(...rows);
        if (rows.length < page) break;
        from += page;
      }
      return out;
    };

    const num = (v) => (v === null || v === undefined ? 0 : Number(v));
    const cents = (v) => Math.round(num(v) * 100);

    // modo diagnóstico de esquema (leitura de 1 linha por tabela, só pra ver colunas)
    let modoBruto = null;
    try { modoBruto = (req.headers.get('x-modo') || null); } catch (_) { modoBruto = null; }
    const reqBody = await req.clone().json().catch(() => ({}));
    if (reqBody?.modo === 'schema') {
      const amostra = {};
      for (const t of ['asaas_payments', 'payments', 'digital_wallet_transactions', 'wallet_transactions', 'mercadopago_payments', 'mercado_pago_payment', 'digital_wallets', 'wallets', 'auctions']) {
        try {
          const r = await fetch(`${SB}/rest/v1/${t}?select=*&limit=1`, {
            headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'count=exact', Range: '0-0' },
          });
          if (!r.ok) { amostra[t] = `erro ${r.status}`; continue; }
          const rows = await r.json();
          amostra[t] = {
            total: r.headers.get('content-range'),
            colunas: Object.keys(rows[0] || {}),
          };
        } catch (e) { amostra[t] = 'falha: ' + e.message; }
      }
      return Response.json({ ok: true, escrita_realizada: false, colunas: amostra });
    }

    // 1) Leilões
    const auctions = await getAll(
      'auctions',
      'select=id,title,status,lot_status,order_status,current_price,starting_price,increment,buy_now_price,winner_id,winner_name,commissions_distributed,is_investment_plan,is_test_auction,end_time&order=created_date.desc'
    );

    // 2) Maior lance real por leilão
    const bids = await getAll(
      'auction_messages',
      'select=auction_id,bid_amount&message_type=eq.bid&order=auction_id.asc'
    );
    const maiorLance = new Map();
    const qtdLances = new Map();
    for (const b of bids) {
      const id = b.auction_id;
      if (!id) continue;
      qtdLances.set(id, (qtdLances.get(id) || 0) + 1);
      const v = num(b.bid_amount);
      if (v > (maiorLance.get(id) ?? -1)) maiorLance.set(id, v);
    }

    // 3) Vínculos financeiros (para classificar o grupo de risco)
    const comPagamentoAsaas = new Set();
    const comPagamentoMP = new Set();
    const comMovimentoCarteira = new Set();
    const erros = [];
    try {
      const p = await getAll('asaas_payments', 'select=auction_id,status&auction_id=not.is.null');
      for (const r of p) if (r.auction_id) comPagamentoAsaas.add(r.auction_id);
    } catch (e) { erros.push('asaas_payments: ' + e.message); }
    try {
      const p = await getAll('mercado_pago_payments', 'select=auction_id,status&auction_id=not.is.null');
      for (const r of p) if (r.auction_id) comPagamentoMP.add(r.auction_id);
    } catch (e) { erros.push('mercado_pago_payments: ' + e.message); }
    try {
      const t = await getAll(
        'digital_wallet_transactions',
        'select=related_auction_id,type&related_auction_id=not.is.null&type=in.(auction_settlement,auction_refund,auction_payment,refund)'
      );
      for (const r of t) if (r.related_auction_id) comMovimentoCarteira.add(r.related_auction_id);
    } catch (e) { erros.push('digital_wallet_transactions: ' + e.message); }

    // 4) Classificação
    const grupoA = [], grupoB = [], grupoC = [], atencao = [];
    let okCount = 0;
    let distorcaoTotal = 0;

    for (const a of auctions) {
      const topo = maiorLance.has(a.id) ? maiorLance.get(a.id) : null;
      const atual = num(a.current_price);
      const inicial = num(a.starting_price);
      const temLance = topo !== null;

      // referência esperada: maior lance real, ou preço inicial se nunca houve lance
      const esperado = temLance ? topo : inicial;

      if (cents(atual) === cents(esperado)) { okCount++; continue; }

      const pago = comPagamentoAsaas.has(a.id) || comPagamentoMP.has(a.id) || comMovimentoCarteira.has(a.id);
      const comissionado = a.commissions_distributed === true;
      const diff = Number((atual - esperado).toFixed(2));

      const caso = {
        id: a.id,
        titulo: a.title,
        classificacao: cents(atual) > cents(esperado) ? (temLance ? 'INFLADO' : 'SEM LANCE') : 'ATENCAO_INVERSO',
        status: a.status,
        lot_status: a.lot_status,
        order_status: a.order_status,
        current_price: atual,
        maior_lance_real: topo,
        qtd_lances: qtdLances.get(a.id) || 0,
        starting_price: inicial,
        increment: num(a.increment),
        buy_now_price: a.buy_now_price === null || a.buy_now_price === undefined ? null : num(a.buy_now_price),
        valor_esperado: esperado,
        diferenca_em_reais: diff,
        winner_id: a.winner_id || null,
        winner_name: a.winner_name || null,
        commissions_distributed: comissionado,
        tem_pagamento_asaas: comPagamentoAsaas.has(a.id),
        tem_pagamento_mp: comPagamentoMP.has(a.id),
        tem_movimento_carteira: comMovimentoCarteira.has(a.id),
        is_investment_plan: a.is_investment_plan === true,
        is_test_auction: a.is_test_auction === true,
        end_time: a.end_time,
      };

      if (caso.classificacao === 'ATENCAO_INVERSO') { atencao.push(caso); continue; }

      distorcaoTotal += diff;

      if (pago || comissionado) grupoC.push(caso);
      else if (a.status === 'active') grupoA.push(caso);
      else grupoB.push(caso);
    }

    const ordena = (arr) => arr.sort((x, y) => y.diferenca_em_reais - x.diferenca_em_reais);

    // modo compacto: só o essencial, pra caber no relatório de leitura
    let compacto = false;
    let secao = null;
    try {
      const body = await req.json();
      compacto = body?.modo === 'linha' ? 'linha' : body?.modo === 'compacto';
      secao = body?.secao || null;
    } catch (_) { compacto = false; }
    const enxuga = (arr) => ordena(arr).map((c) => ({
      id: c.id,
      titulo: (c.titulo || '').slice(0, 48),
      caso: c.classificacao,
      status: c.status,
      atual: c.current_price,
      esperado: c.valor_esperado,
      lances: c.qtd_lances,
      dif: c.diferenca_em_reais,
      venc: c.winner_name,
      buy_now: c.buy_now_price,
    }));
    const saida = (arr, nome) => {
      if (secao && secao !== nome) return `omitido (peça secao='${nome}')`;
      if (compacto === 'linha' || secao === nome + ':linha') {
        return ordena(arr).map((c) => `${c.id} | ${c.classificacao} | atual ${c.current_price} -> ${c.valor_esperado} | ${(c.titulo || '').slice(0, 30)}`);
      }
      return compacto ? enxuga(arr) : ordena(arr);
    };

    return Response.json({
      ok: true,
      escrita_realizada: false,
      resumo: {
        total_leiloes_auditados: auctions.length,
        total_lances_lidos: bids.length,
        ok: okCount,
        grupo_a_ativo_sem_pagamento: grupoA.length,
        grupo_b_encerrado_sem_pagamento_sem_comissao: grupoB.length,
        grupo_c_com_pagamento_ou_comissao: grupoC.length,
        anomalia_inversa: atencao.length,
        distorcao_total_em_reais: Number(distorcaoTotal.toFixed(2)),
      },
      sem_buy_now_price: auctions.filter((a) => a.buy_now_price === null || a.buy_now_price === undefined || num(a.buy_now_price) === 0).length,
      grupo_a: saida(grupoA, 'grupo_a'),
      grupo_b: saida(grupoB, 'grupo_b'),
      grupo_c: saida(grupoC, 'grupo_c'),
      anomalia_inversa: saida(atencao, 'anomalia_inversa'),
      erros_leitura: erros,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});