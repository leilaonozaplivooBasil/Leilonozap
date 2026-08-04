// 🔍 SOMENTE LEITURA — TRILHA MERCADO PAGO
// Cruza o histórico REAL de pagamentos aprovados na API do Mercado Pago com o que
// está persistido no Supabase, para saber o que é recuperável.
// Descoberta que motiva esta função: o fluxo ATIVO (Vercel, api/functions/*) não grava
// numa tabela de pagamentos — ele grava em catalog_sales.mp_payment_id.
// Não escreve NADA (nenhum POST/PATCH/DELETE no Supabase).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const SB = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
    const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const MP = (Deno.env.get('MP_ACCESS_TOKEN') || '').trim();
    if (!SB || !KEY) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    if (!MP) return Response.json({ error: 'MP_ACCESS_TOKEN ausente' }, { status: 500 });
    const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

    // contagem via content-range (não traz linhas)
    const contar = async (query: string) => {
      const r = await fetch(`${SB}/rest/v1/${query}`, { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
      if (!r.ok) return `erro ${r.status}`;
      const cr = r.headers.get('content-range') || '';
      return cr.includes('/') ? cr.split('/')[1] : '?';
    };

    // 1) O QUE O BANCO TEM (catalog_sales = onde o fluxo ativo realmente grava)
    const banco = {
      catalog_sales_total: await contar('catalog_sales?select=id'),
      com_mp_payment_id: await contar('catalog_sales?select=id&mp_payment_id=not.is.null'),
      pagas: await contar('catalog_sales?select=id&status=eq.paid'),
      pagas_com_mp_id: await contar('catalog_sales?select=id&status=eq.paid&mp_payment_id=not.is.null'),
      pagas_sem_mp_id: await contar('catalog_sales?select=id&status=eq.paid&mp_payment_id=is.null'),
      pendentes: await contar('catalog_sales?select=id&status=eq.pending_payment'),
    };

    // 2) O QUE O MERCADO PAGO TEM (paginado; só aprovados)
    const mpAprovados: any[] = [];
    let mpTotal = 0;
    let offset = 0;
    for (let i = 0; i < 20; i++) { // teto de 20 páginas x 100 = 2000
      const r = await fetch(
        `https://api.mercadopago.com/v1/payments/search?status=approved&sort=date_created&criteria=desc&limit=100&offset=${offset}`,
        { headers: { Authorization: `Bearer ${MP}` } }
      );
      if (!r.ok) {
        return Response.json({
          ok: false, escrita_realizada: false, banco,
          erro_mp: `${r.status} ${(await r.text()).slice(0, 200)}`,
        });
      }
      const j = await r.json();
      mpTotal = j?.paging?.total ?? mpTotal;
      const results = j?.results || [];
      mpAprovados.push(...results);
      if (results.length < 100) break;
      offset += 100;
    }

    const datas = mpAprovados.map((p) => p.date_approved || p.date_created).filter(Boolean).sort();
    const somaMP = mpAprovados.reduce((s, p) => s + (Number(p.transaction_amount) || 0), 0);

    // 3) CRUZAMENTO — cada aprovado do MP tem venda correspondente no banco?
    // O elo é external_reference (= id da venda) e/ou mp_payment_id.
    const semVinculo: any[] = [];
    const semExternalRef: any[] = [];
    let comVinculo = 0;
    let vinculoNaoPago = 0;

    for (const p of mpAprovados) {
      const ref = p.external_reference;
      if (!ref) { semExternalRef.push({ payment_id: p.id, valor: p.transaction_amount, data: p.date_approved }); continue; }
      const q = `catalog_sales?select=id,status,kind,total_amount&or=(id.eq.${encodeURIComponent(ref)},mp_payment_id.eq.${encodeURIComponent(String(p.id))})&limit=1`;
      const r = await fetch(`${SB}/rest/v1/${q}`, { headers: H });
      const rows = r.ok ? await r.json() : [];
      const venda = Array.isArray(rows) ? rows[0] : null;
      if (!venda) {
        semVinculo.push({ payment_id: p.id, external_reference: ref, valor: p.transaction_amount, data: p.date_approved, metodo: p.payment_method_id });
        continue;
      }
      comVinculo++;
      if (venda.status !== 'paid') {
        vinculoNaoPago++;
        if (vinculoNaoPago <= 20) {
          semVinculo.push({ ALERTA: 'PAGO NO MP MAS NAO PAGO NO BANCO', payment_id: p.id, sale_id: venda.id, status_banco: venda.status, kind: venda.kind, valor: p.transaction_amount, data: p.date_approved });
        }
      }
    }

    return Response.json({
      ok: true,
      escrita_realizada: false,
      banco,
      mercado_pago: {
        aprovados_total_informado: mpTotal,
        aprovados_lidos: mpAprovados.length,
        periodo_mais_antigo: datas[0] || null,
        periodo_mais_recente: datas[datas.length - 1] || null,
        soma_aprovada: Math.round(somaMP * 100) / 100,
        qtd_campos_disponiveis: Object.keys(mpAprovados[0] || {}).length,
      },
      cruzamento: {
        com_venda_no_banco: comVinculo,
        sem_venda_no_banco: semVinculo.filter((x) => !x.ALERTA).length,
        aprovado_no_mp_mas_nao_pago_no_banco: vinculoNaoPago,
        sem_external_reference: semExternalRef.length,
      },
      amostra_divergencias: semVinculo.slice(0, 8).map((x) =>
        `${x.ALERTA ? '[NAO PAGO NO BANCO] ' : ''}pay=${x.payment_id} ref=${x.external_reference || x.sale_id} R$${x.valor} ${String(x.data || '').slice(0, 10)}`
      ),
      amostra_sem_external_reference: semExternalRef.slice(0, 5).map((x) => `pay=${x.payment_id} R$${x.valor} ${String(x.data || '').slice(0, 10)}`),
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});