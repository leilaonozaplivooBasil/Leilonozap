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

        // 2. Chamar a API do IPinfo.io
        const apiKey = Deno.env.get("IP_GEOLOCATION_API_KEY");
        if (!apiKey) {
            console.warn('⚠️ API key não configurada, liberando acesso');
            return Response.json({
                isAllowed: true,
                reason: 'Verificação de localização desabilitada',
                location: { ip: clientIp, region: 'N/A', country: 'N/A' }
            });
        }

        const geoResponse = await fetch(`https://ipinfo.io/${clientIp}/json?token=${apiKey}`, {
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (!geoResponse.ok) {
            console.warn(`⚠️ Erro ao consultar IPinfo (${geoResponse.status}), liberando acesso`);
            return Response.json({
                isAllowed: true,
                reason: 'Erro na verificação, acesso liberado por padrão',
                location: { ip: clientIp, region: 'N/A', country: 'N/A' }
            });
        }

        const geoData = await geoResponse.json();
        
        if (!geoData || typeof geoData !== 'object') {
            console.warn('⚠️ Resposta inválida da API, liberando acesso');
            return Response.json({
                isAllowed: true,
                reason: 'Resposta inválida, acesso liberado por padrão',
                location: { ip: clientIp, region: 'N/A', country: 'N/A' }
            });
        }

        console.log('📦 Dados da API IPinfo:', JSON.stringify(geoData));

        // 3. Definir a região permitida
        const allowedCountry = "BR"; // Brasil
        const allowedRegion = "RJ";   // Rio de Janeiro

        // 4. Verificar se está na região permitida
        let isAllowed = false;
        let reason = "";

        if (geoData.country !== allowedCountry) {
            reason = `País não permitido: ${geoData.country || 'N/A'}`;
        } else if (geoData.region !== allowedRegion) {
            reason = `Estado não permitido: ${geoData.region || 'N/A'}`;
        } else {
            isAllowed = true;
            reason = "Localização permitida";
        }

        console.log(`✅ Resultado: ${isAllowed ? 'PERMITIDO' : 'BLOQUEADO'} - ${reason}`);

        return Response.json({
            isAllowed,
            reason,
            location: {
                ip: clientIp,
                city: geoData.city || 'N/A',
                region: geoData.region || 'N/A',
                country: geoData.country || 'N/A',
                timezone: geoData.timezone || 'N/A',
                coordinates: geoData.loc || 'N/A'
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