import { plataforma } from '@/api/plataformaClient';

// 🕒 Hora do servidor pra calibrar o relógio da sala de leilão.
//
// 26/09/2026 — a função 'getServerTime' NUNCA existiu na Vercel
// (/api/functions/getServerTime devolvia 404: 991 erros "rota de servidor
// não existe" só em 24 h). A sala sempre acabava no endpoint próprio
// (/api/getServerTime, edge, sem banco), mas depois de um 404 e de um log de
// erro a cada calibração. Agora vai direto ao endpoint que existe; a função
// da plataforma fica como fallback, não como primeira tentativa.
// Se tudo falhar, quem chama (calibrateServerOffset) usa o relógio do cliente —
// nunca deixamos a sala travar em "Sincronizando...".
export async function getServerTime(params) {
  try {
    const resp = await fetch('/api/getServerTime', { cache: 'no-store' });
    if (!resp.ok) throw new Error('getServerTime HTTP ' + resp.status);
    const data = await resp.json();
    if (data && typeof data.timestamp === 'number') return { data };
    throw new Error('getServerTime sem timestamp');
  } catch (_) {
    const result = await Promise.race([
      plataforma.functions.invoke('getServerTime', params),
      new Promise((_, reject) => setTimeout(() => reject(new Error('plataforma getServerTime timeout')), 2500)),
    ]);
    const data = result?.data ?? result;
    if (data && typeof data.timestamp === 'number') return { data };
    throw new Error('getServerTime sem timestamp');
  }
}
