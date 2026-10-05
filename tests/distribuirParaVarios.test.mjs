// 👥 DISTRIBUIR UMA TAREFA PARA VÁRIAS PESSOAS (24/09/2026).
//
// Dono: "lista completa de usuários do método reunidos para selecionar e
// enviar tarefa de uma vez. Como agora por exemplo o Emannuel queria enviar
// uma tarefa para vários de uma vez."
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { destinatariosDoEnvio, alternarMarcado, todosDaLista, linhasParaVarios, primeiraDeCadaPessoa, resumoDoEnvio } from '../src/lib/distribuirParaVarios.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('modo de sempre: só a pessoa escolhida (e ninguém se não escolheu)', () => {
  assert.deepEqual(destinatariosDoEnvio({ pessoa: 'ana' }), ['ana']);
  assert.deepEqual(destinatariosDoEnvio({ pessoa: null }), []);
  // marcados de antes não vazam pro modo de uma pessoa só
  assert.deepEqual(destinatariosDoEnvio({ pessoa: 'ana', varios: false, marcados: ['bia', 'caio'] }), ['ana']);
});

test('várias pessoas: os marcados, na ordem, sem repetir e sem vazio', () => {
  assert.deepEqual(destinatariosDoEnvio({ pessoa: 'ana', varios: true, marcados: ['bia', 'caio', 'bia', '', null] }), ['bia', 'caio']);
  // no modo várias, a pessoa do seletor NÃO entra de carona — só quem está marcado
  assert.deepEqual(destinatariosDoEnvio({ pessoa: 'ana', varios: true, marcados: [] }), []);
});

test('marcar/desmarcar e "marcar todos"', () => {
  assert.deepEqual(alternarMarcado(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(alternarMarcado(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(todosDaLista([{ id: 'a' }, { id: 'b' }, { id: '' }]), ['a', 'b']);
  assert.deepEqual(todosDaLista(null), []);
});

test('🔴 cada pessoa recebe a PRÓPRIA cópia de cada linha (e nada mais)', () => {
  const base = [{ titulo: 'Ligar pro fornecedor', data: '2026-09-25' }, { titulo: 'Ligar pro fornecedor', data: '2026-09-26' }];
  const linhas = linhasParaVarios(base, ['ana', 'bia']);
  assert.equal(linhas.length, 4);
  assert.deepEqual(linhas.map((l) => `${l.user_id}:${l.data}`), ['ana:2026-09-25', 'ana:2026-09-26', 'bia:2026-09-25', 'bia:2026-09-26']);
  // a base não é mexida (senão a segunda pessoa herdaria o user_id da primeira)
  assert.equal(base[0].user_id, undefined);
});

test('o card do quadro liga na PRIMEIRA linha gravada de cada pessoa', () => {
  const m = primeiraDeCadaPessoa([{ id: 1, user_id: 'ana' }, { id: 2, user_id: 'ana' }, { id: 3, user_id: 'bia' }]);
  assert.equal(m.get('ana').id, 1); assert.equal(m.get('bia').id, 3); assert.equal(m.size, 2);
  assert.equal(primeiraDeCadaPessoa(null).size, 0);
});

test('o resumo do aviso fala quem recebeu, sem virar um parágrafo', () => {
  assert.equal(resumoDoEnvio([]), 'ninguém');
  assert.equal(resumoDoEnvio(['Ana']), 'Ana');
  assert.equal(resumoDoEnvio(['Ana', 'Bia']), '2 pessoas: Ana e Bia');
  assert.equal(resumoDoEnvio(['Ana', 'Bia', 'Caio']), '3 pessoas: Ana, Bia e Caio');
  assert.equal(resumoDoEnvio(['Ana', 'Bia', 'Caio', 'Duda', 'Edu']), '5 pessoas: Ana, Bia, Caio e mais 2');
});

test('a tela: botão "várias pessoas", marcar todos, a lista completa do Método e o botão com a contagem', () => {
  const T = ler('../src/components/licensing/CentralVendas/DistribuirTarefa.jsx');
  assert.match(T, /data-teste="modo-varios"/);
  assert.match(T, /data-teste="marcar-todos"/);
  assert.match(T, /const destinos = destinatariosDoEnvio\(\{ pessoa, varios, marcados \}\)/);
  assert.match(T, /disabled=\{salvando \|\| !nova\.titulo\.trim\(\) \|\| !destinos\.length\}/);
  // a ADM X-Game passa a lista completa (time corporativo + quem está ativo no jogo)
  const G = ler('../src/components/licensing/CentralVendas/XPerformanceGestao.jsx');
  assert.match(G, /pessoasMetodo=\{equipeQuadroGeral\}/);
});
