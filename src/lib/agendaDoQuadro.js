// 📅 A AGENDA A PARTIR DO CARD DO QUADRO — a regra, testável sem navegador.
//
// 23/09/2026 — pedido: "qualificar lead + Google Agenda pelo quadro".
//
// A conexão com o Google JÁ EXISTE (src/lib/googleAgenda.js + o Método): token
// na memória, conta lembrada, criação real do evento pela Calendar API. Este
// arquivo NÃO reinventa nada disso — só responde a pergunta que faltava:
// "o que vira evento, a partir de um card?". O corpo do evento é o MESMO do
// Método (eventoGoogleDaReuniao), pra alarme e fuso saírem iguais.
//
// E tem o FALLBACK: quem não conectou a conta (ou negou) ganha um LINK
// pré-preenchido que abre o evento pronto no Google Calendar — um toque, sem
// senha, funciona no celular. O mesmo objeto alimenta os dois caminhos.
import { eventoGoogleDaReuniao } from './metodo.js';

const pad = (n) => String(n).padStart(2, '0');

/** O instante em que o card começa: prazo + hora. Sem hora, 09:00. Sem prazo, o dia de hoje. */
export function inicioDoCartao(cartao, { hojeISO = null } = {}) {
  const dia = String(cartao?.prazo || hojeISO || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  const hora = /^\d{2}:\d{2}/.test(String(cartao?.hora || '')) ? String(cartao.hora).slice(0, 5) : '09:00';
  return `${dia}T${hora}:00`;
}

/** Quantos minutos o card dura: hora_fim − hora; sem fim, 60. */
export function duracaoDoCartao(cartao) {
  const h = String(cartao?.hora || ''); const f = String(cartao?.hora_fim || '');
  if (!/^\d{2}:\d{2}/.test(h) || !/^\d{2}:\d{2}/.test(f)) return 60;
  const [h1, m1] = h.split(':').map(Number); const [h2, m2] = f.split(':').map(Number);
  const min = (h2 * 60 + m2) - (h1 * 60 + m1);
  return min > 0 ? min : 60;
}

/**
 * O evento, no formato da Calendar API — pronto pro insert E pro link.
 * Devolve null quando não dá pra saber quando é (sem prazo e sem hoje).
 */
export function eventoDoCartao(cartao, { clienteNome = null, hojeISO = null, quadroUrl = '' } = {}) {
  const inicio = inicioDoCartao(cartao, { hojeISO });
  if (!inicio) return null;
  const titulo = clienteNome ? `${cartao?.titulo || 'Compromisso'} — ${clienteNome}` : (cartao?.titulo || 'Compromisso — Leilão NoZap');
  const linhas = [
    cartao?.detalhe ? String(cartao.detalhe) : '',
    clienteNome ? `Cliente: ${clienteNome}` : '',
    'Veio do Quadro de Compromisso — Leilão NoZap.',
    quadroUrl ? `Abrir o quadro: ${quadroUrl}` : '',
  ].filter(Boolean);
  return eventoGoogleDaReuniao({ titulo, inicio, duracaoMin: duracaoDoCartao(cartao), detalhes: linhas.join('\n') });
}

/** "2026-09-24T09:00:00" → "20260924T090000" (o formato que o link do Google lê). */
const compacto = (s) => String(s).replace(/[-:]/g, '').slice(0, 15);

/**
 * O link que abre o evento PRÉ-PREENCHIDO no Google Calendar da pessoa.
 * É o fallback de quem não conectou a conta: não sincroniza de volta, mas
 * não pede senha nem servidor.
 */
export function linkGoogleAgenda(evento) {
  if (!evento?.start?.dateTime || !evento?.end?.dateTime) return null;
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: evento.summary || '',
    dates: `${compacto(evento.start.dateTime)}/${compacto(evento.end.dateTime)}`,
    details: evento.description || '',
    ctz: evento.start.timeZone || 'America/Sao_Paulo',
  });
  if (evento.location) q.set('location', evento.location);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** yyyy-mm-dd do início — é o que vira `follow_up_date` no cliente. */
export function diaDoEvento(evento) {
  const s = String(evento?.start?.dateTime || '');
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

export const _pad = pad;
