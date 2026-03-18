import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        // 🔐 AUTENTICAÇÃO
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ 
                error: 'Acesso negado. Apenas administradores podem importar produtos.' 
            }, { status: 403 });
        }

        // 📥 RECEBE A URL DA PLANILHA
        const { sheetUrl } = await req.json();
        
        if (!sheetUrl) {
            return Response.json({ 
                error: 'URL da planilha é obrigatória' 
            }, { status: 400 });
        }

        console.log('📊 Baixando planilha:', sheetUrl);

        // 🔗 EXTRAI O ID DA PLANILHA
        let sheetId = '';
        
        if (sheetUrl.includes('/d/')) {
            sheetId = sheetUrl.split('/d/')[1].split('/')[0];
        } else if (sheetUrl.includes('id=')) {
            sheetId = sheetUrl.split('id=')[1].split('&')[0];
        }
        
        if (!sheetId) {
            return Response.json({ 
                error: 'Link inválido. Use o link completo da planilha do Google Sheets.' 
            }, { status: 400 });
        }

        // 🌐 MONTA URL DO CSV
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
        
        console.log('📥 Tentando baixar de:', csvUrl);

        // 🔄 FAZ O DOWNLOAD DO CSV (SERVIDOR FAZ O REQUEST, NÃO O BROWSER)
        const response = await fetch(csvUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            if (response.status === 403 || response.status === 401) {
                return Response.json({ 
                    error: 'Acesso negado à planilha. Certifique-se de que está pública (Qualquer pessoa com o link pode ver).' 
                }, { status: 403 });
            }
            
            if (response.status === 404) {
                return Response.json({ 
                    error: 'Planilha não encontrada. Verifique se o link está correto.' 
                }, { status: 404 });
            }
            
            throw new Error(`Erro ao baixar planilha: ${response.status} ${response.statusText}`);
        }

        const csvBlob = await response.blob();
        
        if (csvBlob.size === 0) {
            return Response.json({ 
                error: 'A planilha está vazia ou inacessível.' 
            }, { status: 400 });
        }

        console.log(`✅ CSV baixado com sucesso: ${csvBlob.size} bytes`);

        // 📤 FAZ UPLOAD DO CSV PARA O STORAGE DO BASE44
        const csvFile = new File([csvBlob], 'planilha.csv', { type: 'text/csv' });
        
        const uploadResult = await base44.integrations.Core.UploadFile({ file: csvFile });
        
        if (!uploadResult?.file_url) {
            throw new Error('Falha ao fazer upload do arquivo processado');
        }

        console.log('✅ Arquivo enviado:', uploadResult.file_url);

        // ✅ RETORNA SUCESSO
        return Response.json({ 
            file_url: uploadResult.file_url,
            size: csvBlob.size,
            success: true
        }, { status: 200 });

    } catch (error) {
        console.error('❌ Erro na função downloadGoogleSheet:', error);
        
        return Response.json({ 
            error: error.message || 'Erro desconhecido ao processar planilha',
            details: error.toString()
        }, { status: 500 });
    }
});