Deno.serve(async (req) => {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'URL inválida' }, { status: 400 });
    }

    if (!url.includes('mercadolivre.com.br')) {
      return Response.json({ error: 'URL deve ser do Mercado Livre' }, { status: 400 });
    }

    // Fazer fetch real do anúncio
    const html = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }).then(r => r.text());

    if (!html) {
      return Response.json({ error: 'Não foi possível acessar o anúncio' }, { status: 400 });
    }

    // Extrair dados do HTML
    let title = '';
    let description = '';
    let images = [];

    // Buscar JSON-LD (dados estruturados)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.name) title = jsonLd.name;
        if (jsonLd.description) description = jsonLd.description;
        if (jsonLd.image) {
          images = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
        }
      } catch (e) {
        // Continuar com parsing manual
      }
    }

    // Se não encontrou via JSON-LD, tentar extração manual
    if (!title) {
      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
      if (titleMatch) title = titleMatch[1].trim();
    }

    if (!description) {
      const descMatch = html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/p>/i);
      if (descMatch) description = descMatch[1].trim();
    }

    if (images.length === 0) {
      // Extrair imagens do atributo data-src ou src em img tags
      const imgMatches = html.matchAll(/<img[^>]*(?:src|data-src)="([^"]*\.jpg[^"]*)"/gi);
      const imgSet = new Set();
      for (const match of imgMatches) {
        const imgUrl = match[1];
        if (imgUrl && imgUrl.includes('mercadolivre') && imgSet.size < 20) {
          imgSet.add(imgUrl);
        }
      }
      images = Array.from(imgSet);
    }

    // Validar dados
    if (!title || !description || images.length === 0) {
      return Response.json({ error: 'Não foi possível extrair dados completos do anúncio' }, { status: 400 });
    }

    return Response.json({
      title: title.substring(0, 200),
      description: description.substring(0, 1000),
      images: images.filter(img => img && typeof img === 'string').slice(0, 10)
    }, { status: 200 });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: 'Erro ao importar anúncio: ' + error.message }, { status: 500 });
  }
});