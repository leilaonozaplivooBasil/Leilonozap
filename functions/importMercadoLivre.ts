import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'URL inválida' }, { status: 400 });
    }

    if (!url.includes('mercadolivre.com.br')) {
      return Response.json({ error: 'URL deve ser do Mercado Livre' }, { status: 400 });
    }

    // Usar InvokeLLM para extrair dados do HTML
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Acesse a URL ${url} e extraia EXATAMENTE os seguintes dados do anúncio:
1. TÍTULO do anúncio
2. DESCRIÇÃO completa (tudo que está descrito)
3. TODAS as URLs das IMAGENS do anúncio (lista com cada URL em uma linha)

Retorne em JSON com as chaves: title, description, images (array)`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          images: { type: 'array', items: { type: 'string' } }
        },
        required: ['title', 'description', 'images']
      }
    });

    if (!response || !response.title) {
      return Response.json({ error: 'Não foi possível extrair dados do anúncio' }, { status: 400 });
    }

    // Filtrar URLs vazias
    const cleanImages = (response.images || []).filter(img => img && typeof img === 'string' && img.trim() !== '');

    return Response.json({
      title: response.title,
      description: response.description,
      images: cleanImages
    }, { status: 200 });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message || 'Erro ao importar anúncio' }, { status: 500 });
  }
});