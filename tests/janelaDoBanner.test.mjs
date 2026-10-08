// 🕛 JANELA DE DATAS DO BANNER (08/10/2026) — três artes de um leilão de TV
// (3, 2 e 1 dia), cada uma entrando e saindo sozinha à meia-noite de Brasília.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dentroDaJanela, filtrarPorJanela, proximaVirada,
  paraISOBrasilia, deISOBrasilia, rotuloDeData, validarJanela, situacaoDoBanner,
} from '../src/lib/janelaDoBanner.js';

const T = (iso) => new Date(iso).getTime();

test('o horário digitado é o de Brasília: meia-noite de lá = 03:00 em UTC', () => {
  assert.equal(paraISOBrasilia('2026-10-12T00:00'), '2026-10-12T03:00:00.000Z');
  assert.equal(paraISOBrasilia('2026-10-12T21:30'), '2026-10-13T00:30:00.000Z');
  assert.equal(paraISOBrasilia(''), null);
  assert.equal(paraISOBrasilia('12/10/2026'), null);
  assert.equal(paraISOBrasilia(null), null);
});

test('ida e volta: o que o painel mostra é o que o dono digitou', () => {
  for (const v of ['2026-10-12T00:00', '2026-12-31T23:59', '2026-01-01T00:00']) {
    assert.equal(deISOBrasilia(paraISOBrasilia(v)), v);
  }
  assert.equal(deISOBrasilia('2026-10-12T03:00:00.000Z'), '2026-10-12T00:00');
  assert.equal(deISOBrasilia(null), '');
  assert.equal(deISOBrasilia('lixo'), '');
});

test('rótulo legível: "12/10 às 00:00"', () => {
  assert.equal(rotuloDeData('2026-10-12T03:00:00.000Z'), '12/10 às 00:00');
  assert.equal(rotuloDeData(null), '');
});

test('sem datas o banner vale sempre; com datas, início inclusivo e fim exclusivo', () => {
  assert.equal(dentroDaJanela({}, T('2030-01-01T00:00:00Z')), true);
  const b = { starts_at: '2026-10-12T03:00:00.000Z', ends_at: '2026-10-13T03:00:00.000Z' };
  assert.equal(dentroDaJanela(b, T('2026-10-12T02:59:59.999Z')), false, 'antes da meia-noite ainda não');
  assert.equal(dentroDaJanela(b, T('2026-10-12T03:00:00.000Z')), true, 'na meia-noite já entra');
  assert.equal(dentroDaJanela(b, T('2026-10-13T02:59:59.999Z')), true);
  assert.equal(dentroDaJanela(b, T('2026-10-13T03:00:00.000Z')), false, 'na meia-noite seguinte já saiu');
  assert.equal(dentroDaJanela({ starts_at: '2026-10-12T03:00:00.000Z' }, T('2027-01-01Z')), true, 'só início: sem fim');
  assert.equal(dentroDaJanela({ ends_at: '2026-10-12T03:00:00.000Z' }, T('2026-10-01Z')), true, 'só fim: já vale');
  assert.equal(dentroDaJanela({ starts_at: 'lixo', ends_at: '' }, T('2026-10-01Z')), true, 'data ilegível não esconde banner');
});

test('a esteira da TV: em cada instante, UMA arte no ar — sem lacuna e sem sobreposição', () => {
  const D = (dia) => `2026-10-${dia}T03:00:00.000Z`; // 00:00 de Brasília
  const esteira = [
    { id: 'tres', starts_at: D('09'), ends_at: D('10') },
    { id: 'dois', starts_at: D('10'), ends_at: D('11') },
    { id: 'um', starts_at: D('11'), ends_at: D('12') },
  ];
  const noAr = (iso) => filtrarPorJanela(esteira, T(iso)).map((b) => b.id);
  assert.deepEqual(noAr('2026-10-09T02:00:00Z'), [], 'antes da primeira');
  assert.deepEqual(noAr('2026-10-09T15:00:00Z'), ['tres']);
  assert.deepEqual(noAr('2026-10-10T02:59:59Z'), ['tres']);
  assert.deepEqual(noAr('2026-10-10T03:00:00Z'), ['dois'], 'virou a meia-noite');
  assert.deepEqual(noAr('2026-10-11T03:00:00Z'), ['um']);
  assert.deepEqual(noAr('2026-10-12T03:00:00Z'), [], 'depois da última');
});

test('a próxima virada: o instante exato em que a tela deve reavaliar', () => {
  const esteira = [
    { starts_at: '2026-10-09T03:00:00.000Z', ends_at: '2026-10-10T03:00:00.000Z' },
    { starts_at: '2026-10-10T03:00:00.000Z', ends_at: '2026-10-11T03:00:00.000Z' },
  ];
  assert.equal(proximaVirada(esteira, T('2026-10-08T12:00:00Z')), T('2026-10-09T03:00:00Z'));
  assert.equal(proximaVirada(esteira, T('2026-10-09T12:00:00Z')), T('2026-10-10T03:00:00Z'));
  assert.equal(proximaVirada(esteira, T('2026-10-20T12:00:00Z')), null, 'tudo no passado: nada a esperar');
  assert.equal(proximaVirada([{}, null], T('2026-10-08Z')), null);
});

test('validação: o fim tem que ser depois do início', () => {
  assert.equal(validarJanela('2026-10-12T03:00:00Z', '2026-10-13T03:00:00Z'), null);
  assert.match(validarJanela('2026-10-13T03:00:00Z', '2026-10-12T03:00:00Z'), /depois do início/);
  assert.match(validarJanela('2026-10-12T03:00:00Z', '2026-10-12T03:00:00Z'), /depois do início/);
  assert.equal(validarJanela(null, '2026-10-12T03:00:00Z'), null);
  assert.equal(validarJanela('2026-10-12T03:00:00Z', null), null);
});

test('validação: saída que já passou é recusada (o banner sumiria na hora); só saída, sem entrada, vale se for futura', () => {
  const agora = T('2026-10-08T21:00:00Z');
  assert.match(validarJanela(null, '2026-10-08T03:00:00Z', agora), /já passou/);
  assert.match(validarJanela(null, '2026-10-08T21:00:00Z', agora), /já passou/);
  assert.equal(validarJanela(null, '2026-10-09T03:00:00Z', agora), null, 'só saída futura: o banner fica ligado e sai na hora');
  assert.equal(validarJanela('2026-10-09T03:00:00Z', '2026-10-10T03:00:00Z', agora), null, 'entrada e saída futuras');
  assert.equal(validarJanela(null, null, agora), null, 'tirar as datas sempre pode');
  assert.equal(validarJanela(null, '2026-10-08T03:00:00Z'), null, 'sem relógio não confere o passado (regra antiga)');
});

test('o painel descreve cada banner: desligado, agendado, encerrado, no ar', () => {
  const agora = T('2026-10-10T15:00:00Z');
  assert.deepEqual(situacaoDoBanner({ is_active: false }, agora), { estado: 'desligado', texto: 'Desligado' });
  assert.equal(situacaoDoBanner({ is_active: false, starts_at: '2026-10-11T03:00:00Z' }, agora).estado, 'desligado', 'o interruptor manda');
  assert.deepEqual(situacaoDoBanner({ is_active: true, starts_at: '2026-10-11T03:00:00.000Z' }, agora), { estado: 'agendado', texto: 'Entra em 11/10 às 00:00' });
  assert.deepEqual(situacaoDoBanner({ is_active: true, ends_at: '2026-10-10T03:00:00.000Z' }, agora), { estado: 'encerrado', texto: 'Saiu do ar em 10/10 às 00:00' });
  assert.deepEqual(situacaoDoBanner({ is_active: true, ends_at: '2026-10-11T03:00:00.000Z' }, agora), { estado: 'no_ar_com_fim', texto: 'No ar · sai em 11/10 às 00:00' });
  assert.deepEqual(situacaoDoBanner({ is_active: true }, agora), { estado: 'no_ar', texto: 'No ar' });
});
