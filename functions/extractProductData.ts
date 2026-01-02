import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: "Acesso não autorizado" }, { status: 401 });
        }
        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "URL do produto é obrigatória" }, { status: 400 });
        }
        // TAREFA SIMPLIFICADA: A IA agora só busca texto.
        const prompt = `Analise o conteúdo da página do produto nesta URL: ${productUrl}. Extraia as seguintes informações em português:
        1.  'title': O nome completo e exato do produto.
        2.  'description': A descrição técnica e de marketing do produto. Combine os detalhes técnicos e a descrição principal em um texto único e coeso.`;
        const schema = {
            "type": "object",
            "properties": {
                "title": { "type": "string" },
                "description": { "type": "string" }
            },
            "required": ["title", "description"]
        };
        // A chamada à IA permanece a mesma, mas com uma tarefa mais simples.
        const extractedData = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            add_context_from_internet: true,
            response_json_schema: schema
        });
        if (!extractedData || !extractedData.title) {
            throw new Error("A IA não conseguiu extrair os dados de texto. Verifique a URL.");
        }
        return Response.json(extractedData);
    } catch (error) {
        console.error('Erro na função extractProductData:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});