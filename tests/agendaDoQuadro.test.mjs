// 📅 O evento que nasce do card do quadro — ver src/lib/agendaDoQuadro.js.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { inicioDoCartao, duracaoDoCartao, eventoDoCartao, linkGoogleAgenda, diaDoEvento } from '../src/lib/agendaDoQuadro.js';

describe('quando o card começa e quanto dura', () => {
  test('prazo + hora', () => assert.equal(inicioDoCartao({ prazo: '2026-09-24', hora: '14:30' }), '2026-09-24T14:30:00'));
  test('sem hora, 09:00 — não pode virar meia-noite', () => assert.equal(inicioDoCartao({ prazo: '2026-09-24' }), '2026-09-24T09:00:00'));
  test('sem prazo usa o dia de hoje; sem os dois, null', () => {
    assert.equal(inicioDoCartao({ hora: '10:00' }, { hojeISO: '2026-09-23' }), '2026-09-23T10:00:00');
    assert.equal(inicioDoCartao({}), null);
  });
  test('prazo com hora dentro (ISO longo) é cortado no dia', () => assert.equal(inicioDoCartao({ prazo: '2026-09-24T00:00:00.000Z', hora: '08:00' }), '2026-09-24T08:00:00'));
  test('duração = fim − início; sem fim ou fim antes do início, 60', () => {
    assert.equal(duracaoDoCartao({ hora: '14:00', hora_fim: '15:30' }), 90);
    assert.equal(duracaoDoCartao({ hora: '14:00' }), 60);
    assert.equal(duracaoDoCartao({ hora: '14:00', hora_fim: '13:00' }), 60);
  });
});

describe('o evento', () => {
  const cartao = { titulo: 'Apresentar o Método', detalhe: 'levar o material', prazo: '2026-09-24', hora: '14:00', hora_fim: '15:00' };
  test('título traz o cliente; corpo traz detalhe, cliente e a origem', () => {
    const e = eventoDoCartao(cartao, { clienteNome: 'Ângela Conceição', quadroUrl: 'https://x/quadro' });
    assert.equal(e.summary, 'Apresentar o Método — Ângela Conceição');
    assert.match(e.description, /levar o material/); assert.match(e.description, /Cliente: Ângela Conceição/);
    assert.match(e.description, /Quadro de Compromisso/); assert.match(e.description, /https:\/\/x\/quadro/);
    assert.equal(e.start.dateTime, '2026-09-24T14:00:00'); assert.equal(e.end.dateTime, '2026-09-24T15:00:00');
    assert.equal(e.start.timeZone, 'America/Sao_Paulo');
  });
  test('🔔 o alarme do Método vem junto (30 e 10 min)', () => {
    const e = eventoDoCartao(cartao);
    assert.deepEqual(e.reminders.overrides.map((o) => o.minutes), [30, 10]);
  });
  test('sem cliente o título é só o do card', () => assert.equal(eventoDoCartao(cartao).summary, 'Apresentar o Método'));
  test('sem quando, null (a tela não pode montar link vazio)', () => assert.equal(eventoDoCartao({ titulo: 'x' }), null));
  test('diaDoEvento vira o follow_up_date', () => assert.equal(diaDoEvento(eventoDoCartao(cartao)), '2026-09-24'));
});

describe('o link de fallback', () => {
  test('abre o Google Calendar com título, datas e fuso', () => {
    const e = eventoDoCartao({ titulo: 'Reunião', prazo: '2026-09-24', hora: '14:00', hora_fim: '15:00' }, { clienteNome: 'José' });
    const u = new URL(linkGoogleAgenda(e));
    assert.equal(u.origin + u.pathname, 'https://calendar.google.com/calendar/render');
    assert.equal(u.searchParams.get('action'), 'TEMPLATE');
    assert.equal(u.searchParams.get('text'), 'Reunião — José');
    assert.equal(u.searchParams.get('dates'), '20260924T140000/20260924T150000');
    assert.equal(u.searchParams.get('ctz'), 'America/Sao_Paulo');
    assert.match(u.searchParams.get('details'), /Cliente: José/);
  });
  test('evento nulo não vira link', () => assert.equal(linkGoogleAgenda(null), null));
});
