import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export async function ocrExtractTitle({ base44, imageUrl, productCategory }) {
    console.log(`\n📸 ═══ EXTRAÇÃO DE TÍTULO VIA OCR ═══`);
    console.log(`🔗 Imagem: ${imageUrl}`);

    if (!imageUrl) {
        return { success: false, error: "URL da imagem é obrigatória para OCR." };
    }

    try {
        const llmPrompt = `Você é um assistente especializado em extrair o título principal de um produto a partir de uma imagem.
        
INSTRUÇÕES:
- Analise a imagem fornecida
- Identifique o nome mais proeminente do produto (título principal)
- Priorize textos grandes, centralizados, ou que descrevam o item principal
- Desconsidere textos de promoções, detalhes menores ou nomes de lojas
- Categoria do produto: ${productCategory}

RETORNE APENAS O TÍTULO EXTRAÍDO. Se não identificar, retorne "Título não identificado".`;

        const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: llmPrompt,
            file_urls: [imageUrl],
            add_context_from_internet: false,
        });

        const extractedTitle = llmResult;

        if (extractedTitle && extractedTitle !== "Título não identificado") {
            console.log(`✅ Título extraído: "${extractedTitle}"`);
            return { success: true, title: extractedTitle };
        } else {
            console.log(`❌ OCR não identificou o título.`);
            return { success: false, error: "Não foi possível extrair o título da imagem." };
        }

    } catch (error) {
        console.error(`❌ Erro no OCR:`, error);
        return { success: false, error: `Erro ao processar imagem: ${error.message}` };
    }
}