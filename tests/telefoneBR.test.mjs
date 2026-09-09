// ☎️ Fase A do importador de contatos (08/09/2026).
// A agenda de um celular traz o mesmo número escrito de vários jeitos. Se a
// comparação for por dígito cru, importar a agenda duplica a Lista de
// Networking inteira. Estes testes seguram a regra do nono dígito, o corte do
// código do país sem quebrar o DDD 55, e o carimbo de dono na criação em lote
// (sem ele o contato importado nasce órfão e ninguém consegue editar depois).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  telefoneBR,
  chaveTelefone,
  telefoneValido,
  formatarTelefoneBR,
  telefoneParaGravar,
  dddValido,
} from '../src/lib/telefoneBR.js';
import { semComentarios } from './_ajuda.mjs';


test('o MESMO celular escrito de 6 jeitos é uma pessoa só', () => {
  const formas = [
    '+55 11 98888-7777',
    '5511988887777',
    '(11) 98888-7777',
    '11988887777',
    '011 98888 7777',
    '11 8888-7777', // o legado, antes do nono dígito
  ];
  const chaves = new Set(formas.map(chaveTelefone));
  assert.equal(chaves.size, 1, `deveria ser 1 pessoa, virou ${chaves.size}: ${[...chaves]}`);
  assert.equal([...chaves][0], '11c88887777');
});

test('o fixo 3333-4444 NÃO é o celular 9 3333-4444 do mesmo DDD', () => {
  // Se a chave fosse só "DDD + últimos 8", estes dois virariam a mesma pessoa.
  assert.notEqual(chaveTelefone('1133334444'), chaveTelefone('11933334444'));
  assert.equal(chaveTelefone('1133334444'), '11f33334444');
  assert.equal(chaveTelefone('11933334444'), '11c33334444');
});

test('DDD 55 é DDD, não código de país — (55) 3333-4444 sobrevive', () => {
  const t = telefoneBR('5533334444');
  assert.ok(t, '10 dígitos começando com 55 é o DDD de Santa Maria, não o +55');
  assert.equal(t.ddd, '55');
  assert.equal(t.celular, false);
  // e o mesmo número COM código de país continua sendo ele mesmo
  assert.equal(chaveTelefone('555533334444'), chaveTelefone('5533334444'));
});

test('DDD 55 com celular: 11 dígitos não perdem o 55 da frente', () => {
  const t = telefoneBR('55987654321');
  assert.ok(t, 'DDD 55 + celular 9 8765-4321');
  assert.equal(t.ddd, '55');
  assert.equal(t.celular, true);
  assert.equal(t.nacional, '55987654321');
});

test('lixo de agenda não vira contato', () => {
  const lixo = ['0800 123 4567', '4004', '*144', '', null, undefined, 'sem telefone', '106', '1', '1234567890123456'];
  for (const v of lixo) {
    assert.equal(telefoneValido(v), false, `entrou como telefone: ${JSON.stringify(v)}`);
    assert.equal(chaveTelefone(v), null);
  }
});

test('DDD que não existe é recusado', () => {
  assert.equal(dddValido(20), false);
  assert.equal(dddValido(23), false);
  assert.equal(dddValido(11), true);
  assert.equal(telefoneBR('2098887777'), null, 'DDD 20 não existe no Brasil');
});

test('número estrangeiro não entra como brasileiro', () => {
  assert.equal(telefoneBR('+1 415 555 2671'), null);
  assert.equal(telefoneBR('+351 912 345 678'), null);
});

test('miolo que não abre número de assinante é recusado', () => {
  assert.equal(telefoneBR('1112345678'), null, 'miolo começando em 1');
  assert.equal(telefoneBR('1101234567'), null, 'miolo começando em 0');
  assert.equal(telefoneBR('11933334444').celular, true);
});

test('com 11 dígitos, o nono dígito é sempre 9 — qualquer outro é número torto', () => {
  assert.equal(telefoneBR('11812345678'), null, 'nenhum número brasileiro tem 8 na posição do nono dígito');
  assert.equal(telefoneBR('11312345678'), null);
  // e o que COMEÇA com 9 é celular, sem julgar o dígito seguinte: a faixa
  // depois do 9 muda conforme a ANATEL libera numeração nova.
  for (const n of ['11912345678', '11922345678', '11932345678', '11987654321']) {
    assert.equal(telefoneBR(n)?.celular, true, `recusou celular legítimo: ${n}`);
  }
});

test('grava sempre no formato de hoje, com o nono dígito', () => {
  assert.equal(telefoneParaGravar('11 8888-7777'), '11988887777', 'o legado sobe pro formato atual');
  assert.equal(telefoneParaGravar('+55 (11) 98888-7777'), '11988887777');
  assert.equal(telefoneParaGravar('1133334444'), '1133334444', 'fixo não ganha nono dígito');
});

test('o irreconhecível não é apagado — vira só os dígitos', () => {
  // Normalizar não pode destruir o que a pessoa digitou: quem cadastrou um
  // ramal ou um número de fora ainda precisa enxergar aquilo depois.
  assert.equal(telefoneParaGravar('0800 123 4567'), '08001234567');
  assert.equal(formatarTelefoneBR('ligar pelo escritório'), 'ligar pelo escritório');
});

test('na tela sai legível', () => {
  assert.equal(formatarTelefoneBR('5511988887777'), '(11) 98888-7777');
  assert.equal(formatarTelefoneBR('1133334444'), '(11) 3333-4444');
});

// ── 🔴 o carimbo de dono na criação em lote ──────────────────────────────────
const ENTITY_WRITE = semComentarios(
  readFileSync(new URL('../api/functions/entityWrite.js', import.meta.url), 'utf8'),
);

test('bulkCreate carimba o dono — contato importado não nasce órfão', () => {
  assert.ok(
    /action === 'create' \|\| action === 'bulkCreate'/.test(ENTITY_WRITE),
    'o carimbo de created_by_id precisa valer pros DOIS caminhos de criação',
  );
  assert.ok(
    /body\.payload\.map\(carimbar\)/.test(ENTITY_WRITE),
    'com array, o dono tem que ser carimbado item a item',
  );
});

test('o carimbo não volta a ignorar array', () => {
  // A condição antiga era `action === 'create' && ... && !Array.isArray(body.payload)`:
  // é exatamente ela que deixava o lote passar sem dono.
  assert.ok(
    !/action === 'create' && body\?\.payload && !Array\.isArray\(body\.payload\)/.test(ENTITY_WRITE),
    'a condição antiga voltou — bulkCreate está criando contato sem dono de novo',
  );
});
