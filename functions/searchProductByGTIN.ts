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

    // TENTATIVA 3: BUSCA AVANÇADA COM IA
    if (!productData) {
      try {
        console.log('🤖 IA buscando GTIN na internet...');
        
        const llmResponse = await base44.integrations.Core.InvokeLLM({
          prompt: `BUSCA POR CÓDIGO DE BARRAS: ${gtin}

TAREFA CRÍTICA:
1. Busque este código em: Google Shopping, Mercado Livre, Amazon BR, Magazine Luiza, Americanas
2. Retorne TÍTULO COMPLETO do produto
3. Descrição DETALHADA (características técnicas, marca, modelo)
4. OBRIGATÓRIO: 5-10 URLs de imagens COMPLETAS E VÁLIDAS

FORMATO IMAGENS:
- URLs diretas: https://...
- Extensões: .jpg, .jpeg, .png, .webp
- Imagens GRANDES (não thumb)
- SEM logos/ícones

EXEMPLO URL:
https://http2.mlstatic.com/D_NQ_NP_881751-MLB51234567890-V.jpg

Se NÃO encontrar: found=false`,
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
                items: { type: 'string' },
                minItems: 1
              },
              specifications: { type: 'string' }
            },
            required: ['found']
          }
        });

        console.log(`🔍 IA retornou: found=${llmResponse?.found}, imagens=${llmResponse?.imageUrls?.length || 0}`);

        if (llmResponse?.found) {
          // Limpa URLs (menos restritivo)
          const cleanUrls = (llmResponse.imageUrls || [])
            .filter(url => url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://')))
            .map(url => url.split('?')[0].split('#')[0])
            .filter((url, i, arr) => arr.indexOf(url) === i)
            .slice(0, 10);

          productData = {
            title: llmResponse.title || 'Produto',
            description: llmResponse.description || llmResponse.specifications || 'Produto encontrado',
            imageUrls: cleanUrls,
            brand: llmResponse.brand || '',
            category: llmResponse.category || '',
            source: 'IA + Internet'
          };

          console.log('✅ IA encontrou:', cleanUrls.length, 'imagens');
        } else {
          console.log('❌ IA não encontrou');
        }
      } catch (error) {
        console.error('❌ IA error:', error.message);
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