// A busca da vitrine tem que PARECER que buscou.
//
// Origem: áudio do dono em 11/09/2026, 14h08 — "o cliente não desce, ele pensa
// que não está buscando". Entre a barra e o primeiro resultado havia quatro
// blocos de vitrine.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  termoLimpo, buscando, mostrarBlocosDeDescoberta, recadoDaBusca,
} from '../src/lib/buscaDaVitrine.js';

test('BUS-1 uma letra já é busca — e já esconde a vitrine', () => {
  // 🔴 O retorno visual tem que vir no primeiro caractere. Esperar a terceira
  // letra é justamente o intervalo em que a pessoa conclui que não funcionou.
  assert.equal(buscando('b'), true);
  assert.equal(mostrarBlocosDeDescoberta('b'), false);
});

test('BUS-2 sem busca, a vitrine de descoberta continua na tela', () => {
  for (const nada of ['', '   ', null, undefined]) {
    assert.equal(buscando(nada), false, JSON.stringify(nada));
    assert.equal(mostrarBlocosDeDescoberta(nada), true, JSON.stringify(nada));
  }
});

test('BUS-3 espaço, acento e maiúscula não mudam a busca', () => {
  assert.equal(termoLimpo('  BIKE   Harley '), 'bike harley');
  assert.equal(termoLimpo('Luminária'), 'luminaria');
  assert.equal(termoLimpo('CADEIRA Presidente'), 'cadeira presidente');
});

test('BUS-4 o recado diz quantos achou, com o termo na frente da pessoa', () => {
  assert.equal(recadoDaBusca('bike', 3), '3 leilões para “bike”');
  assert.equal(recadoDaBusca('bike', 1), '1 leilão para “bike”');
  assert.equal(recadoDaBusca('bike', 0), 'Nenhum leilão para “bike”');
});

test('BUS-5 singular e plural corretos — "1 leilões" entrega desleixo', () => {
  assert.match(recadoDaBusca('x', 1), /^1 leilão /);
  assert.match(recadoDaBusca('x', 2), /^2 leilões /);
});

test('BUS-6 enquanto a primeira carga não chega, o recado diz "buscando"', () => {
  assert.equal(recadoDaBusca('bike', 0, true), 'Buscando “bike”…');
  // e nunca "nenhum resultado" antes de ter o que responder
  assert.ok(!/Nenhum/.test(recadoDaBusca('bike', 0, true)));
});

test('BUS-7 sem busca não existe recado — a frase não fica pendurada na tela', () => {
  assert.equal(recadoDaBusca('', 12), null);
  assert.equal(recadoDaBusca('   ', 12), null);
  assert.equal(recadoDaBusca(null, 0, true), null);
});

test('BUS-8 o termo aparece como a pessoa digitou, não normalizado', () => {
  // ela procurou "Luminária"; devolver “luminaria” parece erro de digitação nosso
  assert.match(recadoDaBusca('Luminária', 2), /“Luminária”/);
  assert.match(recadoDaBusca('  Bike Harley  ', 1), /“Bike Harley”/);
});

test('BUS-9 contagem suja não vira "NaN leilões"', () => {
  for (const lixo of [undefined, null, NaN, 'abc']) {
    assert.equal(recadoDaBusca('x', lixo), 'Nenhum leilão para “x”');
  }
});
