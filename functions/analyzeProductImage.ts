import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      return Response.json({ error: 'URL da imagem nao fornecida' }, { status: 400 });
    }

    console.log('📸 Analisando imagem:', imageUrl);

    // Analisar imagem com IA (visao)
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analise esta imagem de produto e extraia as seguintes informações:

1. **Título do produto** (nome comercial exato, marca + modelo)
2. **Descrição detalhada** (especificações, características, estado aparente)
3. **Categoria** (escolha UMA das opções):
   - eletronicos
   - eletrodomesticos
   - moveis_decoracao
   - casa_jardim
   - ferramentas
   - roupas_acessorios
   - esportes_lazer
   - brinquedos_hobbies
   - livros_midia
   - veiculos_pecas
   - instrumentos_musicais
   - beleza_cuidado_pessoal
   - outros
4. **Preço estimado de mercado** (valor em reais, pesquise mentalmente)
5. **Estado do produto** (novo, usado, com avarias, etc)

Seja PRECISO e DETALHADO. Use conhecimento de mercado para estimar precos realistas.`,
      add_context_from_internet: true,
      file_urls: [imageUrl],
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { 
            type: "string",
            enum: [
              "eletronicos", "eletrodomesticos", "moveis_decoracao", 
              "casa_jardim", "ferramentas", "roupas_acessorios",
              "esportes_lazer", "brinquedos_hobbies", "livros_midia",
              "veiculos_pecas", "instrumentos_musicais", 
              "beleza_cuidado_pessoal", "outros"
            ]
          },
          estimated_price: { type: "number" },
          condition: { type: "string" }
        },
        required: ["title", "description", "category", "estimated_price", "condition"]
      }
    });

    console.log('🧠 Analise completa:', analysis);

    // Log de sucesso
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'IMAGE_ANALYSIS_SUCCESS',
      status: 'success',
      message: 'Imagem analisada com sucesso',
      component_name: 'analyzeProductImage',
      payload: {
        imageUrl: imageUrl,
        analysis: analysis
      }
    }).catch(() => {});

    return Response.json({
      success: true,
      imageUrl: imageUrl,
      analysis: analysis
    }, { status: 200 });

  } catch (error) {
    console.error('Erro ao analisar imagem:', error);

    // Log de erro
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'IMAGE_ANALYSIS_FAILED',
        status: 'error',
        message: 'Falha na analise de imagem',
        component_name: 'analyzeProductImage',
        error_details: {
          message: error.message,
          stack: error.stack
        }
      });
    } catch {}

    return Response.json({ 
      error: error.message,
      details: 'Erro ao processar imagem'
    }, { status: 500 });
  }
});