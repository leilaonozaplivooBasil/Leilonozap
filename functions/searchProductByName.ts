import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// 🔥 VALIDA SE IMAGEM CARREGA REALMENTE
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

        const { productName } = await req.json();
        if (!productName) {
            return Response.json({ error: "Nome do produto obrigatório" }, { status: 400 });
        }

        console.log(`🔍 Buscando: ${productName}`);

        console.log('🤖 Buscando com IA + Internet...');
        
        const searchResult = await base44.integrations.Core.InvokeLLM({
            prompt: `BUSCA AVANÇADA DE PRODUTO: "${productName}"

TAREFA OBRIGATÓRIA:
1. Busque no Google Shopping, Mercado Livre, Amazon, Magazine Luiza
2. Retorne o nome EXATO do produto
3. Descrição com especificações técnicas (3-5 linhas)
4. CRÍTICO: Retorne URLs COMPLETAS E VÁLIDAS de 5-10 imagens do produto

FORMATO DAS IMAGENS:
- URLs diretas e completas (https://...)
- Formato: .jpg, .jpeg, .png, .webp
- Imagens GRANDES do produto (não miniaturas)
- NÃO incluir logos, ícones ou banners

EXEMPLO DE URL VÁLIDA:
https://http2.mlstatic.com/D_NQ_NP_123456-MLB12345678-000-V.jpg

Se NÃO encontrar: title="PRODUTO_NAO_ENCONTRADO"`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    imageUrls: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 1
                    },
                    marketplace: { type: "string" }
                },
                required: ["title", "description", "imageUrls"]
            }
        });

        let { title, description, imageUrls, marketplace } = searchResult;

        console.log(`📦 Título: ${title}`);
        console.log(`🖼️ Imagens brutas: ${imageUrls?.length || 0}`);

        // VALIDA URLs (menos restritivo)
        imageUrls = (imageUrls || [])
            .filter(url => {
                if (!url || typeof url !== 'string') return false;
                const clean = url.trim();
                return clean.startsWith('http://') || clean.startsWith('https://');
            })
            .map(url => url.split('?')[0].split('#')[0]) // Remove query params
            .filter((url, index, self) => self.indexOf(url) === index) // Remove duplicatas
            .slice(0, 10);

        console.log(`✅ Imagens válidas: ${imageUrls.length}`);

        if (!title || title === 'PRODUTO_NAO_ENCONTRADO') {
            return Response.json({
                error: "Produto não encontrado",
                suggestion: "Tente com marca + modelo (ex: Samsung Galaxy S23)"
            }, { status: 404 });
        }

        return Response.json({
            title: title.substring(0, 200),
            description: (description || 'Produto encontrado').substring(0, 500),
            imageUrls: imageUrls,
            marketplace: marketplace || 'internet',
            searchTerm: productName
        }, { status: 200 });

    } catch (error) {
        console.error('❌', error);
        return Response.json({
            error: "Erro ao buscar produto",
            details: error.message
        }, { status: 500 });
    }
});