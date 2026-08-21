import { plataforma } from '@/api/plataformaClient';

// Hora do servidor pra calibrar o relógio da sala de leilão.
// 1º tenta a função Base44 (hora canônica) com timeout curto;
// 2º cai no endpoint próprio da Vercel (/api/getServerTime), que sempre responde.
// Se ambos falharem, quem chama (calibrateServerOffset) usa o relógio do cliente —
// nunca deixamos a sala travar em "Sincronizando...".
export async function getServerTime(params) {
  try {
    const result = await Promise.race([
      plataforma.functions.invoke('getServerTime', params),
      new Promise((_, reject) => setTimeout(() => reject(new Error('plataforma getServerTime timeout')), 2500)),
    ]);
    const data = result?.data ?? result;
    if (data && typeof data.timestamp === 'number') return { data };
    throw new Error('Base44 getServerTime sem timestamp');
  } catch (_) {
    const resp = await fetch('/api/getServerTime', { cache: 'no-store' });
    if (!resp.ok) throw new Error('getServerTime fallback HTTP ' + resp.status);
    const data = await resp.json();
    return { data };
  }
}
