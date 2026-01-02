import { searchGoogleShopping } from './searchGoogleShopping.js';
import { ocrExtractTitle } from './ocrExtractTitle.js';

export async function fallbackSmartSearch({ base44, productTitle, validCurrentPrice, category, imageUrl = null }) {
    console.log(`\n🔄 ═══ MÓDULO 3: FALLBACK SMART SEARCH ═══`);

    let finalSearchTitle = productTitle;

    // 1. Prioriza o título fornecido
    if (productTitle && productTitle.trim()) {
        console.log(`✨ Usando título fornecido: "${productTitle}"`);
    } else if (imageUrl) {
        // 2. Se não tem título, tenta extrair da imagem via OCR
        console.log(`🖼️ Tentando extrair título da imagem via OCR...`);
        const ocrResult = await ocrExtractTitle({ base44, imageUrl, productCategory: category });
        if (ocrResult.success) {
            finalSearchTitle = ocrResult.title;
            console.log(`✅ Título extraído: "${finalSearchTitle}"`);
        } else {
            console.log(`❌ Falha OCR: ${ocrResult.error}`);
            return {
                success: false,
                error: "Não foi possível extrair o título. Forneça um título ou imagem mais clara.",
                errorCode: "OCR_FAILED"
            };
        }
    } else {
        // 3. Se não tem título nem imagem
        console.log(`❌ Nenhum título ou imagem fornecidos.`);
        return {
            success: false,
            error: "Nenhum título ou imagem fornecidos. Digite o título do produto.",
            errorCode: "NO_TITLE_OR_IMAGE"
        };
    }

    // Com o título em mãos, chama o Google Shopping
    console.log(`🚀 Buscando no Google Shopping: "${finalSearchTitle}"`);
    const googleShoppingResult = await searchGoogleShopping({
        base44,
        productTitle: finalSearchTitle,
        validCurrentPrice,
        category
    });

    if (googleShoppingResult.success) {
        googleShoppingResult.comparison.isFallback = true;
        googleShoppingResult.comparison.fallbackMethod = imageUrl ? 'ocr_and_google_shopping' : 'google_shopping_with_input_title';
        return { success: true, comparison: googleShoppingResult.comparison };
    } else {
        return googleShoppingResult;
    }
}