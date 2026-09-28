// 🔔 O SINO DO CLIENTE — regras puras da tela (28/09/2026). Testadas em
// tests/sinoDoCliente.test.mjs. O que entra no sino é decidido no servidor
// (api/_lib/notificacoesNaTela.js); aqui é só como mostrar.

/** "9+" a partir de 10; vazio quando não há nada novo (o sino fica quieto). */
export function rotuloDoContador(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  if (!v) return '';
  return v > 9 ? '9+' : String(v);
}

/** "agora" · "há 5 min" · "há 2 h" · "ontem" · "há 3 dias" · "12/09" */
export function tempoRelativo(iso, agora = Date.now()) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const min = Math.floor((agora - t) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ontem';
  if (d < 7) return `há ${d} dias`;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(t));
}

/** Só caminho do próprio site vira navegação (nunca um link de fora). */
export function linkSeguro(link) {
  const s = String(link || '');
  return s.startsWith('/') && !s.startsWith('//') ? s : '';
}

/** Marca como lidas, sem esperar o servidor (a tela responde na hora). */
export function marcarLidasLocal(estado, ids = null, agoraISO = new Date().toISOString()) {
  const alvo = ids ? new Set(ids) : null;
  let baixou = 0;
  const itens = (estado?.itens || []).map((n) => {
    if (n.lida_em || (alvo && !alvo.has(n.id))) return n;
    baixou += 1;
    return { ...n, lida_em: agoraISO };
  });
  return { ...estado, itens, naoLidas: Math.max(0, (Number(estado?.naoLidas) || 0) - baixou) };
}

/** Intervalo da consulta: 60–90 s sorteado (abas diferentes não batem juntas). */
export const intervaloDoSino = (sorteio = Math.random()) => 60000 + Math.floor(sorteio * 30000);
