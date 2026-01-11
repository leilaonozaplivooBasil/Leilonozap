import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productName } = await req.json();
        if (!productName) {
            return Response.json({ error: "Nome do produto obrigatório" }, { status: 400 });
        }

        console.log(`🔍 [HD SEARCH] Buscando: ${productName}`);

        // 1️⃣ USA IA COM BUSCA NA INTERNET PARA ENCONTRAR IMAGENS HD
        const searchPrompt = `Você é um assistente especializado em encontrar imagens de produtos de alta qualidade.

TAREFA: Buscar imagens do produto "${productName}" que atendam TODOS estes critérios:

REQUISITOS OBRIGATÓRIOS:
1. RESOLUÇÃO: Mínimo 800x800 pixels (ideal 1200x1200 ou maior)
2. QUALIDADE: Fotos profissionais, nítidas, bem iluminadas
3. VARIEDADE: Pelo menos 6 ÂNGULOS DIFERENTES:
   - Frente do produto
   - Verso/traseira
   - Laterais (esquerda/direita)
   - Detalhes/zoom
   - Produto em uso ou embalagem (se aplicável)

FONTES PRIORITÁRIAS (buscar nessa ordem):
1. Amazon Brasil (amazon.com.br)
2. Mercado Livre (mercadolivre.com.br)
3. Magazine Luiza (magazineluiza.com.br)
4. Americanas (americanas.com.br)

IMPORTANTE:
- Buscar imagens ORIGINAIS do marketplace, não thumbnails
- EVITAR fotos repetidas ou muito similares
- Se encontrar menos de 6 fotos diferentes, buscar em mais fontes
- Retornar URL, fonte, e resolução estimada de cada imagem

Busque APENAS fotos do produto, não acessórios, não propaganda.`;

        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: searchPrompt,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    images: {
                        type: "array",
                        description: "Lista de imagens encontradas",
                        items: {
                            type: "object",
                            properties: {
                                url: { type: "string", description: "URL da imagem em alta resolução" },
                                source: { type: "string", description: "Fonte (ex: Amazon, Mercado Livre)" },
                                resolution: { type: "string", description: "Resolução estimada (ex: 1200x1200)" },
                                angle: { type: "string", description: "Ângulo/tipo (ex: frente, verso, lateral)" }
                            }
                        }
                    },
                    product_title: { type: "string", description: "Nome do produto encontrado" },
                    product_price: { type: "number", description: "Preço de referência" },
                    total_found: { type: "number", description: "Total de imagens encontradas" },
                    quality_score: { type: "number", description: "Nota de qualidade de 1-10" }
                }
            }
        });

        console.log('🤖 Resposta da IA:', JSON.stringify(aiResponse, null, 2));

        if (!aiResponse || !aiResponse.images || aiResponse.images.length === 0) {
            return Response.json({
                error: "Nenhuma imagem HD encontrada",
                suggestion: "Tente com nome mais específico ou use importador por URL",
                found: false
            }, { status: 404 });
        }

        // 2️⃣ VALIDA CADA IMAGEM
        const validatedImages = [];
        
        for (const img of aiResponse.images) {
            if (!img.url) continue;
            
            try {
                // Tenta fazer HEAD request para validar
                const headResponse = await fetch(img.url, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(5000)
                });
                
                if (headResponse.ok) {
                    const contentType = headResponse.headers.get('content-type');
                    if (contentType && contentType.startsWith('image/')) {
                        validatedImages.push({
                            url: img.url,
                            source: img.source || 'Desconhecido',
                            resolution: img.resolution || 'N/A',
                            angle: img.angle || 'N/A'
                        });
                        console.log(`✅ Imagem validada: ${img.source} - ${img.angle}`);
                    }
                }
            } catch (err) {
                console.log(`⚠️ Imagem inválida: ${img.url.substring(0, 50)}`);
                continue;
            }
        }

        // 3️⃣ VERIFICA QUANTIDADE MÍNIMA
        if (validatedImages.length < 6) {
            console.log(`⚠️ Apenas ${validatedImages.length} imagens encontradas (mínimo: 6)`);
            
            return Response.json({
                found: true,
                warning: `Apenas ${validatedImages.length} imagens de qualidade encontradas (ideal: 6+)`,
                title: aiResponse.product_title,
                description: aiResponse.product_title,
                price: aiResponse.product_price,
                imageUrls: validatedImages.map(i => i.url),
                imageDetails: validatedImages,
                thumbnailUrl: validatedImages[0]?.url,
                imageCount: validatedImages.length,
                quality_score: aiResponse.quality_score || 0,
                source: 'Google Search (IA)'
            }, { status: 200 });
        }

        // 4️⃣ SUCESSO - RETORNA IMAGENS HD
        console.log(`✅ ${validatedImages.length} imagens HD validadas!`);

        await base44.asServiceRole.entities.SystemLog.create({
            step: 'HD_IMAGE_SEARCH_SUCCESS',
            status: 'success',
            message: `Busca HD concluída: ${aiResponse.product_title}`,
            component_name: 'searchHDProductImages',
            payload: {
                productName,
                imagesFound: validatedImages.length,
                sources: validatedImages.map(i => i.source),
                qualityScore: aiResponse.quality_score
            }
        }).catch(() => {});

        return Response.json({
            found: true,
            title: aiResponse.product_title,
            description: aiResponse.product_title,
            price: aiResponse.product_price,
            imageUrls: validatedImages.map(i => i.url),
            imageDetails: validatedImages, // Detalhes extras
            thumbnailUrl: validatedImages[0]?.url,
            imageCount: validatedImages.length,
            quality_score: aiResponse.quality_score || 0,
            source: 'Google Search (IA)'
        }, { status: 200 });

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        return Response.json({
            error: "Erro ao buscar imagens HD",
            details: error.message,
            found: false
        }, { status: 500 });
    }
});