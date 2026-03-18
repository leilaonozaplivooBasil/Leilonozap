import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Teste simples de envio de email via Brevo
const BREVO_API_KEY = 'xsmtpsib-2dac89dc7b6c36da8498ca124e41003dfc53f32413c193b74ec22f3183ece960-JYNspueaUHRtbvGV';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }

    try {
        console.log('🧪 [testBrevoEmail] Iniciando teste...');

        const payload = await req.json().catch(() => ({}));
        const { email } = payload;

        if (!email) {
            return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
        }

        console.log('📧 Enviando email de teste para:', email);

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: 'Leilão no Zap',
                    email: 'no-reply@leilaonozap.com'
                },
                to: [{ email: email }],
                subject: '🧪 Teste de Email - Leilão no Zap',
                htmlContent: '<h1>Teste OK!</h1><p>Se você recebeu este email, a integração Brevo está funcionando.</p>'
            })
        });

        console.log('📬 Status Brevo:', response.status);

        const responseText = await response.text();
        console.log('📝 Resposta Brevo:', responseText);

        if (!response.ok) {
            return Response.json({
                success: false,
                error: 'Brevo retornou erro',
                status: response.status,
                details: responseText
            }, { status: 500 });
        }

        return Response.json({
            success: true,
            message: 'Email de teste enviado!',
            brevoResponse: responseText
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        return Response.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});
