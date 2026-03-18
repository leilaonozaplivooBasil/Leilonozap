import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Obter o IP do cliente
        const clientIp = req.headers.get('X-Forwarded-For')?.split(',')[0].trim() || 
                        req.headers.get('CF-Connecting-IP') || 
                        req.headers.get('X-Real-IP') ||
                        '127.0.0.1';

        console.log(`📍 Verificando localização para IP: ${clientIp}`);

        // 🆕 SISTEMA SEMPRE LIBERA ACESSO (geolocalização desativada temporariamente)
        return Response.json({
            isAllowed: true,
            reason: 'Sistema de geolocalização temporariamente desabilitado',
            location: { 
                ip: clientIp, 
                region: 'BR', 
                country: 'BR',
                city: 'N/A',
                timezone: 'N/A',
                coordinates: 'N/A'
            }
        });

    } catch (error) {
        console.error('❌ Erro na verificação de localização:', error);
        // Em caso de erro, libera o acesso por padrão (fail-safe)
        return Response.json({ 
            isAllowed: true,
            reason: 'Erro na verificação, acesso liberado por padrão',
            location: { ip: 'N/A', region: 'N/A', country: 'N/A' }
        }, { status: 200 });
    }
});