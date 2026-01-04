import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      return Response.json({ error: 'URL da imagem obrigatória' }, { status: 400 });
    }

    console.log(`🔍 [IMPORT] Analisando: ${imageUrl}`);

    // PASSO 1: ANÁLISE VISUAL DA IMAGEM
    const imageAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analise esta imagem de produto e extraia:
- name: nome completo do produto
- brand: marca
- category: categoria (eletrônicos, eletrodomésticos, móveis, roupas, etc)
- condition: estado (novo, usado, etc)
- short_description: descrição breve

Retorne APENAS JSON.`,
      file_urls: [imageUrl],
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          brand: { type: "string" },
          category: { type: "string" },
          condition: { type: "string" },
          short_description: { type: "string" }
        }
      }
    });

    console.log(`✅ [ANALYSIS] Produto: ${imageAnalysis.name}`);

    if (!imageAnalysis.name) {
      return Response.json({
        success: false,
        message: 'Não foi possível identificar o produto na imagem'
      });
    }

    // PASSO 2: BUSCA DETALHADA NA WEB
    const webSearch = await base44.integrations.Core.InvokeLLM({
      prompt: `Busque informações detalhadas sobre "${imageAnalysis.name} ${imageAnalysis.brand}" e extraia:
- description: descrição completa
- price_range: faixa de preço em R$ (ex: "R$ 100-150")
- specifications: objeto com especificações técnicas
- images: lista de URLs de imagens (até 5)
- gtin: código de barras se encontrar

Priorize sites como Amazon, Mercado Livre, Magazine Luiza.
Retorne APENAS JSON.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          description: { type: "string" },
          price_range: { type: "string" },
          specifications: { type: "object" },
          images: { type: "array", items: { type: "string" } },
          gtin: { type: "string" }
        }
      }
    });

    console.log(`💰 [WEB] Preço estimado: ${webSearch.price_range || 'N/A'}`);

    // PASSO 3: VERIFICAR PRODUTOS SIMILARES
    const similarProducts = await base44.asServiceRole.entities.Product.filter({
      description: { $regex: imageAnalysis.name, $options: 'i' }
    });

    const suggestions = [];
    
    for (const product of similarProducts.slice(0, 3)) {
      // Busca leilões recentes deste produto
      const auctions = await base44.asServiceRole.entities.Auction.filter({
        product_id: product.id,
        status: { $in: ['active', 'ended'] }
      }, '-created_date', 1);

      suggestions.push({
        product_id: product.id,
        name: product.description,
        image: null, // Products não tem imagem própria
        latest_auction: auctions[0] ? {
          id: auctions[0].id,
          title: auctions[0].title,
          price: auctions[0].current_price || auctions[0].starting_price,
          image: auctions[0].image_urls?.[0]
        } : null
      });
    }

    console.log(`📦 [DUPLICATES] ${suggestions.length} produto(s) similar(es)`);

    // PASSO 4: CONSOLIDAR DADOS
    const consolidatedData = {
      name: imageAnalysis.name,
      brand: imageAnalysis.brand || '',
      category: imageAnalysis.category || 'outros',
      description: webSearch.description || imageAnalysis.short_description || '',
      condition: imageAnalysis.condition || 'novo',
      price_range: webSearch.price_range || '',
      gtin: webSearch.gtin || '',
      specifications: webSearch.specifications || {},
      images: [imageUrl, ...(webSearch.images || [])].slice(0, 5)
    };

    // LOG
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'IMAGE_URL_IMPORT',
      status: 'success',
      component_name: 'analyzeImageUrlAndImport',
      message: `Produto importado: ${consolidatedData.name}`,
      payload: {
        imageUrl,
        productName: consolidatedData.name,
        suggestionsCount: suggestions.length
      }
    });

    return Response.json({
      success: true,
      productData: consolidatedData,
      suggestedProducts: suggestions
    });

  } catch (error) {
    console.error('❌ [ERROR]:', error);
    
    // LOG ERROR
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'IMAGE_URL_IMPORT_ERROR',
        status: 'error',
        component_name: 'analyzeImageUrlAndImport',
        message: error.message,
        error_details: { stack: error.stack }
      });
    } catch {}

    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});