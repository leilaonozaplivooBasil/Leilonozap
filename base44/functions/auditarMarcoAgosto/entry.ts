// ─────────────────────────────────────────────
// FUNÇÃO: auditarMarcoAgosto
// O QUE FAZ: mostra, mês a mês, QUANDO entrou dinheiro REAL (Mercado Pago /
//            Stripe) e QUANDO as comissões foram geradas — insumo para decidir
//            o marco oficial ("pré-lançamento começou em agosto/2026").
// USADO POR: auditoria interna (decisão do dono, 04/08/2026)
// ÚLTIMA MUDANÇA: 04/08/2026
// ─────────────────────────────────────────────
//
// 🛡️ 100% LEITURA. Só GET. Nenhum POST/PATCH/DELETE/RPC neste arquivo.
// 📕 Documento soberano: docs/VERDADE.md
//
// ⚠️ COLUNAS REAIS CONFERIDAS ANTES DE ESCREVER (lição da armadilha 42703):
//    catalog_sales NÃO tem payment_confirmed_date. O que existe:
//      • mp_payment_id / stripe_payment_intent → prova de dinheiro REAL
//      • created_date → quando a venda nasceu
//      • updated_at → última mexida (aproximação da confirmação, NÃO é prova)
//    commission_records tem is_sample (marcador de dado de amostra/teste).

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const mes = (d: any) => (d ? String(d).slice(0, 7) : '(sem data)');
const soma = (rows: any[], c: string) => r2(rows.reduce((s: number, x: any) => s + (Number(x[c]) || 0), 0));

async function get(path: string) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method: 'GET',
    headers: { apikey: SR, Authorization: `Bearer ${SR}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 140)}`);
  return await res.json();
}

// Lê a tabela INTEIRA em páginas — commission_records tem ~10 mil linhas e uma
// leitura única de 5.000 mentiria por omissão.
async function tudo(tabela: string, select: string) {
  const out: any[] = [];
  const passo = 1000;
  for (let off = 0; off < 60000; off += passo) {
    const pag = await get(`${tabela}?select=${select}&order=id.asc&limit=${passo}&offset=${off}`);
    out.push(...pag);
    if (!Array.isArray(pag) || pag.length < passo) break;
  }
  return out;
}

function porMes(rows: any[], campoData: string, campoValor: string) {
  const m: Record<string, { qtd: number; valor: number }> = {};
  for (const r of rows) {
    const k = mes(r[campoData]);
    m[k] = m[k] || { qtd: 0, valor: 0 };
    m[k].qtd++;
    m[k].valor = r2(m[k].valor + (Number(r[campoValor]) || 0));
  }
  return Object.entries(m)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([mes, v]) => ({ mes, qtd: v.qtd, valor_total: v.valor }));
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const secao = String(body.secao || '').toUpperCase();
    if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });

    const out: any = {
      gerado_em: new Date().toISOString(),
      natureza: '100% LEITURA — nada foi apagado nem alterado',
      aviso_metodo:
        'Não existe coluna de data de confirmação de pagamento. "Dinheiro real" aqui = venda com mp_payment_id ou stripe_payment_intent preenchido. A data usada é created_date (nascimento da venda).',
    };

    // ── 1) VENDAS ──
    const vendas = await tudo(
      'catalog_sales',
      'id,kind,status,total_amount,created_date,updated_at,mp_payment_id,stripe_payment_intent,stripe_session_id,payment_method,commission_total'
    );
    const temDinheiroReal = (v: any) => Boolean(v.mp_payment_id || v.stripe_payment_intent || v.stripe_session_id);
    const estaPaga = (v: any) => ['paid', 'shipped', 'delivered'].includes(String(v.status || '').toLowerCase());

    const pagas = vendas.filter(estaPaga);
    const reais = vendas.filter(temDinheiroReal);
    const reaisPagas = vendas.filter((v: any) => temDinheiroReal(v) && estaPaga(v));

    out.vendas = {
      total: vendas.length,
      pagas: pagas.length,
      com_dinheiro_real: reais.length,
      pagas_com_dinheiro_real: reaisPagas.length,
      pagas_SEM_dinheiro_real: pagas.length - reaisPagas.length,
      por_mes_TODAS: porMes(vendas, 'created_date', 'total_amount'),
      por_mes_PAGAS: porMes(pagas, 'created_date', 'total_amount'),
      por_mes_DINHEIRO_REAL_PAGAS: porMes(reaisPagas, 'created_date', 'total_amount'),
    };

    // Quebra por tipo dentro de cada mês, só dinheiro real pago
    const mt: Record<string, Record<string, { qtd: number; valor: number }>> = {};
    for (const v of reaisPagas) {
      const k = mes(v.created_date);
      const t = String(v.kind ?? '(nulo)');
      mt[k] = mt[k] || {};
      mt[k][t] = mt[k][t] || { qtd: 0, valor: 0 };
      mt[k][t].qtd++;
      mt[k][t].valor = r2(mt[k][t].valor + (Number(v.total_amount) || 0));
    }
    out.vendas.DINHEIRO_REAL_por_mes_e_tipo = Object.entries(mt)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([m, tipos]) => ({
        mes: m,
        tipos: Object.entries(tipos).sort((a, b) => b[1].valor - a[1].valor).map(([kind, v]) => ({ kind, qtd: v.qtd, valor: v.valor })),
      }));

    // ── 2) COMISSÕES ──
    const com = await tudo('commission_records', 'id,sale_id,user_id,role,amount,status,created_date,is_sample,sale_type');
    out.comissoes = {
      total: com.length,
      por_mes: porMes(com, 'created_date', 'amount'),
      marcadas_is_sample: (() => {
        const s = com.filter((c: any) => c.is_sample === true);
        return { qtd: s.length, valor: soma(s, 'amount'), por_mes: porMes(s, 'created_date', 'amount') };
      })(),
      por_sale_type: (() => {
        const m: Record<string, { qtd: number; valor: number }> = {};
        for (const c of com) {
          const k = String(c.sale_type ?? '(nulo)');
          m[k] = m[k] || { qtd: 0, valor: 0 };
          m[k].qtd++;
          m[k].valor = r2(m[k].valor + (Number(c.amount) || 0));
        }
        return Object.entries(m).map(([sale_type, v]) => ({ sale_type, ...v }));
      })(),
    };

    // Cada comissão veio de uma venda com dinheiro real?
    const idsReais = new Set(reaisPagas.map((v: any) => v.id));
    const idsVendas = new Set(vendas.map((v: any) => v.id));
    const comReal = com.filter((c: any) => idsReais.has(c.sale_id));
    const comSemReal = com.filter((c: any) => idsVendas.has(c.sale_id) && !idsReais.has(c.sale_id));
    const comForaDaLoja = com.filter((c: any) => !idsVendas.has(c.sale_id));
    out.comissoes.origem = {
      de_venda_com_DINHEIRO_REAL: { qtd: comReal.length, valor: soma(comReal, 'amount'), por_mes: porMes(comReal, 'created_date', 'amount') },
      de_venda_SEM_dinheiro_real: { qtd: comSemReal.length, valor: soma(comSemReal, 'amount'), por_mes: porMes(comSemReal, 'created_date', 'amount') },
      de_venda_fora_da_loja: {
        qtd: comForaDaLoja.length,
        valor: soma(comForaDaLoja, 'amount'),
        observacao: 'pode ser comissão de LEILÃO (não vive em catalog_sales) ou venda já apagada',
      },
    };

    // ── 3) SALDOS DE HOJE ──
    const users = await tudo('app_users', 'id,full_name,email,commission_balance,catalog_commission_balance,total_commissions_generated');
    out.saldos_hoje = {
      contas: users.length,
      commission_balance_total: soma(users, 'commission_balance'),
      catalog_commission_balance_total: soma(users, 'catalog_commission_balance'),
      total_commissions_generated_total: soma(users, 'total_commissions_generated'),
      maiores: users
        .map((u: any) => ({
          nome: u.full_name,
          saldo: r2((Number(u.commission_balance) || 0) + (Number(u.catalog_commission_balance) || 0)),
        }))
        .filter((u: any) => u.saldo > 0)
        .sort((a: any, b: any) => b.saldo - a.saldo)
        .slice(0, 12),
    };

    // ── 4) O RECORTE DA DECISÃO: antes x depois de 01/08/2026 ──
    const antes = (d: any) => String(d || '') < '2026-08-01';
    const cJul = com.filter((c: any) => antes(c.created_date));
    const cAgo = com.filter((c: any) => !antes(c.created_date));
    const vJul = reaisPagas.filter((v: any) => antes(v.created_date));
    const vAgo = reaisPagas.filter((v: any) => !antes(v.created_date));
    out.recorte_decisao = {
      marco_avaliado: '01/08/2026',
      comissoes_ATE_julho: { qtd: cJul.length, valor: soma(cJul, 'amount') },
      comissoes_DE_agosto: { qtd: cAgo.length, valor: soma(cAgo, 'amount') },
      vendas_reais_pagas_ATE_julho: { qtd: vJul.length, valor: soma(vJul, 'total_amount') },
      vendas_reais_pagas_DE_agosto: { qtd: vAgo.length, valor: soma(vAgo, 'total_amount') },
    };

    // O retorno completo estoura o limite de exibição — permite pedir por parte.
    if (secao === 'VENDAS') return Response.json({ success: true, vendas: out.vendas });
    if (secao === 'COMISSOES') return Response.json({ success: true, comissoes: out.comissoes });
    if (secao === 'SALDOS') return Response.json({ success: true, saldos_hoje: out.saldos_hoje, recorte_decisao: out.recorte_decisao });

    return Response.json({ success: true, ...out });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});