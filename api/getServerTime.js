// getServerTime — hora do servidor (epoch ms) pra sincronizar o relógio da sala de leilão.
// Fallback quando a função Base44 'getServerTime' estiver fora do ar: sem uma fonte de tempo
// a sala trava em "Sincronizando..." e nenhum lance é aceito.
export const config = { runtime: 'edge' };

export default function handler() {
  return new Response(JSON.stringify({ timestamp: Date.now() }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store, max-age=0',
      'access-control-allow-origin': '*',
    },
  });
}
