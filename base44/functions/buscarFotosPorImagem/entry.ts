// buscarFotosPorImagem (runtime Deno) — PONTO 77 CAMADA 3
// Espelho da função Vercel api/functions/buscarFotosPorImagem.js.
// Busca fotos do MESMO produto usando a FOTO como referência (Google Lens),
// porque buscar por NOME trazia produto errado (ferro vertical → ferro comum,
// pipoqueira → algodão doce). Devolve SOMENTE URLs de imagem.
Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const trilha: string[] = [];
  try {
    const body = await req.json().catch(() => ({}));
    const imageUrl = String(body?.imageUrl || "").trim();

    if (!/^https?:\/\//i.test(imageUrl)) {
      return json({
        success: false,
        images: [],
        motivo: "sem_imagem",
        error: "Envie a URL de uma foto do produto (imageUrl)",
      });
    }

    const key = Deno.env.get("SERPAPI_KEY");
    if (!key) {
      return json({ success: false, images: [], motivo: "falha_busca", error: "SERPAPI_KEY não configurada" });
    }

    const url = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(imageUrl)}&hl=pt&country=br&api_key=${key}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`SerpAPI Lens HTTP ${resp.status}`);
    const data = await resp.json();
    if (data.error) throw new Error(String(data.error).slice(0, 120));

    const brutas: string[] = [];
    for (const m of data.visual_matches || []) {
      if (m.thumbnail) brutas.push(m.thumbnail);
      if (m.image) brutas.push(m.image);
    }
    for (const m of data.shopping_results || data.products || []) {
      if (m.thumbnail) brutas.push(m.thumbnail);
    }

    const images = [
      ...new Set(
        brutas.filter(
          (u) => typeof u === "string" && /^https?:\/\//i.test(u) && !/\.svg(\?|$)/i.test(u),
        ),
      ),
    ].slice(0, 12);
    trilha.push(`google_lens: ${images.length} imagens`);

    if (images.length === 0) {
      return json({
        success: false,
        images: [],
        motivo: "sem_resultado",
        error: "Nenhuma foto parecida encontrada para esta imagem",
        trilha,
      });
    }

    return json({ success: true, images, source: "google_lens", trilha });
  } catch (e) {
    return json({
      success: false,
      images: [],
      motivo: "falha_busca",
      error: String((e as Error)?.message || e),
      trilha,
    });
  }
});