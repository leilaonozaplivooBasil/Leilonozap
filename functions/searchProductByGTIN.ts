import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // Clone request to read body multiple times
    const clonedReq = req.clone();
    const body = await clonedReq.json();
    const { gtin } = body;

    if (!gtin) {
      return Response.json({ error: 'GTIN é obrigatório' }, { status: 400 });
    }

    console.log('🔍 Buscando produto por GTIN:', gtin);
    
    // Inicializa o client Base44 com request original
    const base44 = createClientFromRequest(req);

    // Normaliza GTIN (remove espaços e zeros à esquerda)
    const normalizedGtin = gtin.toString().trim().replace(/^0+/, '');
    
    let productData = null;

    // TENTATIVA 1: Open Food Facts (alimentos e produtos em geral)
    try {
      console.log('📦 Tentando Open Food Facts...');
      const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${normalizedGtin}.json`);
      
      if (offResponse.ok) {
        const data = await offResponse.json();
        
        if (data.status === 1 && data.product) {
          const product = data.product;
          
          productData = {
            title: product.product_name || product.product_name_pt || 'Produto sem nome',
            description: product.generic_name || product.ingredients_text || 'Produto alimentício',
            imageUrls: [],
            brand: product.brands || '',
            category: product.categories || '',
            source: 'Open Food Facts'
          };

          // Coleta imagens
          if (product.image_url) productData.imageUrls.push(product.image_url);
          if (product.image_front_url) productData.imageUrls.push(product.image_front_url);
          if (product.image_ingredients_url) productData.imageUrls.push(product.image_ingredients_url);
          if (product.image_nutrition_url) productData.imageUrls.push(product.image_nutrition_url);

          console.log('✅ Produto encontrado no Open Food Facts');
        }
      }
    } catch (error) {
      console.log('⚠️ Open Food Facts falhou:', error.message);
    }

    // TENTATIVA 2: UPC Database API (produtos gerais)
    if (!productData) {
      try {
        console.log('📦 Tentando UPC Database...');
        const upcResponse = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${normalizedGtin}`);
        
        if (upcResponse.ok) {
          const data = await upcResponse.json();
          
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            
            productData = {
              title: item.title || 'Produto sem nome',
              description: item.description || item.brand || 'Produto disponível',
              imageUrls: item.images || [],
              brand: item.brand || '',
              category: item.category || '',
              source: 'UPC Database'
            };

            console.log('✅ Produto encontrado no UPC Database');
          }
        }
      } catch (error) {
        console.log('⚠️ UPC Database falhou:', error.message);
      }
    }

    // TENTATIVA 3: BUSCA INTELIGENTE COM IA (procura em TODA a internet)
    if (!productData) {
      try {
        console.log('🤖 Ativando busca AVANÇADA com IA...');
        
        const llmResponse = await base44.integrations.Core.InvokeLLM({
          prompt: `MISSÃO CRÍTICA: Encontre TODAS as informações possíveis sobre o produto com código de barras/EAN/GTIN: ${gtin}

INSTRUÇÕES:
1. Busque em TODAS as fontes: Google Shopping, Mercado Livre, Amazon, Americanas, Magazine Luiza, sites de fabricantes, etc.
2. Retorne dados COMPLETOS e DETALHADOS do produto
3. Inclua links de imagens de alta qualidade (no mínimo 3, máximo 10 URLs)
4. Se for eletrônico, inclua especificações técnicas
5. Descrição deve ter no mínimo 100 caracteres

BUSQUE EM:
- Google Shopping (preços e comparação)
- Mercado Livre Brasil (busque: "${gtin}")
- Amazon.com.br (busque: "${gtin}")
- Sites oficiais do fabricante
- Lojas especializadas
- Qualquer e-commerce brasileiro que tenha o produto

IMPORTANTE: 
- Se encontrar o produto, retorne found=true
- Se NÃO encontrar NADA, retorne found=false
- Priorize fontes brasileiras (.com.br)
- URLs de imagem devem ser diretas (jpg, png, webp)`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              found: { type: 'boolean' },
              title: { type: 'string' },
              description: { type: 'string' },
              brand: { type: 'string' },
              category: { type: 'string' },
              imageUrls: {
                type: 'array',
                items: { type: 'string' }
              },
              specifications: { type: 'string' },
              averagePrice: { type: 'number' }
            },
            required: ['found']
          }
        });

        if (llmResponse?.found) {
          productData = {
            title: llmResponse.title || 'Produto',
            description: llmResponse.description || llmResponse.specifications || 'Produto encontrado',
            imageUrls: llmResponse.imageUrls || [],
            brand: llmResponse.brand || '',
            category: llmResponse.category || '',
            source: 'Busca Inteligente (IA)',
            averagePrice: llmResponse.averagePrice
          };

          console.log('✅ Produto encontrado via IA - Imagens:', productData.imageUrls.length);
        } else {
          console.log('⚠️ IA não encontrou o produto');
        }
      } catch (error) {
        console.log('⚠️ Busca via IA falhou:', error.message);
      }
    }

    if (!productData) {
      return Response.json({
        found: false,
        message: 'Produto não encontrado. Verifique o código GTIN ou preencha manualmente.',
        gtin: normalizedGtin
      });
    }

    return Response.json({
      found: true,
      ...productData,
      gtin: normalizedGtin
    });

  } catch (error) {
    console.error('❌ Erro ao buscar GTIN:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});