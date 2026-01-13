import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const url = new URL(req.url);
        
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');
        const errorDesc = url.searchParams.get('error_description');

        console.log('📥 OLX Callback recebido');

        let statusType = 'loading';
        let message = '';
        let description = '';

        if (error) {
            console.log('❌ Erro OAuth:', error);
            statusType = 'error';
            message = error;
            description = errorDesc || 'Não foi possível completar a autorização';
        } else if (!code) {
            statusType = 'error';
            message = 'invalid_request';
            description = 'Código de autorização não recebido';
        } else {
            console.log('✅ Code recebido (salvo de forma segura)');

            // Obter usuário atual (se estiver logado)
            let currentUser = null;
            try {
                currentUser = await base44.auth.me();
            } catch (e) {
                console.log('ℹ️ Usuário não autenticado');
            }

            // Salvar token no banco
            await base44.entities.OAuthToken.create({
                provider: 'olx',
                code: code,
                state: state || '',
                user_id: currentUser?.id || 'anonymous',
                status: 'pending'
            });

            console.log('✅ Token salvo com sucesso');
            statusType = 'success';
            message = 'Autorização da OLX Concluída';
            description = 'Sua conta foi autorizada com sucesso. Você pode fechar esta página.';
        }

        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OLX Callback - Leilão NoZap</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #111827;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .card {
            background: #1f2937;
            border-radius: 1rem;
            border: 1px solid #374151;
            max-width: 28rem;
            width: 100%;
            padding: 2rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .icon-container {
            width: 4rem;
            height: 4rem;
            margin: 0 auto 1.5rem;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .icon-success {
            background: rgba(34, 197, 94, 0.2);
        }
        .icon-error {
            background: rgba(239, 68, 68, 0.2);
        }
        .icon-loading {
            background: rgba(34, 197, 94, 0.2);
        }
        .icon {
            width: 2.5rem;
            height: 2.5rem;
        }
        .success-icon {
            color: #22c55e;
        }
        .error-icon {
            color: #ef4444;
        }
        .loading-icon {
            color: #22c55e;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        h1 {
            color: white;
            font-size: 1.25rem;
            font-weight: 600;
            text-align: center;
            margin-bottom: 1rem;
        }
        .description {
            color: #d1d5db;
            text-align: center;
            margin-bottom: 1.5rem;
            line-height: 1.5;
        }
        .error-box {
            background: rgba(17, 24, 39, 0.5);
            border-radius: 0.5rem;
            padding: 1rem;
            margin-bottom: 1.5rem;
        }
        .error-message {
            color: #f87171;
            text-align: center;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        .error-description {
            color: #9ca3af;
            text-align: center;
            font-size: 0.875rem;
        }
        .button {
            width: 100%;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 0.5rem;
            padding: 0.75rem 1rem;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            transition: background 0.2s;
        }
        .button:hover {
            background: #059669;
        }
        .button-secondary {
            background: #374151;
        }
        .button-secondary:hover {
            background: #4b5563;
        }
    </style>
</head>
<body>
    <div class="card">
        ${statusType === 'success' ? `
            <div class="icon-container icon-success">
                <svg class="icon success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
            <h1>${message}</h1>
            <p class="description">${description}</p>
            <button class="button" onclick="window.location.href='/'">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 1rem; height: 1rem;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                Voltar para Início
            </button>
        ` : statusType === 'error' ? `
            <div class="icon-container icon-error">
                <svg class="icon error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </div>
            <h1>Não Foi Possível Autorizar</h1>
            <div class="error-box">
                <p class="error-message">${message || 'Erro desconhecido'}</p>
                ${description ? `<p class="error-description">${description}</p>` : ''}
            </div>
            <button class="button button-secondary" onclick="window.location.href='/'">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 1rem; height: 1rem;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                Voltar para Início
            </button>
        ` : `
            <div class="icon-container icon-loading">
                <svg class="icon loading-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
            </div>
            <h1>Processando...</h1>
            <p class="description">Processando autorização da OLX...</p>
        `}
    </div>
</body>
</html>
        `;

        return new Response(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8'
            }
        });

    } catch (error) {
        console.error('❌ Erro ao processar callback:', error);
        
        const errorHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erro - OLX Callback</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #111827;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 1rem;
        }
        .error-container {
            text-align: center;
            max-width: 28rem;
        }
        h1 { color: #ef4444; margin-bottom: 1rem; }
        p { color: #d1d5db; margin-bottom: 2rem; }
        a {
            display: inline-block;
            background: #374151;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 600;
        }
        a:hover { background: #4b5563; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>Erro ao Processar Callback</h1>
        <p>${error.message}</p>
        <a href="/">Voltar para Início</a>
    </div>
</body>
</html>
        `;
        
        return new Response(errorHtml, {
            status: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
});