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

    const { limite_divergencias } = await req.json().catch(() => ({}));
    const LIM = Number(limite_divergencias) || 15;

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