// ⏳ Quanto falta, e o que a tela faz com isso. Ver src/lib/urgenciaDoLeilao.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  urgenciaDoLeilao, pilulaDaUrgencia, recadoDaUrgencia,
  MINUTOS_CRITICO, MINUTOS_ATENCAO,
} from '../src/lib/urgenciaDoLeilao.js';

const AGORA = Date.parse('2026-09-19T20:00:00Z');
const daquiA = (min) => new Date(AGORA + min * 60000).toISOString();

test('seis dias é normal — não vai piscar a vitrine inteira', () => {
  assert.equal(urgenciaDoLeilao(daquiA(6 * 24 * 60), AGORA), 'normal');
});

test('a última hora é atenção, e o último minuto é crítico', () => {
  assert.equal(urgenciaDoLeilao(daquiA(59), AGORA), 'atencao');
  assert.equal(urgenciaDoLeilao(daquiA(9), AGORA), 'critico');
  assert.equal(urgenciaDoLeilao(daquiA(1), AGORA), 'critico');
});

test('as bordas das faixas ficam na faixa mais urgente, nunca na de baixo', () => {
  assert.equal(urgenciaDoLeilao(daquiA(MINUTOS_CRITICO), AGORA), 'critico', '10 min ainda é crítico');
  assert.equal(urgenciaDoLeilao(daquiA(MINUTOS_CRITICO + 0.5), AGORA), 'atencao');
  assert.equal(urgenciaDoLeilao(daquiA(MINUTOS_ATENCAO), AGORA), 'atencao', '60 min ainda é atenção');
  assert.equal(urgenciaDoLeilao(daquiA(MINUTOS_ATENCAO + 0.5), AGORA), 'normal');
});

test('prazo vencido, ausente ou ilegível é encerrado — a tela não promete contagem', () => {
  assert.equal(urgenciaDoLeilao(daquiA(-1), AGORA), 'encerrado');
  assert.equal(urgenciaDoLeilao(daquiA(0), AGORA), 'encerrado');
  assert.equal(urgenciaDoLeilao(null, AGORA), 'encerrado');
  assert.equal(urgenciaDoLeilao(undefined, AGORA), 'encerrado');
  assert.equal(urgenciaDoLeilao('ontem de manhã', AGORA), 'encerrado');
});

test('🔴 só o crítico pulsa — se a última hora piscasse, nada mais chamaria atenção', () => {
  assert.match(pilulaDaUrgencia('critico'), /animate-pulse/);
  assert.doesNotMatch(pilulaDaUrgencia('atencao'), /animate-pulse/);
  assert.doesNotMatch(pilulaDaUrgencia('normal'), /animate-pulse/);
});

test('🎬 o pulso desliga para quem pediu menos movimento — a cor é que sustenta o aviso', () => {
  const critico = pilulaDaUrgencia('critico');
  assert.match(critico, /motion-reduce:animate-none/);
  assert.match(critico, /text-nz-fogo-claro/, 'a cor precisa existir sem depender do pulso');
});

test('cada faixa tem a sua cor, e nenhuma repete a da outra', () => {
  const cores = ['critico', 'atencao', 'normal'].map(pilulaDaUrgencia);
  assert.equal(new Set(cores).size, 3);
});

test('o recado só aparece quando há o que avisar', () => {
  assert.equal(recadoDaUrgencia('critico'), 'fechando');
  assert.equal(recadoDaUrgencia('atencao'), 'última hora');
  assert.equal(recadoDaUrgencia('normal'), '');
  assert.equal(recadoDaUrgencia('encerrado'), '');
});
