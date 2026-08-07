// 🔎 CONCILIAÇÃO DA CARTEIRA DIGITAL — SOMENTE LEITURA (🔴 domínio financeiro)
//
// REGRA ABSOLUTA DESTA FUNÇÃO: só existe requisição GET aqui dentro.
// Nenhum POST / PATCH / DELETE. Se identificar divergência, apenas REPORTA.
//
// Fonte de verdade: Supabase de produção via REST + SUPABASE_SERVICE_ROLE_KEY
// (VERDADE.md §2 — NUNCA base44.asServiceRole.entities, que aponta pro store interno).
//
// PASSO 0 obrigatório: descobrir se as tabelas de carteira têm dado real.
// Existe dualidade de banco registrada (tabelas "casca" vazias da migração) e o
// saldo também vive em app_users.saldo_disponivel/saldo_alocado em vários fluxos.
// Conciliar contra tabela vazia seria falso positivo — então primeiro medimos.
//
// AS 4 CONCILIAÇÕES:
//  1) saldo livre x extrato  2) saldo reservado x lances ativos
//  3) depósitos x gateway    4) liquidações de arremate / devolução de reserva

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const MARCO_ZERO = '2026-08-01';

// 🔒 Único caminho de rede da função: GET. Não existe verbo de escrita neste arquivo.
async function get(path: string, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'GET',
    headers: { apikey: SR!, Authorization: `Bearer ${SR}`, ...extraHeaders },
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = text; }
  return { ok: res.ok, status: res.status, body, contentRange: res.headers.get('content-range') };
}

async function contar(tabela: string) {
  const r = await get(`${tabela}?select=id&limit=1`, { Prefer: 'count=exact' });
  const total = r.contentRange ? Number(r.contentRange.split('/')[1]) : null;
  return { existe: r.ok, status: r.status, total: Number.isFinite(total as number) ? total : null };
}

async function colunas(tabela: string) {
  const r = await get(`${tabela}?select=*&limit=1`);
  return r.ok && Array.isArray(r.body) && r.body[0] ? Object.keys(r.body[0]) : [];
}

const cent = (n: any) => Math.round((Number(n) || 0) * 100) / 100;

// created_date x created_at variam por tabela neste banco — descobrimos, não adivinhamos.
function campoData(cols: string[]) {
  if (cols.includes('created_date')) return 'created_date';
  if (cols.includes('created_at')) return 'created_at';
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden: admin apenas' }, { status: 403 });
    }
    if (!SUPABASE_URL || !SR) {
      return Response.json({ error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes' }, { status: 500 });
    }

    const { limite_divergencias, modo } = await req.json().catch(() => ({}));
    const LIM = Number(limite_divergencias) || 15;

    // ══════════ MODO DESCOBRIR — mapear ONDE o dinheiro realmente mora ══════════
    // Roda ANTES de qualquer conta. Em banco com dualidade, assumir a fonte errada
    // é exactly como nasce um relatório falso. Só GET, só contagem e amostra.
    if (modo === 'descobrir') {
      const candidatas = [
        'digital_wallets', 'digital_wallet_transactions', 'wallets', 'wallet_transactions',
        'mercado_pago_payments', 'mercadopago_payments', 'mp_payments', 'payments',
        'asaas_payments', 'catalog_sales', 'commission_records', 'withdrawal_requests',
        'balance_transfers', 'auction_messages',
      ];
      const mapa: Record<string, any> = {};
      for (const t of candidatas) {
        const c = await contar(t);
        mapa[t] = c.existe ? { total: c.total, colunas: c.total ? await colunas(t) : [] } : { inexistente: true, status: c.status };
      }

      // app_users: onde o saldo aparenta viver de fato
      const colsUsers = await colunas('app_users');
      const camposSaldo = colsUsers.filter((c) => /saldo|balance|held|commission/i.test(c));
      const uRes = await get(`app_users?select=${['id', 'email', ...camposSaldo].join(',')}&limit=100`);
      const users = Array.isArray(uRes.body) ? uRes.body : [];
      const somaCampos: Record<string, number> = {};
      const contasComValor: Record<string, number> = {};
      for (const campo of camposSaldo) {
        somaCampos[campo] = cent(users.reduce((s: number, u: any) => s + (Number(u[campo]) || 0), 0));
        contasComValor[campo] = users.filter((u: any) => Number(u[campo]) > 0).length;
      }

      // catalog_sales: quais "kind" existem (é lá que o depósito parece ser registrado)
      const csCols = await colunas('catalog_sales');
      let kinds: Record<string, number> = {};
      if (csCols.includes('kind')) {
        const r = await get('catalog_sales?select=kind,status&limit=2000');
        for (const row of (Array.isArray(r.body) ? r.body : [])) {
          const k = `${row.kind || 'null'} / ${row.status || 'null'}`;
          kinds[k] = (kinds[k] || 0) + 1;
        }
      }

      if (modo === 'descobrir' && limite_divergencias === 'so_saldos') {
        return Response.json({
          modo: 'DESCOBRIR (só saldos) — somente leitura',
          app_users: { campos_de_dinheiro: camposSaldo, soma_por_campo: somaCampos, contas_com_valor_maior_que_zero: contasComValor, amostra_lida: users.length },
          catalog_sales_kind_status: kinds,
        });
      }

      return Response.json({
        modo: 'DESCOBRIR — somente leitura, nenhuma conciliação, nada gravado',
        tabelas: mapa,
        app_users: { campos_de_dinheiro: camposSaldo, soma_por_campo: somaCampos, contas_com_valor_maior_que_zero: contasComValor, amostra_lida: users.length },
        catalog_sales_kind_status: kinds,
      });
    }

    // ══════════ MODO RESERVADO — CONCILIAÇÃO 2 contra a FONTE REAL ══════════
    // A fonte oficial (digital_wallets.held_balance) está vazia. A reserva em uso
    // vive em app_users.saldo_reservado. Aqui provamos se ela tem lastro em lance ativo.
    // ⚠️ winner_id em leilão ATIVO = LÍDER ATUAL, nunca vencedor (VERDADE.md).
    if (modo === 'reservado') {
      const colsU = await colunas('app_users');
      const temReservado = colsU.includes('saldo_reservado');
      const temAlocado = colsU.includes('saldo_alocado');
      if (!temReservado) {
        return Response.json({ veredito: '⛔ NÃO VERIFICADO — coluna app_users.saldo_reservado não existe', colunas: colsU });
      }

      const selU = ['id', 'email', 'full_name', 'saldo_disponivel', 'saldo_reservado', temAlocado ? 'saldo_alocado' : null].filter(Boolean).join(',');
      const uAll = await get(`app_users?select=${selU}&limit=500`);
      const todos = Array.isArray(uAll.body) ? uAll.body : [];
      const contas = todos.filter((u: any) => Number(u.saldo_reservado) > 0);

      const colsA = await colunas('auctions');
      const selA = ['id', 'title', 'status', 'end_time', 'winner_id', 'current_price',
        colsA.includes('lot_status') ? 'lot_status' : null,
        colsA.includes('order_status') ? 'order_status' : null,
        colsA.includes('frete_reservado_valor') ? 'frete_reservado_valor' : null,
      ].filter(Boolean).join(',');
      const aRes = await get(`auctions?select=${selA}&limit=3000`);
      const leiloes = Array.isArray(aRes.body) ? aRes.body : [];

      const agora = Date.now();
      const ehAtivo = (a: any) => {
        if (String(a.status) !== 'active') return false;
        const t = a.end_time ? Date.parse(a.end_time) : NaN;
        return Number.isFinite(t) ? t > agora : true;
      };
      const ativos = leiloes.filter(ehAtivo);

      const linhas = contas.map((u: any) => {
        const lidera = ativos.filter((a: any) => a.winner_id === u.id);
        const esperado = cent(lidera.reduce((s: number, a: any) =>
          s + (Number(a.current_price) || 0) + (Number(a.frete_reservado_valor) || 0), 0));
        const reservado = cent(u.saldo_reservado);
        const dif = cent(reservado - esperado);
        let classificacao: string;
        if (Math.abs(dif) < 0.01) classificacao = '✅ COM LASTRO';
        else if (lidera.length === 0) classificacao = '🔴 TRAVADO (não lidera nenhum leilão ativo)';
        else if (dif > 0) classificacao = '🟡 DIVERGENTE (reservado acima do lance)';
        else classificacao = '🟠 SUBRESERVADO (reservado abaixo do lance)';
        return {
          email: u.email, nome: u.full_name, reservado, esperado, diferenca: dif,
          saldo_disponivel: cent(u.saldo_disponivel),
          leiloes_ativos_liderados: lidera.length,
          detalhe_leiloes: lidera.map((a: any) => ({ id: a.id, titulo: a.title, lance: cent(a.current_price), frete: cent(a.frete_reservado_valor), fim: a.end_time })),
          classificacao,
        };
      });

      const soma = (f: (l: any) => boolean) => cent(linhas.filter(f).reduce((s, l) => s + l.reservado, 0));
      const travado = soma((l) => l.classificacao.startsWith('🔴'));

      // PASSO 5 — campo órfão
      const comAlocado = temAlocado ? todos.filter((u: any) => Number(u.saldo_alocado) > 0) : [];

      // PASSO 6 — grafia dupla de cancelado
      const csR = await get('catalog_sales?select=status&limit=2000');
      const csRows = Array.isArray(csR.body) ? csR.body : [];
      const grafia = {
        cancelled_ingles: csRows.filter((r: any) => r.status === 'cancelled').length,
        canceled_americano: csRows.filter((r: any) => r.status === 'canceled').length,
      };
      const grafiaLeilao = {
        cancelled_ingles: leiloes.filter((a: any) => a.status === 'cancelled' || a.lot_status === 'cancelled').length,
        canceled_americano: leiloes.filter((a: any) => a.status === 'canceled' || a.lot_status === 'cancelado').length,
      };

      return Response.json({
        escrita_realizada: 'NENHUMA — somente GET. Nenhum saldo devolvido, liberado ou movido.',
        fonte_usada: 'app_users.saldo_reservado x auctions (digital_wallets está vazia)',
        volumes: { contas_lidas: todos.length, contas_com_reserva: contas.length, leiloes_lidos: leiloes.length, leiloes_ativos: ativos.length },
        totais: {
          soma_reservada: cent(linhas.reduce((s, l) => s + l.reservado, 0)),
          soma_com_lastro: soma((l) => l.classificacao.startsWith('✅')),
          soma_travada_exposicao_real: travado,
          soma_divergente: soma((l) => l.classificacao.startsWith('🟡')),
          soma_subreservada: soma((l) => l.classificacao.startsWith('🟠')),
        },
        por_conta: linhas
          .sort((a, b) => b.reservado - a.reservado)
          .map((l) => (limite_divergencias === 'resumo' ? { ...l, detalhe_leiloes: `${l.detalhe_leiloes.length} leilão(ões)` } : l))
          .filter(() => limite_divergencias !== 'so_meta'),
        campo_orfao: {
          coluna_saldo_alocado_existe: temAlocado,
          contas_com_saldo_alocado_maior_que_zero: comAlocado.length,
          soma_saldo_alocado: cent(comAlocado.reduce((s: number, u: any) => s + (Number(u.saldo_alocado) || 0), 0)),
          nota: 'A gravação usa saldo_reservado; o schema oficial documenta saldo_alocado como "capital travado em lances ativos". Divergência apenas REPORTADA, não corrigida.',
        },
        grafia_dupla_cancelado: { catalog_sales: grafia, auctions: grafiaLeilao },
      });
    }

    // ══════════ MODO LANCES — ETAPA 4 da investigação (somente leitura) ══════════
    // Para os leilões liderados pelas contas subreservadas, lê TODOS os lances e
    // compara com o reservado. Prova/derruba a hipótese "reserva não acompanha o lance".
    if (modo === 'lances') {
      const emails = (limite_divergencias === 'luiz' || limite_divergencias === 'luiz_resumo')
        ? ['luizsantanna@tttcorporate.com']
        : limite_divergencias === 'alex'
          ? ['alexandrewlk@gmail.com']
          : ['luizsantanna@tttcorporate.com', 'alexandrewlk@gmail.com'];
      const uRes = await get(`app_users?select=id,email,saldo_disponivel,saldo_reservado&email=in.(${emails.join(',')})`);
      const users = Array.isArray(uRes.body) ? uRes.body : [];

      const aRes = await get('auctions?select=id,title,status,end_time,winner_id,current_price,starting_price,increment,frete_reservado_valor&status=eq.active&limit=3000');
      const ativos = (Array.isArray(aRes.body) ? aRes.body : []).filter((a: any) => {
        const t = a.end_time ? Date.parse(a.end_time) : NaN;
        return Number.isFinite(t) ? t > Date.now() : true;
      });

      const saida: any[] = [];
      for (const u of users) {
        const lidera = ativos.filter((a: any) => a.winner_id === u.id);
        const detalhe: any[] = [];
        for (const a of lidera) {
          const mRes = await get(`auction_messages?select=sender_id,sender_name,bid_amount,frete_amount,timestamp,created_date&auction_id=eq.${encodeURIComponent(a.id)}&message_type=eq.bid&limit=500`);
          const lances = Array.isArray(mRes.body) ? mRes.body : [];
          const meus = lances.filter((m: any) => m.sender_id === u.id);
          detalhe.push({
            auction_id: a.id, titulo: a.title,
            preco_atual: cent(a.current_price), inicial: cent(a.starting_price), incremento: cent(a.increment),
            frete_no_leilao: cent(a.frete_reservado_valor),
            total_lances_no_leilao: lances.length,
            meus_lances: meus.length,
            soma_meus_lances: cent(meus.reduce((s: number, m: any) => s + (Number(m.bid_amount) || 0), 0)),
            soma_meus_fretes: cent(meus.reduce((s: number, m: any) => s + (Number(m.frete_amount) || 0), 0)),
            meu_ultimo_lance: meus.length ? cent(meus[meus.length - 1].bid_amount) : null,
            ...(limite_divergencias === 'resumo' || limite_divergencias === 'luiz_resumo' ? {} : {
              meus_valores: meus.map((m: any) => ({ v: cent(m.bid_amount), frete: cent(m.frete_amount), quando: m.timestamp || m.created_date })),
              outros_lances: lances.filter((m: any) => m.sender_id !== u.id).map((m: any) => ({ quem: m.sender_name, v: cent(m.bid_amount), frete: cent(m.frete_amount), quando: m.timestamp || m.created_date })),
            }),
          });
        }
        const esperado = cent(detalhe.reduce((s, d) => s + d.preco_atual + d.frete_no_leilao, 0));
        const esperadoSemFrete = cent(detalhe.reduce((s, d) => s + d.preco_atual, 0));
        saida.push({
          email: u.email, reservado: cent(u.saldo_reservado), disponivel: cent(u.saldo_disponivel),
          esperado_com_frete: esperado, esperado_sem_frete: esperadoSemFrete,
          dif_com_frete: cent(u.saldo_reservado - esperado),
          dif_sem_frete: cent(u.saldo_reservado - esperadoSemFrete),
          soma_fretes_dos_leiloes: cent(detalhe.reduce((s, d) => s + d.frete_no_leilao, 0)),
          leiloes: detalhe,
        });
      }
      return Response.json({ escrita_realizada: 'NENHUMA — somente GET', contas: saida });
    }

    // ══════════ PASSO 0 — a fonte tem dado real? ══════════
    const inventario: Record<string, any> = {};
    for (const t of ['digital_wallets', 'digital_wallet_transactions', 'mercado_pago_payments', 'auctions', 'app_users']) {
      inventario[t] = await contar(t);
    }

    const colsWallet = await colunas('digital_wallets');
    const colsTx = await colunas('digital_wallet_transactions');
    const colsMp = await colunas('mercado_pago_payments');
    const colsAuction = await colunas('auctions');

    const dataTx = campoData(colsTx);
    const dataMp = campoData(colsMp);

    const fonteVazia = !inventario.digital_wallets.total || !inventario.digital_wallet_transactions.total;
    if (fonteVazia) {
      return Response.json({
        veredito: '⚠️ NÃO FOI POSSÍVEL CONCILIAR — tabela de carteira sem dado suficiente. Ver inventario.',
        inventario,
        colunas_encontradas: { digital_wallets: colsWallet, digital_wallet_transactions: colsTx },
        nota: 'Confirma a dualidade de banco: o saldo em uso pode estar em app_users.saldo_disponivel/saldo_alocado. Nada foi gravado.',
      });
    }

    // ══════════ Leitura dos dados ══════════
    const wRes = await get('digital_wallets?select=user_id,balance,held_balance&limit=2000');
    const carteiras = Array.isArray(wRes.body) ? wRes.body : [];

    const txSel = ['user_id', 'type', 'direction', 'amount', 'status', 'related_auction_id', dataTx].filter(Boolean).join(',');
    const txRes = await get(`digital_wallet_transactions?select=${txSel}&limit=5000`);
    const transacoes = Array.isArray(txRes.body) ? txRes.body : [];

    const mpSel = ['user_id', 'amount', 'status', 'deposit_type', 'payment_id', dataMp].filter(Boolean).join(',');
    const mpRes = await get(`mercado_pago_payments?select=${mpSel}&status=eq.approved&limit=3000`);
    const pagamentos = Array.isArray(mpRes.body) ? mpRes.body : [];

    const aucSel = ['id', 'title', 'status', 'order_status', 'winner_id', 'current_price',
      colsAuction.includes('frete_reservado_valor') ? 'frete_reservado_valor' : null].filter(Boolean).join(',');
    const aucRes = await get(`auctions?select=${aucSel}&limit=3000`);
    const leiloes = Array.isArray(aucRes.body) ? aucRes.body : [];

    const dentroDoMarco = (r: any) => {
      if (!dataTx) return true;
      const d = String(r[dataTx] || '');
      return d >= MARCO_ZERO;
    };
    const confirmada = (s: string) => ['confirmed', 'settled', 'released', 'refunded'].includes(String(s));

    // ══════════ 1) SALDO LIVRE x EXTRATO ══════════
    const porUsuario: Record<string, any[]> = {};
    for (const t of transacoes) {
      porUsuario[t.user_id] = porUsuario[t.user_id] || [];
      porUsuario[t.user_id].push(t);
    }

    const c1_divergentes: any[] = [];
    let c1_ok = 0;
    for (const w of carteiras) {
      const lista = (porUsuario[w.user_id] || []).filter((t) => confirmada(t.status));
      const noMarco = lista.filter(dentroDoMarco);
      const anteriores = lista.filter((t) => !dentroDoMarco(t));
      const mov = (arr: any[]) => cent(arr.reduce((s, t) => s + (t.direction === 'credit' ? 1 : -1) * (Number(t.amount) || 0), 0));
      const abertura = mov(anteriores);      // saldo herdado de antes do Marco Zero
      const calculado = cent(abertura + mov(noMarco));
      const noBanco = cent(w.balance);
      const dif = cent(calculado - noBanco);
      if (Math.abs(dif) < 0.01) { c1_ok++; continue; }
      c1_divergentes.push({
        user_id: w.user_id, saldo_no_banco: noBanco, saldo_calculado: calculado,
        diferenca: dif, saldo_abertura_pre_marco: abertura, lancamentos: lista.length,
      });
    }

    // ══════════ 2) SALDO RESERVADO x LANCES ATIVOS ══════════
    const reservaEsperada: Record<string, number> = {};
    for (const a of leiloes) {
      if (a.status !== 'active' || !a.winner_id) continue;
      const v = cent((Number(a.current_price) || 0) + (Number(a.frete_reservado_valor) || 0));
      reservaEsperada[a.winner_id] = cent((reservaEsperada[a.winner_id] || 0) + v);
    }
    const c2_divergentes: any[] = [];
    let c2_ok = 0;
    for (const w of carteiras) {
      const esperado = cent(reservaEsperada[w.user_id] || 0);
      const noBanco = cent(w.held_balance);
      const dif = cent(noBanco - esperado);
      if (Math.abs(dif) < 0.01) { c2_ok++; continue; }
      c2_divergentes.push({
        user_id: w.user_id, held_balance_no_banco: noBanco, esperado_por_lances_ativos: esperado,
        diferenca: dif,
        tipo: dif > 0 ? 'RESERVA_ORFA (travado sem lance ativo)' : 'RESERVA_FALTANTE (lidera sem estar travado)',
      });
    }

    // ══════════ 3) DEPÓSITOS x GATEWAY ══════════
    const depositosCarteira = transacoes.filter((t) => t.type === 'deposit' && t.direction === 'credit' && confirmada(t.status) && dentroDoMarco(t));
    const gatewayCarteira = pagamentos.filter((p) => p.deposit_type === 'digital_wallet' && (!dataMp || String(p[dataMp] || '') >= MARCO_ZERO));

    const somaPorUser = (arr: any[]) => {
      const m: Record<string, number> = {};
      for (const r of arr) m[r.user_id] = cent((m[r.user_id] || 0) + (Number(r.amount) || 0));
      return m;
    };
    const credMap = somaPorUser(depositosCarteira);
    const gwMap = somaPorUser(gatewayCarteira);
    const usuariosDep = [...new Set([...Object.keys(credMap), ...Object.keys(gwMap)])];

    const c3_divergentes: any[] = [];
    let c3_ok = 0;
    for (const uid of usuariosDep) {
      const cred = cent(credMap[uid] || 0);
      const gw = cent(gwMap[uid] || 0);
      const dif = cent(cred - gw);
      if (Math.abs(dif) < 0.01) { c3_ok++; continue; }
      c3_divergentes.push({
        user_id: uid, creditado_na_carteira: cred, aprovado_no_gateway: gw, diferenca: dif,
        tipo: dif > 0 ? 'CREDITO_SEM_PAGAMENTO_APROVADO' : 'PAGAMENTO_APROVADO_SEM_CREDITO',
      });
    }

    // ══════════ 4) LIQUIDAÇÕES DE ARREMATE / DEVOLUÇÃO DE RESERVA ══════════
    const liquidacoes = new Set(
      transacoes
        .filter((t) => ['auction_settlement', 'auction_payment'].includes(t.type) && confirmada(t.status))
        .map((t) => t.related_auction_id)
        .filter(Boolean)
    );
    const pagosSemBaixa = leiloes
      .filter((a) => a.order_status === 'paid' && !liquidacoes.has(a.id))
      .map((a) => ({ auction_id: a.id, titulo: a.title, valor: cent(a.current_price), vencedor: a.winner_id }));

    // reserva presa: leilão encerrado, usuário travado e sem devolução/liquidação registrada
    const saldoPorLeilaoUsuario: Record<string, number> = {};
    for (const t of transacoes) {
      if (!t.related_auction_id) continue;
      if (!['bid_hold', 'bid_release', 'auction_settlement', 'auction_refund', 'auction_payment'].includes(t.type)) continue;
      const k = `${t.user_id}|${t.related_auction_id}`;
      saldoPorLeilaoUsuario[k] = cent((saldoPorLeilaoUsuario[k] || 0) + (t.direction === 'debit' ? -1 : 1) * (Number(t.amount) || 0));
    }
    const ativos = new Set(leiloes.filter((a) => a.status === 'active').map((a) => a.id));
    const reservaPresa: any[] = [];
    for (const k of Object.keys(saldoPorLeilaoUsuario)) {
      const [uid, aid] = k.split('|');
      const net = saldoPorLeilaoUsuario[k];
      if (net < -0.009 && !ativos.has(aid)) {
        reservaPresa.push({ user_id: uid, auction_id: aid, valor_ainda_travado: cent(Math.abs(net)) });
      }
    }

    const veredito = (n: number) => (n === 0 ? '✅ FECHADO' : `❌ DIVERGENTE (${n})`);

    return Response.json({
      escrita_realizada: 'NENHUMA — função somente leitura (apenas GET)',
      corte_marco_zero: MARCO_ZERO,
      inventario,
      colunas_detectadas: {
        digital_wallets: colsWallet, digital_wallet_transactions: colsTx,
        mercado_pago_payments: colsMp, campo_data_transacoes: dataTx, campo_data_gateway: dataMp,
      },
      volumes_lidos: {
        carteiras: carteiras.length, transacoes: transacoes.length,
        pagamentos_aprovados: pagamentos.length, leiloes: leiloes.length,
      },
      conciliacao_1_saldo_livre_x_extrato: {
        veredito: veredito(c1_divergentes.length),
        contas_ok: c1_ok, contas_divergentes: c1_divergentes.length,
        soma_diferencas: cent(c1_divergentes.reduce((s, r) => s + r.diferenca, 0)),
        amostra: c1_divergentes.sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca)).slice(0, LIM),
      },
      conciliacao_2_reservado_x_lances_ativos: {
        veredito: veredito(c2_divergentes.length),
        contas_ok: c2_ok, contas_divergentes: c2_divergentes.length,
        soma_diferencas: cent(c2_divergentes.reduce((s, r) => s + r.diferenca, 0)),
        amostra: c2_divergentes.sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca)).slice(0, LIM),
      },
      conciliacao_3_depositos_x_gateway: {
        veredito: veredito(c3_divergentes.length),
        usuarios_ok: c3_ok, usuarios_divergentes: c3_divergentes.length,
        total_creditado_carteira: cent(Object.values(credMap).reduce((s: number, v: any) => s + v, 0)),
        total_aprovado_gateway: cent(Object.values(gwMap).reduce((s: number, v: any) => s + v, 0)),
        amostra: c3_divergentes.sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca)).slice(0, LIM),
      },
      conciliacao_4_liquidacoes_arremate: {
        veredito: veredito(pagosSemBaixa.length + reservaPresa.length),
        arremates_pagos_sem_baixa: pagosSemBaixa.length,
        amostra_pagos_sem_baixa: pagosSemBaixa.slice(0, LIM),
        reservas_presas_em_leilao_encerrado: reservaPresa.length,
        valor_total_preso: cent(reservaPresa.reduce((s, r) => s + r.valor_ainda_travado, 0)),
        amostra_reservas_presas: reservaPresa.sort((a, b) => b.valor_ainda_travado - a.valor_ainda_travado).slice(0, LIM),
      },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});