import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function validateImageUrl(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) return false;
        
        const contentType = response.headers.get('content-type');
        return contentType && contentType.startsWith('image/');
    } catch {
        return false;
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "URL obrigatória" }, { status: 400 });
        }

        console.log(`📥 Importando: ${productUrl}`);

        // 🆕 PRIMEIRO TENTA: API Própria de Scraping
        console.log('🔄 Tentando API própria (api.midia.dev.br)...');
        let apiResult = null;
        try {
            const apiResponse = await fetch('https://api.midia.dev.br/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: productUrl,
                    download_images: false
                }),
                signal: AbortSignal.timeout(60000)
            });

            const apiData = await apiResponse.json();
            
            if (apiData.success && apiData.data) {
                console.log('✅ API Própria retornou com sucesso!');
                apiResult = apiData.data;
            } else {
                console.log('⚠️ API Própria retornou erro:', apiData.error);
            }
        } catch (e) {
            console.log('⚠️ API Própria falhou:', e.message);
        }

        // 🔄 SE API PRÓPRIA FALHOU: Fallback para método tradicional (HTML + IA)
        let html = '';
        if (!apiResult) {
            console.log('📥 Usando fallback (HTML + IA do Google)...');
            try {
                const resp = await fetch(productUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Accept": "text/html"
                    },
                    signal: AbortSignal.timeout(15000)
                });

                if (resp.ok) {
                    html = await resp.text();
                    console.log(`✅ ${html.length} chars`);
                }
            } catch (e) {
                return Response.json({
                    error: "Página inacessível"
                }, { status: 500 });
            }

            if (!html || html.length < 1000) {
                return Response.json({
                    error: "Falha ao carregar página"
                }, { status: 500 });
            }
        }

        // 🆕 SE VEIO DA API PRÓPRIA: Usar dados diretos
        let title, description, price, brand, model, finalImageUrls;
        
        if (apiResult) {
            console.log('📋 Extraindo dados da API Própria...');
            title = apiResult.title;
            description = apiResult.description;
            price = apiResult.price ? parseFloat(apiResult.price.replace(/[^\d.,]/g, '').replace(',', '.')) : null;
            brand = apiResult.attributes?.Marca || '';
            model = apiResult.attributes?.['Modelo'] || '';
            finalImageUrls = (apiResult.images || []).map(img => img.url).filter(u => u);
            
            console.log(`✅ API: ${title} | ${finalImageUrls.length} imagens`);
        } else {
            // FALLBACK: Detecta marketplace e extrai com regex
            const url = productUrl.toLowerCase();
            const isMercadoLivre = url.includes('mercadolivre') || url.includes('mercadolibre');
            
            console.log(`🏪 Marketplace: ${isMercadoLivre ? 'Mercado Livre' : 'Genérico'}`);
            
            let extractedImages = [];
            
            if (isMercadoLivre) {
                console.log('🔍 Usando regex Mercado Livre...');
                const regex = /https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[A-Za-z0-9_-]+\.(?:jpg|webp)/gi;
                const matches = html.match(regex) || [];
                extractedImages = [...new Set(matches)].filter(u => !u.includes('-O.jpg') && !u.includes('-I.jpg'));
                console.log(`📸 Regex encontrou: ${extractedImages.length} URLs`);
            } else if (url.includes('amazon')) {
                const regex = /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\.(?:jpg|png)/gi;
                extractedImages = [...new Set(html.match(regex) || [])];
                console.log(`📸 Amazon regex: ${extractedImages.length} URLs`);
            } else if (url.includes('shopee')) {
                const regex = /https:\/\/cf\.shopee\.com\.br\/file\/[A-Za-z0-9_-]+/gi;
                extractedImages = [...new Set(html.match(regex) || [])];
                console.log(`📸 Shopee regex: ${extractedImages.length} URLs`);
            }
            
            const snippet = html.substring(0, 15000);
            
            const aiResult = await base44.integrations.Core.InvokeLLM({
                prompt: `TAREFA: Separar NOME do DETALHES do produto

HTML:
${snippet}

REGRAS ABSOLUTAS - NÃO QUEBRAR:

**TITLE (Deve ser CURTO - máximo 6 palavras):**
- SÓ: Marca + Tipo + Capacidade (se houver)
- NÃO incluir: voltagem, cor, estado, velocidades, características

**DESCRIPTION (Deve ser LONGO - todos os detalhes):**
- Tipo: automático, semi-automático, manual, etc
- Voltagem: 110V, 220V, bivolt
- Capacidade: kg, litros, tamanho
- Cores disponíveis
- Material
- Características de funcionamento
- Tudo mais NÃO colocado no title

REGRA DE OURO: O que sobrar do title vai na description

**EXEMPLO 1:**
Entrada: "Máquina de Lavar Tanquinho 24kg Semi Automática 110V"
title: ✅ "Máquina de Lavar Tanquinho"
description: ✅ "Capacidade 24kg, semi-automática, voltagem 110V"

**EXEMPLO 2:**
Entrada: "iPhone 15 Pro 256GB Cor Preta Câmera 48MP"
title: ✅ "iPhone 15 Pro"
description: ✅ "256GB de armazenamento, cor preta, câmera de 48MP, tela OLED, processador A17 Pro"

**EXEMPLO 3 (AVISO - ERRADO):**
Entrada: "Geladeira Brastemp 500L Frost Free 110V"
❌ ERRADO: title="Geladeira Brastemp 500L Frost Free 110V" + description="Geladeira Brastemp 500L Frost Free 110V" (IDÊNTICOS!)
✅ CORRETO: title="Geladeira Brastemp 500L" + description="Frost Free, voltagem 110V, capacidade 500L..."

RETORNE JSON com TITLE DIFERENTE da DESCRIPTION:`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        price: { type: "number" },
                        brand: { type: "string" },
                        model: { type: "string" }
                    },
                    required: ["title", "description"]
                }
            });
            
            title = aiResult.title;
            description = aiResult.description;
            price = aiResult.price;
            brand = aiResult.brand;
            model = aiResult.model;
            finalImageUrls = extractedImages;
        }
        
        console.log(`📊 Imagens para validar: ${finalImageUrls.length}`);

        console.log(`✅ Título: ${title}`);
        console.log(`✅ Descrição: ${description?.substring(0, 100)}...`);
        console.log(`📸 Imagens a validar: ${finalImageUrls.length}`);

        // VALIDA IMAGENS (limitado para não travar)
        const validUrls = [];
        for (const url of finalImageUrls.slice(0, 12)) {
            if (validUrls.length >= 8) break;
            
            if (await validateImageUrl(url)) {
                validUrls.push(url);
                console.log(`✅ [${validUrls.length}] Válida: ${url.substring(0, 70)}`);
            } else {
                console.log(`❌ Inválida: ${url.substring(0, 70)}`);
            }
        }

        console.log(`✅ FINAL: ${validUrls.length} imagens validadas de ${finalImageUrls.length} extraídas`);

        return Response.json({
            title: title || '',
            description: description || '',
            imageUrls: validUrls,
            price: price || null,
            brand: brand || null,
            model: model || null,
            sourceUrl: productUrl
        });

    } catch (error) {
        console.error('❌', error);
        return Response.json({
            error: "Erro ao importar",
            details: error.message
        }, { status: 500 });
    }
});