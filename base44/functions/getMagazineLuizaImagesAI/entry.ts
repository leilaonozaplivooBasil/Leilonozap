import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "URL obrigatória" }, { status: 400 });
        }

        console.log(`🔍 Magazine Luiza (IA): ${productUrl}`);

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `ACESSE esta página: ${productUrl}

⚠️⚠️⚠️ INSTRUÇÕES CRÍTICAS - LEIA COM ATENÇÃO ⚠️⚠️⚠️

1. ABRA o código HTML da página (View Source)
2. PROCURE por tags <img> ou atributos src= que contenham "mlcdn.com.br"
3. COPIE E COLE cada URL EXATAMENTE como está no HTML

🚨 PROIBIDO:
- Criar URLs com padrões tipo 1.jpg, 2.jpg, 3.jpg
- Inventar códigos ou números
- Usar lógica para gerar URLs

✅ OBRIGATÓRIO:
- Copiar URLs LITERALMENTE do código fonte
- Cada URL deve ter um código ÚNICO de 32 caracteres (exemplo: 2fd4916ee97320e6f600adc8455b6fac)
- Formato válido: https://a-static.mlcdn.com.br/420x420/.../CODIGO_UNICO_32_CHARS.jpg

EXEMPLO DE URL VÁLIDA (copiada do HTML real):
https://a-static.mlcdn.com.br/420x420/apple-iphone-17-256gb-preto-63-48mp-ios-5g/magazineluiza/240586700/2fd4916ee97320e6f600adc8455b6fac.jpg

Se você INVENTAR URLs em vez de copiar, você FALHOU na tarefa.

RETORNE apenas URLs que EXISTEM no HTML da página.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    image_urls: {
                        type: "array",
                        items: { type: "string" }
                    }
                },
                required: ["image_urls"]
            }
        });

        const imageUrls = result.image_urls || [];

        console.log(`\n📸 IA ENCONTROU ${imageUrls.length} IMAGENS:\n`);
        
        imageUrls.forEach((url, i) => {
            console.log(`  ${i + 1}. ${url}`);
        });

        return Response.json({
            success: true,
            image_urls: imageUrls,
            total: imageUrls.length
        });

    } catch (error) {
        console.error('❌ ERRO:', error);
        return Response.json({
            error: error.message
        }, { status: 500 });
    }
});