import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: "Acesso negado" }, { status: 403 });
        }

        const { client_id, client_secret, cep_origem } = await req.json();

        if (!client_id || !client_secret) {
            return Response.json({ error: "Client ID e Secret são obrigatórios" }, { status: 400 });
        }

        // Tentar gerar token
        const tokenResponse = await fetch('https://api.correios.com.br/token/v1/autenticar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                numero: client_id
            })
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            return Response.json({ 
                success: false,
                message: "Erro ao autenticar com Correios",
                details: errorText
            });
        }

        const tokenData = await tokenResponse.json();
        const token = tokenData.token;

        // Fazer cálculo de teste (São Paulo - Centro)
        const testResponse = await fetch('https://api.correios.com.br/preco/v1/nacional', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cepOrigem: cep_origem || '22790-703',
                cepDestino: '01001-000',
                peso: '1',
                comprimento: '20',
                altura: '10',
                largura: '15',
                servicos: ['04014', '04510']
            })
        });

        if (!testResponse.ok) {
            const errorText = await testResponse.text();
            return Response.json({ 
                success: false,
                message: "Token gerado, mas erro ao calcular frete de teste",
                details: errorText
            });
        }

        const testData = await testResponse.json();

        return Response.json({ 
            success: true,
            message: "✅ Conexão bem-sucedida!",
            testResult: testData
        });

    } catch (error) {
        console.error('Erro em testCorreiosConnection:', error);
        return Response.json({ 
            success: false,
            message: "Erro ao testar conexão",
            details: error.message 
        }, { status: 500 });
    }
});