/**
 * 🕐 FUNÇÃO CRÍTICA: RETORNA O TEMPO EXATO DO SERVIDOR
 * Esta função é a ÚNICA fonte confiável de tempo no sistema.
 * NUNCA confie no Date.now() do cliente!
 */

Deno.serve((req) => {
    try {
        // ⏰ TEMPO REAL DO SERVIDOR (milliseconds desde epoch)
        const serverNow = Date.now();
        const serverDate = new Date(serverNow);

        return new Response(JSON.stringify({ 
            timestamp: serverNow,
            iso: serverDate.toISOString(),
            timezone: 'UTC'
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error) {
        console.error("❌ Erro ao obter tempo do servidor:", error);
        return new Response(JSON.stringify({ 
            error: error.message 
        }), { 
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
});