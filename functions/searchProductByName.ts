import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function validateImageUrl(url) {
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
        });
        
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

        const { productName } = await req.json();
        if (!productName) {
            return Response.json({ error: "Nome do produto obrigatório" }, { status: 400 });
        }

        console.log(`🔍 Buscando: ${productName}`);

        // Busca completa em uma chamada só
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Busque "${productName}" na internet e EXTRAIA O MÁXIMO DE IMAGENS POSSÍVEL.

🎯 PRIORIDADE MÁXIMA: ENCONTRAR PELO MENOS 8-12 IMAGENS DIFERENTES

Busque em MÚLTIPLOS sites:
- Mercado Livre (várias páginas de produtos)
- Amazon Brasil (várias listagens)
- Magazine Luiza
- Shopee
- Google Shopping

Para cada site, extraia:
- Imagem principal do produto
- Imagens de galeria/carrossel
- Imagens de variações (cores, ângulos)
- Miniaturas em alta resolução

OBRIGATÓRIO retornar:
{
  "found": true,
  "title": "Nome exato do produto",
  "description": "Descrição completa com especificações",
  "imageUrls": ["url1", "url2", "url3", ...]  // MÍNIMO 8 URLs, MÁXIMO 15
}

❌ REJEITE acessórios (capa, carregador, cabo, película)
❌ Se encontrar < 5 imagens, retorne found = false`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    found: { type: "boolean" },
                    title: { type: "string" },
                    description: { type: "string" },
                    imageUrls: { 
                        type: "array",
                        items: { type: "string" }
                    }
                },
                required: ["found"]
            }
        });

        console.log(`📦 Resultado: found=${result.found}, title="${result.title}", ${result.imageUrls?.length || 0} imgs`);

        if (!result.found || !result.title) {
            return Response.json({
                error: "Produto não encontrado",
                suggestion: "Tente com marca + modelo (ex: Samsung Galaxy S23)"
            }, { status: 404 });
        }

        // Valida acessórios no título
        const lower = result.title.toLowerCase();
        const accessoryKeywords = [
            'carregador', 'charger', 'cabo', 'cable', 'capa', 'case',
            'película', 'protetor', 'glass', 'adaptador', 'adapter', 'fone'
        ];
        if (accessoryKeywords.some(k => lower.includes(k))) {
            return Response.json({
                error: "Sistema encontrou apenas acessórios",
                suggestion: "Seja mais específico no nome do produto"
            }, { status: 404 });
        }

        const imageUrls = (result.imageUrls || [])
            .filter(url => url && typeof url === 'string' && url.startsWith('http') && !url.includes('...'))
            .slice(0, 12);

        if (imageUrls.length === 0) {
            return Response.json({
                error: "Produto encontrado mas sem imagens válidas",
                suggestion: "Use o importador por URL com link direto do produto",
                title: result.title,
                description: result.description
            }, { status: 404 });
        }

        console.log(`📥 Baixando ${imageUrls.length} imagens para Base44...`);

        // BAIXAR E HOSPEDAR IMAGENS NO BASE44
        const uploadedUrls = [];

        for (const url of imageUrls) {
            try {
                console.log(`🔄 Baixando: ${url.substring(0, 60)}...`);
                
                const imgResponse = await fetch(url, { 
                    signal: AbortSignal.timeout(8000),
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (!imgResponse.ok) {
                    console.log(`❌ HTTP ${imgResponse.status}`);
                    continue;
                }
                
                const blob = await imgResponse.blob();
                
                // Aceita imagens maiores que 1KB
                if (blob.size < 1000) {
                    console.log(`⚠️ Muito pequena (${blob.size} bytes), pulando`);
                    continue;
                }
                
                // Converte Blob → ArrayBuffer → File
                const arrayBuffer = await blob.arrayBuffer();
                
                const fileName = `product_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                const file = new File([arrayBuffer], fileName, { 
                    type: blob.type || 'image/jpeg' 
                });
                
                console.log(`📤 Upload ${fileName} (${blob.size} bytes)`);
                
                // Upload para storage privado
                const uploadResult = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
                
                if (uploadResult?.file_uri) {
                    // Cria signed URL de 1 ano
                    const signedResult = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
                        file_uri: uploadResult.file_uri,
                        expires_in: 31536000 // 365 dias
                    });
                    
                    if (signedResult?.signed_url) {
                        uploadedUrls.push(signedResult.signed_url);
                        console.log(`✅ Hospedada com sucesso`);
                        
                        if (uploadedUrls.length >= 8) break;
                    }
                }
                
            } catch (err) {
                console.log(`❌ Falhou: ${err.message}`);
            }
        }

        console.log(`📊 RESULTADO: ${uploadedUrls.length}/${imageUrls.length} imagens baixadas`);

        if (uploadedUrls.length === 0) {
            return Response.json({
                error: "Imagens não puderam ser baixadas",
                suggestion: "Use o importador por URL com link direto do produto",
                title: result.title,
                description: result.description
            }, { status: 404 });
        }

        console.log(`✅ ${result.title}: ${uploadedUrls.length} imagens hospedadas`);

        return Response.json({
            found: true,
            title: result.title,
            description: result.description || 'Produto encontrado',
            imageUrls: uploadedUrls,
            source: 'Internet'
        }, { status: 200 });

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        return Response.json({
            error: "Erro ao buscar produto",
            details: error.message
        }, { status: 500 });
    }
});