import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Pega a chave da OpenAI do ambiente
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (!OPENAI_API_KEY) {
            return Response.json({ 
                error: 'OPENAI_API_KEY não configurada no servidor' 
            }, { status: 500 });
        }

        // Recebe o arquivo de áudio
        const formData = await req.formData();
        const audioFile = formData.get('audio');
        
        if (!audioFile) {
            return Response.json({ 
                error: 'Arquivo de áudio não enviado (campo "audio")' 
            }, { status: 400 });
        }

        // Valida tamanho (máximo 25MB como recomendado pela OpenAI)
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (audioFile.size > maxSize) {
            return Response.json({ 
                error: 'Arquivo muito grande. Máximo 25MB.' 
            }, { status: 400 });
        }

        // Prepara o FormData para a API do Whisper
        const whisperFormData = new FormData();
        whisperFormData.append('file', audioFile);
        whisperFormData.append('model', 'whisper-1');
        whisperFormData.append('language', 'pt'); // Português

        // Chama a API do Whisper
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: whisperFormData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro Whisper API:', errorText);
            throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // Retorna a transcrição
        return Response.json({ 
            success: true,
            transcription: data.text,
            language: data.language || 'pt'
        });

    } catch (error) {
        console.error('Erro na transcrição:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});