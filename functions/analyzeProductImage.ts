import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Log do payload bruto para debug
    const bodyText = await req.text();
    console.log('📥 Payload recebido (primeiros 200 chars):', bodyText.substring(0, 200));
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', parseError.message);
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'IMAGE_ANALYSIS_PARSE_ERROR',
        status: 'error',
        message: 'Payload JSON inválido recebido',
        component_name: 'analyzeProductImage',
        error_details: {
          parseError: parseError.message,
          receivedData: bodyText.substring(0, 500)
        }
      }).catch(() => {});
      
      return Response.json({ error: 'Dados inválidos recebidos' }, { status: 400 });
    }
    
    const { imageFile } = parsedBody;
    
    if (!imageFile) {
      return Response.json({ error: 'Imagem não fornecida' }, { status: 400 });
    }

    console.log('📸 Analisando imagem do produto...');

    // 1. Upload da imagem
    const uploadResult = await base44.integrations.Core.UploadFile({ file: imageFile });
    
    if (!uploadResult?.file_url) {
      return Response.json({ error: 'Falha no upload da imagem' }, { status: 500 });
    }

    console.log('✅ Imagem hospedada:', uploadResult.file_url);

    // 2. Analisar imagem com IA (visão)
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

Seja PRECISO e DETALHADO. Use conhecimento de mercado para estimar preços realistas.`,
      add_context_from_internet: true,
      file_urls: [uploadResult.file_url],
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

    console.log('🧠 Análise completa:', analysis);

    // Log de sucesso
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'IMAGE_ANALYSIS_SUCCESS',
      status: 'success',
      message: 'Imagem analisada com sucesso',
      component_name: 'analyzeProductImage',
      payload: {
        imageUrl: uploadResult.file_url,
        analysis: analysis
      }
    }).catch(() => {});

    return Response.json({
      success: true,
      imageUrl: uploadResult.file_url,
      analysis: analysis
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Erro ao analisar imagem:', error);

    // Log de erro
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'IMAGE_ANALYSIS_FAILED',
        status: 'error',
        message: 'Falha na análise de imagem',
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