import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// 🔎 SOMENTE LEITURA — consulta a tabela REAL de parcelamento do Mercado Pago
// (endpoint oficial /v1/payment_methods/installments) usando o MP_ACCESS_TOKEN da conta.
// Não grava nada, não cria pagamento, não toca em produto/carteira/comissão.
// Serve para comparar com a tela "Todas as taxas" do app do Mercado Pago.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const token = Deno.env.get('MP_ACCESS_TOKEN');
    if (!token) return Response.json({ ok: false, error: 'MP_ACCESS_TOKEN ausente' }, { status: 500 });

    let body = {};
    try { body = await req.json(); } catch (_) { body = {}; }
    const amount = Number(body.amount) > 0 ? Number(body.amount) : 100;

    // A API do MP exige a bandeira (payment_method_id). Consultamos as principais.
    const bandeiras = Array.isArray(body.bandeiras) && body.bandeiras.length
      ? body.bandeiras
      : ['visa', 'master', 'elo', 'hipercard', 'amex'];

    const bruto = [];
    const falhas = [];
    for (const pm of bandeiras) {
      const url = `https://api.mercadopago.com/v1/payment_methods/installments?amount=${amount}&payment_method_id=${pm}&payment_type_id=credit_card`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const texto = await resp.text();
      if (!resp.ok) { falhas.push({ bandeira: pm, http: resp.status, resposta: texto.slice(0, 200) }); continue; }
      try {
        const j = JSON.parse(texto);
        if (Array.isArray(j)) bruto.push(...j);
      } catch (_) { falhas.push({ bandeira: pm, erro: 'resposta não-JSON' }); }
    }

    const metodos = bruto.map((m) => ({
      metodo: m.payment_method_id,
      emissor: m?.issuer?.name,
      parcelas: (m.payer_costs || []).map((p) => ({
        n: p.installments,
        taxa_pct: p.installment_rate,                 // % de juros do parcelamento
        parcela: p.installment_amount,                // valor de cada parcela
        total: p.total_amount,                        // total que o cliente paga
        rotulo: p.recommended_message,
      })),
    }));

    // Consolida: para cada nº de parcelas, o pior caso entre os métodos (o que o cliente realmente veria)
    const consolidado = {};
    for (const m of metodos) {
      for (const p of m.parcelas) {
        const atual = consolidado[p.n];
        if (!atual || Number(p.total) > Number(atual.total)) {
          consolidado[p.n] = { n: p.n, taxa_pct: p.taxa_pct, parcela: p.parcela, total: p.total, metodo: m.metodo };
        }
      }
    }

    return Response.json({
      ok: true,
      escrita_realizada: false,
      valor_consultado: amount,
      metodos_encontrados: metodos.length,
      falhas,
      tabela_consolidada: Object.values(consolidado).sort((a, b) => a.n - b.n),
      detalhe_por_metodo: metodos,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});