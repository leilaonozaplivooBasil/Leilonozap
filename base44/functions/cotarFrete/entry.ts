// cotarFrete — cotação REAL de frete via Melhor Envio (Correios PAC/SEDEX, Jadlog, Loggi...).
// Devolve as opções já ORDENADAS da mais barata para a mais cara (melhor preço pro cliente primeiro).
// Não toca em saldo, pedido ou comissão: é somente leitura/cotação.
//
// Payload esperado:
// {
//   cep: "22040020",
//   items: [{ peso, altura, largura, comprimento, valor, quantidade }]   // dimensões do produto (opcionais)
// }
//
// Resposta:
// { success, configured, opcoes: [{ id, nome, empresa, preco, prazo, logo }] }

Deno.serve(async (req) => {
  try {
    const TOKEN = Deno.env.get("MELHOR_ENVIO_TOKEN");
    const FROM_CEP = String(Deno.env.get("MELHOR_ENVIO_FROM_CEP") || "").replace(/\D/g, "");

    let body = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }

    const toCep = String(body?.cep || "").replace(/\D/g, "");
    if (toCep.length !== 8) {
      return Response.json({ success: false, error: "CEP inválido. Informe os 8 números." });
    }

    if (!TOKEN) {
      return Response.json({ success: false, configured: false, error: "Frete ainda não configurado." });
    }
    if (FROM_CEP.length !== 8) {
      return Response.json({ success: false, configured: false, error: "CEP de origem inválido nas configurações." });
    }

    // Monta os volumes. Sem dados do produto, usa uma caixa pequena padrão
    // (mínimos exigidos pelos Correios: 16x11x2cm).
    const itens = Array.isArray(body?.items) && body.items.length ? body.items : [{}];
    const products = itens.map((it, idx) => {
      const q = Math.max(1, parseInt(it?.quantidade) || 1);
      return {
        id: String(it?.id || idx + 1),
        width: Math.max(11, Number(it?.largura) || 11),
        height: Math.max(2, Number(it?.altura) || 4),
        length: Math.max(16, Number(it?.comprimento) || 16),
        weight: Math.max(0.1, Number(it?.peso) || 0.3),
        insurance_value: Math.max(0, Number(it?.valor) || 0),
        quantity: q,
      };
    });

    const resp = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/calculate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Leilao NoZap (contato@leilaonozap.net)",
      },
      body: JSON.stringify({
        from: { postal_code: FROM_CEP },
        to: { postal_code: toCep },
        products,
      }),
    });

    const raw = await resp.text();
    let cot;
    try {
      cot = JSON.parse(raw);
    } catch (_) {
      cot = null;
    }

    if (!resp.ok || !Array.isArray(cot)) {
      return Response.json({
        success: false,
        configured: true,
        error: "Não conseguimos calcular o frete agora.",
        status: resp.status,
        details: String(raw).slice(0, 400),
      });
    }

    const opcoes = cot
      .filter((o) => !o.error && o.price)
      .map((o) => ({
        id: String(o.id),
        nome: o.name || "",
        empresa: o.company?.name || "",
        logo: o.company?.picture || "",
        preco: Number(o.price),
        prazo: Number(o.delivery_time) || null,
      }))
      .sort((a, b) => a.preco - b.preco);

    if (!opcoes.length) {
      const motivos = cot.filter((o) => o.error).map((o) => o.error);
      return Response.json({
        success: false,
        configured: true,
        error: "Nenhuma transportadora atende esse CEP com as medidas informadas.",
        motivos: motivos.slice(0, 5),
      });
    }

    return Response.json({ success: true, configured: true, origem: FROM_CEP, opcoes });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});