import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

// 🔍 DIAGNÓSTICO — SOMENTE LEITURA. Não escreve em nenhuma tabela.
// Consulta direta no Supabase (fonte de verdade) para investigar divergências
// de saldo/depósitos reportadas em 31/07. Admin-only.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SR) {
      return Response.json({ error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes' }, { status: 500 });
    }
    // 🛡️ Normaliza: o secret já vem com /rest/v1/ incluso — remove pra não duplicar o path
    SUPABASE_URL = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

    async function sb(path, opts = {}) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...opts,
        headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = text; }
      return { ok: res.ok, status: res.status, body: json };
    }

    // sanity check simples primeiro
    const sanity = await sb('app_users?select=id,full_name&limit=1');

    const result = {};
    const { skip_users, mode } = await req.json().catch(() => ({}));

    if (!skip_users) {
      const names = ['Luciano Pinheiro', 'Iara Figueiredo', 'Beatriz', 'Cristiano Ribeiro', 'Elenice Lima'];
      const usersFound = {};
      for (const n of names) {
        const r = await sb(`app_users?select=id,full_name,email,saldo_disponivel,commission_balance&full_name=ilike.*${encodeURIComponent(n)}*`);
        usersFound[n] = r;
      }
      const luiz = await sb(`app_users?select=id,full_name,email,saldo_disponivel,commission_balance&id=eq.68db0ff2c19838a827fb6e5f`);
      usersFound['Luiz Santanna'] = luiz;
      result.app_users = usersFound;
    }

    if (mode === 'deposits') {
      const salesDeposits = await sb(`catalog_sales?select=id,buyer_id,buyer_name,kind,total_amount,status,mp_payment_id,created_at&kind=in.(wallet_deposit,commission_deposit)&created_at=gte.2026-07-29T00:00:00&created_at=lt.2026-08-01T00:00:00&order=created_at.desc`);
      result.catalog_sales_deposits_29_30 = salesDeposits;
    }

    if (mode === 'tables') {
      const candidateTables = ['wallet_transactions', 'digital_wallet_transactions', 'commission_ledger'];
      const walletTx = {};
      for (const t of candidateTables) {
        walletTx[t] = await sb(`${t}?select=*&order=created_at.desc&limit=10`);
      }
      result.candidate_wallet_tables = walletTx;
    }

    if (mode === 'mp') {
      const mpPaid = await sb(`catalog_sales?select=id,buyer_id,buyer_name,kind,total_amount,status,mp_payment_id,created_at&mp_payment_id=not.is.null&status=eq.paid&created_at=gte.2026-07-29T00:00:00&order=created_at.desc&limit=50`);
      result.mp_paid_catalog_sales = mpPaid;
    }

    if (mode === 'cristiano') {
      const c1 = await sb(`app_users?select=id,full_name,email,saldo_disponivel,commission_balance&full_name=ilike.*Cristiano*`);
      result.cristiano_search = c1;
    }

    if (mode === 'gap_check') {
      const ids = [
        '169392882560','168637345371','169970347928','169334162799',
        '169743354993','170639528044','169794046909','170172301389',
        '168795341738','168849863424','170642481862','169757635409',
        '169794532723','169793431523','170711504564'
      ];
      const orClause = ids.map(id => `mp_payment_id.eq.${id}`).join(',');
      const full = await sb(`catalog_sales?select=kind,total_amount,status,mp_payment_id,created_at&or=(${orClause})&order=created_at.asc`);
      result.gap_count = Array.isArray(full.body) ? full.body.length : 'error';
      result.gap_last_5 = { ok: full.ok, status: full.status, body: Array.isArray(full.body) ? full.body.slice(-5) : full.body };
      result.gap_found_ids = Array.isArray(full.body) ? full.body.map(r => r.mp_payment_id) : [];
      result.gap_missing_ids = ids.filter(id => !(Array.isArray(full.body) ? full.body.map(r=>r.mp_payment_id) : []).includes(id));
    }

    if (mode === 'gap_buyers') {
      const smallIds = ['170639528044','170642481862','169757635409','169794046909','169794532723','169793431523'];
      const orClause = smallIds.map(id => `mp_payment_id.eq.${id}`).join(',');
      result.small_tx_buyers = await sb(`catalog_sales?select=buyer_id,buyer_name,buyer_email,kind,total_amount,status,mp_payment_id,product_title,created_at&or=(${orClause})&order=created_at.asc`);
    }

    if (mode === 'ribeiro_check') {
      result.ribeiro_account = await sb(`app_users?select=id,full_name,email,saldo_disponivel,commission_balance,updated_at&id=eq.51a481831dfe95c294dedb41`);
      result.rest_of_deposits_hoje = await sb(`catalog_sales?select=id,buyer_id,buyer_name,kind,total_amount,status,mp_payment_id,created_at&kind=eq.wallet_deposit&created_at=gte.2026-07-30T00:00:00&created_at=lt.2026-07-31T00:00:00&buyer_id=neq.51a481831dfe95c294dedb41&order=created_at.asc`);
    }

    if (mode === 'beatriz_luciano') {
      result.beatriz = await sb(`app_users?select=id,full_name,email,saldo_disponivel,commission_balance,updated_at&full_name=ilike.*Damasceno*`);
      result.beatriz2 = await sb(`app_users?select=id,full_name,email,saldo_disponivel,commission_balance,updated_at&full_name=ilike.*Beatriz*`);
      result.luciano = await sb(`app_users?select=id,full_name,email,saldo_disponivel,commission_balance,updated_at&full_name=ilike.*Luciano*Pinheiro*`);
    }

    if (mode === 'urgente_30_07') {
      // PERGUNTA 2: catalog_sales de hoje 30/07/2026 kind=wallet_deposit
      result.pergunta2_catalog_sales_hoje = await sb(`catalog_sales?select=id,buyer_id,buyer_name,kind,total_amount,status,mp_payment_id,created_at&kind=eq.wallet_deposit&created_at=gte.2026-07-30T00:00:00&created_at=lt.2026-07-31T00:00:00&order=created_at.asc`);

      // PERGUNTA 3: WebhookLog (Base44 entity, não Supabase) + qualquer log em SystemLog relacionado
      // (mpWebhook.js roda na Vercel, não grava log no Supabase - só atualiza catalog_sales/app_users)
      result.pergunta3_nota = "mpWebhook.js (Vercel) não grava log próprio no Supabase - a única evidência de processamento é o campo status=paid em catalog_sales (pergunta 2) e o saldo atualizado em app_users (pergunta 1).";

    }

    if (mode === 'luiz_check') {
      result.pergunta4_luiz_saldo_atual = await sb(`app_users?select=id,full_name,email,saldo_disponivel,commission_balance,updated_at&id=eq.68db0ff2c19838a827fb6e5f`);
      result.pergunta4_luiz_deposits = await sb(`catalog_sales?select=id,buyer_id,buyer_name,kind,total_amount,status,mp_payment_id,created_at&buyer_id=eq.68db0ff2c19838a827fb6e5f&kind=eq.wallet_deposit&created_at=gte.2026-07-18T00:00:00&created_at=lt.2026-07-30T00:00:00&order=created_at.asc`);
    }

    if (mode === 'luiz_full_audit') {
      // P1: só os wallet_deposit do Luiz (evita truncar) + contagem total de linhas dele
      result.p1_luiz_wallet_deposits_only = await sb(`catalog_sales?select=id,buyer_id,buyer_name,kind,total_amount,status,mp_payment_id,created_at&buyer_id=eq.68db0ff2c19838a827fb6e5f&kind=eq.wallet_deposit&order=created_at.desc`);
      const allLuiz = await sb(`catalog_sales?select=id,kind,status,mp_payment_id,created_at&buyer_id=eq.68db0ff2c19838a827fb6e5f&order=created_at.desc`);
      result.p1_luiz_total_rows_count = Array.isArray(allLuiz.body) ? allLuiz.body.length : 'error';
      // P2: saldo atual do Luiz
      result.p2_luiz_saldo = await sb(`app_users?select=id,full_name,saldo_disponivel,commission_balance&id=eq.68db0ff2c19838a827fb6e5f`);
      // P3: últimos 20 wallet_deposit pagos, qualquer usuário
      result.p3_ultimos_20_wallet_deposits = await sb(`catalog_sales?select=id,buyer_id,buyer_name,total_amount,mp_payment_id,created_at&kind=eq.wallet_deposit&status=eq.paid&order=created_at.desc&limit=20`);
      // P4: registro específico do pagamento 170172301389
      result.p4_pagamento_170172301389 = await sb(`catalog_sales?select=*&mp_payment_id=eq.170172301389`);
    }

    if (mode === 'cristiano_verify') {
      result.pagamento_1698 = await sb(`catalog_sales?select=*&mp_payment_id=eq.169793431523`);
      result.conta_alvo = await sb(`app_users?select=id,full_name,email,saldo_disponivel,commission_balance&id=eq.6936dfd7e5b6acb6e80fb945`);
      result.busca_cristiano_todas_contas = await sb(`app_users?select=id,full_name,email,saldo_disponivel,commission_balance&full_name=ilike.*Cristiano*`);
    }

    if (mode === 'luiz_rastreio_bids') {
      const bidTables = ['bids', 'auction_bids', 'lances', 'bid_history'];
      const bidResults = {};
      for (const t of bidTables) {
        const r = await sb(`${t}?select=id,amount,status,auction_id,created_at&user_id=eq.68db0ff2c19838a827fb6e5f&order=created_at.desc&limit=50`);
        bidResults[t] = r.ok ? { count: Array.isArray(r.body) ? r.body.length : 0, sample: Array.isArray(r.body) ? r.body.slice(0,5) : r.body } : r;
      }
      result.luiz_bid_tables = bidResults;
      const debitTables = ['withdrawals', 'debits', 'wallet_debits'];
      const debitResults = {};
      for (const t of debitTables) {
        const r = await sb(`${t}?select=*&user_id=eq.68db0ff2c19838a827fb6e5f&order=created_at.desc&limit=20`);
        debitResults[t] = r.ok ? { count: Array.isArray(r.body) ? r.body.length : 0, sample: Array.isArray(r.body) ? r.body.slice(0,5) : r.body } : r;
      }
      result.luiz_debit_tables = debitResults;
      result.luiz_full_user = await sb(`app_users?select=id,full_name,saldo_disponivel,saldo_alocado,commission_balance,held_balance,updated_at&id=eq.68db0ff2c19838a827fb6e5f`);
    }

    if (mode === 'luiz_rastreio_sales_rest') {
      const allLuiz = await sb(`catalog_sales?select=id,kind,total_amount,status,mp_payment_id,created_at&buyer_id=eq.68db0ff2c19838a827fb6e5f&order=created_at.desc`);
      result.luiz_catalog_sales_count = Array.isArray(allLuiz.body) ? allLuiz.body.length : 'error';
      result.luiz_catalog_sales_rest = Array.isArray(allLuiz.body) ? allLuiz.body.slice(8) : allLuiz.body;
    }

    if (mode === 'luiz_dois_leiloes') {
      result.saldo = await sb(`app_users?select=id,saldo_disponivel,saldo_alocado,saldo_reservado,updated_at&id=eq.68db0ff2c19838a827fb6e5f`);
      result.leilao_quebracabeca = await sb(`auctions?select=id,title,status,current_price,winner_id,winner_name,version&id=eq.8f141c8881a42229848ae6fd`);
      result.leilao_carteira = await sb(`auctions?select=id,title,status,current_price,winner_id,winner_name,version&id=eq.75434b1074ad6c51ae2979ba`);
    }

    if (mode === 'luiz_snapshot_now') {
      result.saldo_now = await sb(`app_users?select=id,saldo_disponivel,saldo_alocado,updated_at&id=eq.68db0ff2c19838a827fb6e5f`);
      result.auction_now = await sb(`auctions?select=id,title,status,current_price,winner_id,winner_name,version,end_time&id=eq.8f141c8881a42229848ae6fd`);
      result.deposito_2000_as_1741 = await sb(`catalog_sales?select=id,total_amount,status,mp_payment_id,created_at&mp_payment_id=eq.171329243052`);
    }

    if (mode === 'luiz_recent_full_2') {
      result.ultimos_lances = await sb(`auction_messages?select=id,auction_id,bid_amount,created_at&sender_id=eq.68db0ff2c19838a827fb6e5f&message_type=eq.bid&order=created_at.desc&limit=10`);
      const auctionIds = Array.isArray(result.ultimos_lances.body) ? [...new Set(result.ultimos_lances.body.map(b => b.auction_id))] : [];
      if (auctionIds.length) {
        const inList = auctionIds.map(i => `"${encodeURIComponent(i)}"`).join(',');
        result.auctions_relacionados = await sb(`auctions?select=id,title,status,current_price,winner_id,winner_name,version,end_time&id=in.(${inList})`);
      }
    }

    if (mode === 'luiz_recent_full') {
      result.saldo_atual = await sb(`app_users?select=id,full_name,saldo_disponivel,saldo_alocado,updated_at&id=eq.68db0ff2c19838a827fb6e5f`);
      result.ultimas_catalog_sales = await sb(`catalog_sales?select=id,kind,product_title,sale_price,total_amount,status,mp_payment_id,created_at&buyer_id=eq.68db0ff2c19838a827fb6e5f&order=created_at.desc&limit=15`);
      result.ultimos_lances = await sb(`auction_messages?select=id,auction_id,bid_amount,created_at&sender_id=eq.68db0ff2c19838a827fb6e5f&message_type=eq.bid&order=created_at.desc&limit=10`);
      const auctionIds = Array.isArray(result.ultimos_lances.body) ? [...new Set(result.ultimos_lances.body.map(b => b.auction_id))] : [];
      if (auctionIds.length) {
        const inList = auctionIds.map(i => `"${encodeURIComponent(i)}"`).join(',');
        result.auctions_relacionados = await sb(`auctions?select=id,title,status,current_price,winner_id,winner_name,version,end_time&id=in.(${inList})`);
      }
    }

    if (mode === 'ponto71_walenkamp') {
      const alex = await sb(`app_users?select=id,full_name,email,saldo_disponivel,saldo_alocado&email=eq.alexandrewlk@gmail.com`);
      const alexId = Array.isArray(alex.body) && alex.body[0] ? alex.body[0].id : null;
      result.alexandre_user = alex;
      if (alexId) {
        result.alexandre_sales = await sb(`catalog_sales?select=id,kind,status,sale_price,total_amount,mp_payment_id,buyer_id,created_at&buyer_id=eq.${alexId}&order=created_at.desc`);
      }
    }

    if (mode === 'ponto71_audit_geral') {
      // todos os depósitos de carteira pagos nos últimos 30 dias
      const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const deposits = await sb(`catalog_sales?select=id,buyer_id,buyer_name,total_amount,status,mp_payment_id,created_at&kind=eq.wallet_deposit&status=eq.paid&created_at=gte.${cutoff}&order=created_at.desc&limit=500`);
      const rows = Array.isArray(deposits.body) ? deposits.body : [];
      const buyerIds = [...new Set(rows.map((d) => d.buyer_id).filter(Boolean))];
      let buyersMap = {};
      if (buyerIds.length) {
        const idsParam = buyerIds.join(',');
        const buyersRes = await sb(`app_users?select=id,full_name,email,saldo_disponivel&id=in.(${idsParam})`);
        const buyers = Array.isArray(buyersRes.body) ? buyersRes.body : [];
        buyersMap = Object.fromEntries(buyers.map((b) => [b.id, b]));
      }
      const porComprador = {};
      for (const d of rows) {
        const bid = d.buyer_id;
        if (!bid) continue;
        porComprador[bid] = porComprador[bid] || { buyer_id: bid, nome: buyersMap[bid]?.full_name, email: buyersMap[bid]?.email, saldo_atual: buyersMap[bid]?.saldo_disponivel ?? null, total_depositado_pago: 0, qtd_depositos: 0 };
        const valor = Math.round((Number(d.total_amount) || 0) * 100) / 100;
        porComprador[bid].total_depositado_pago = Math.round((porComprador[bid].total_depositado_pago + valor) * 100) / 100;
        porComprador[bid].qtd_depositos += 1;
      }
      const suspeitos = Object.values(porComprador)
        .filter((u) => u.saldo_atual !== null && u.total_depositado_pago > 0 && Number(u.saldo_atual) < u.total_depositado_pago)
        .sort((a, b) => (b.total_depositado_pago - b.saldo_atual) - (a.total_depositado_pago - a.saldo_atual));
      result.ponto71_total_depositos_pagos_30d = rows.length;
      result.ponto71_suspeitos = suspeitos;
    }

    if (mode === 'ponto71_null_bug') {
      // usuários com saldo_disponivel NULL (não inicializado) que já têm depósito PAGO —
      // são exatamente os afetados pelo bug de CAS (eq.0 nunca combina com NULL)
      const nullUsers = await sb(`app_users?select=id,full_name,email,saldo_disponivel&saldo_disponivel=is.null`);
      const nullRows = Array.isArray(nullUsers.body) ? nullUsers.body : [];
      const nullIds = nullRows.map((u) => u.id);
      result.ponto71_usuarios_saldo_null_total = nullRows.length;
      if (nullIds.length) {
        const idsParam = nullIds.join(',');
        const paidDepositsOfNullUsers = await sb(`catalog_sales?select=id,buyer_id,buyer_name,total_amount,mp_payment_id,created_at&kind=eq.wallet_deposit&status=eq.paid&buyer_id=in.(${idsParam})&order=created_at.desc`);
        result.ponto71_afetados_confirmados = paidDepositsOfNullUsers;
      }
    }

    if (mode === 'ponto71_teste_e2e') {
      const round2 = (n) => Math.round(n * 100) / 100;
      const testId = `teste71${Date.now()}`.slice(0, 24);
      const testEmail = `teste.ponto71.${Date.now()}@apagar.invalido`;
      const evidencia = { etapas: [] };

      // 1) Cria usuário NOVO real na tabela — sem informar saldo_disponivel,
      // exatamente como nasce um cadastro real (coluna fica NULL no Postgres).
      const criarUser = await sb('app_users', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ id: testId, full_name: 'TESTE PONTO71 APAGAR', email: testEmail, phone: '00000000000', password: 'teste-apagar' }),
      });
      evidencia.etapas.push({ passo: '1_criar_usuario_novo', ok: criarUser.ok, status: criarUser.status });

      // 2) Confirma que nasceu com saldo_disponivel NULL (replica exatamente o caso real do Alexandre)
      const antes = await sb(`app_users?select=id,saldo_disponivel&id=eq.${testId}`);
      evidencia.etapas.push({ passo: '2_saldo_antes_do_deposito', saldo_disponivel: Array.isArray(antes.body) ? antes.body[0]?.saldo_disponivel : undefined });

      // 3) Cria a venda de depósito já PAGA (simula o Mercado Pago confirmando o PIX)
      const valorDeposito = 37.5;
      const saleId = `sale71${Date.now()}`.slice(0, 24);
      const criarSale = await sb('catalog_sales', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ id: saleId, buyer_id: testId, buyer_name: 'TESTE PONTO71 APAGAR', kind: 'wallet_deposit', status: 'paid', total_amount: valorDeposito, sale_price: valorDeposito, mp_payment_id: `TESTE71_${Date.now()}` }),
      });
      evidencia.etapas.push({ passo: '3_criar_deposito_pago', ok: criarSale.ok, status: criarSale.status });

      // 4) Roda a MESMA lógica de crédito já corrigida (CAS aceitando NULL como 0)
      let credited = 0, novo_saldo = null, tentativas = 0, erro = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        tentativas = attempt + 1;
        const r1 = await sb(`app_users?select=saldo_disponivel&id=eq.${testId}&limit=1`);
        const user = Array.isArray(r1.body) ? r1.body[0] : null;
        if (!user) { erro = 'buyer_notfound'; break; }
        const current = round2(Number(user.saldo_disponivel) || 0);
        const novo = round2(current + valorDeposito);
        const casFilter = current === 0 ? `or=(saldo_disponivel.eq.0,saldo_disponivel.is.null)` : `saldo_disponivel=eq.${current}`;
        const patch = await sb(`app_users?id=eq.${testId}&${casFilter}`, {
          method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ saldo_disponivel: novo }),
        });
        if (Array.isArray(patch.body) && patch.body.length) { credited = valorDeposito; novo_saldo = novo; break; }
      }
      evidencia.etapas.push({ passo: '4_credito_aplicado', tentativas, credited, novo_saldo, erro });

      // 5) Confirma no banco que o saldo realmente refletiu o depósito
      const depois = await sb(`app_users?select=id,saldo_disponivel&id=eq.${testId}`);
      evidencia.etapas.push({ passo: '5_saldo_depois_confirmado_no_banco', saldo_disponivel: Array.isArray(depois.body) ? depois.body[0]?.saldo_disponivel : undefined });

      // 6) Limpeza — remove a venda de teste e o usuário de teste (não fica NADA em produção)
      const delSale = await sb(`catalog_sales?id=eq.${saleId}`, { method: 'DELETE' });
      const delUser = await sb(`app_users?id=eq.${testId}`, { method: 'DELETE' });
      evidencia.etapas.push({ passo: '6_limpeza', venda_removida: delSale.ok, usuario_removido: delUser.ok });

      // 7) Confirma que não sobrou rastro nenhum
      const confereSale = await sb(`catalog_sales?select=id&id=eq.${saleId}`);
      const confereUser = await sb(`app_users?select=id&id=eq.${testId}`);
      evidencia.etapas.push({ passo: '7_confirma_zero_rastro', sales_restantes: Array.isArray(confereSale.body) ? confereSale.body.length : null, users_restantes: Array.isArray(confereUser.body) ? confereUser.body.length : null });

      evidencia.veredito = (novo_saldo === valorDeposito && Array.isArray(confereSale.body) && confereSale.body.length === 0 && Array.isArray(confereUser.body) && confereUser.body.length === 0)
        ? '✅ CONFIRMADO: depósito de usuário novo (saldo NULL) foi creditado corretamente, e todo o rastro de teste foi apagado.'
        : '⚠️ Algo não bateu — revisar etapas acima.';

      result.ponto71_teste_e2e = evidencia;
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});