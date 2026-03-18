import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { imageUrl } = await req.json();

        if (!imageUrl) {
            return Response.json({ error: 'URL da imagem é obrigatória' }, { status: 400 });
        }
        
        console.log(`📥 Baixando imagem: ${imageUrl}`);
        
        // BAIXA A IMAGEM COM HEADERS ANTI-BOT
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                'Referer': 'https://www.google.com/'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erro ao baixar: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        if (blob.size === 0) {
            throw new Error('Imagem vazia');
        }

        console.log(`✅ Imagem baixada! Tamanho: ${blob.size} bytes`);
        
        // 🆕 FAZ UPLOAD PARA O STORAGE DO BASE44
        const arrayBuffer = await blob.arrayBuffer();
        const file = new File([arrayBuffer], 'product-image.jpg', { type: blob.type });
        
        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
        
        if (!uploadResult?.file_url) {
            throw new Error('Erro ao fazer upload da imagem');
        }
        
        console.log(`✅ Upload completo: ${uploadResult.file_url}`);

        return Response.json({ 
            uploaded_url: uploadResult.file_url,
            success: true,
            size: blob.size
        });

    } catch (error) {
        console.error('❌ Erro ao processar imagem:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});