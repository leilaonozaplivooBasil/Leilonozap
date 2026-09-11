// Quem entra e quem NÃO entra na lista de disparo.
//
// Cada teste aqui existe por causa de um erro real encontrado na base em
// 11/09/2026, não por hipótese.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarEmail, normalizarTelefone, classificarEmail, montarContato,
  juntarSemRepetir, separarParaDisparo, contarPorClasse, TELEFONES_FALSOS,
} from '../scripts/campanha/publico.mjs';

test('PUB-1 telefone de 11 dígitos ganha o +55', () => {
  assert.equal(normalizarTelefone('21984703895'), '+5521984703895');
  assert.equal(normalizarTelefone('(21) 98470-3895'), '+5521984703895');
});

test('PUB-2 telefone que já tem 55 não ganha outro', () => {
  assert.equal(normalizarTelefone('5521984703895'), '+5521984703895');
  assert.equal(normalizarTelefone('552133485214'), '+552133485214');
});

test('PUB-3 telefone falso é barrado nas DUAS formas que existem no banco', () => {
  // 🔴 Este é o erro que passou na primeira extração: o filtro comparava a forma
  // de 13 dígitos, mas metade dos falsos está gravada com 11.
  assert.equal(normalizarTelefone('21999999999'), '');
  assert.equal(normalizarTelefone('5521999999999'), '');
  assert.equal(normalizarTelefone('21123456789'), '');
  for (const falso of TELEFONES_FALSOS) assert.equal(normalizarTelefone(falso), '', falso);
});

test('PUB-4 número curto, vazio ou de outro país não vira telefone', () => {
  for (const lixo of ['', null, undefined, '123', '99999', '1555512345678']) {
    assert.equal(normalizarTelefone(lixo), '');
  }
});

test('PUB-5 e-mail do concurso é sintético e nunca dispara', () => {
  assert.equal(classificarEmail('c00777693097@concurso.leilaonozap.net'), 'sintetico');
});

test('PUB-6 domínio digitado errado vira typo, não "ok"', () => {
  assert.equal(classificarEmail('hmcosenza@gmail.con'), 'typo');
  assert.equal(classificarEmail('keellymalu@iclou.com'), 'typo');
  assert.equal(classificarEmail('prireginamk@gmail.vom'), 'typo');
  assert.equal(classificarEmail('fulano@gmail.com'), 'ok');
});

test('PUB-7 conta de QA e domínio .invalid ficam de fora', () => {
  assert.equal(classificarEmail('qa_card_zzz@teste-lnz.invalid'), 'teste');
  assert.equal(classificarEmail('qa_pix_zzz@teste-lnz.invalid'), 'teste');
  assert.equal(classificarEmail('teste@saidebaixo.com'), 'teste');
});

test('PUB-8 arroba duplicado é inválido', () => {
  assert.equal(classificarEmail('thiagoconsultortj@@gmail.com'), 'invalido');
});

test('PUB-9 sem e-mail é "sem_email" — serve para SMS, não para e-mail', () => {
  assert.equal(classificarEmail(normalizarEmail('  ')), 'sem_email');
  const c = montarContato({ nome: 'Fulana', telefone: '21984703895' });
  assert.equal(c.classe, 'sem_email');
  assert.equal(c.telefone, '+5521984703895');
});

test('PUB-10 o mesmo e-mail em duas tabelas vira UMA linha', () => {
  const lista = juntarSemRepetir([
    { nome: 'Ana', email: 'ANA@Gmail.com ', origem: 'cadastro' },
    { nome: 'Ana Maria', email: 'ana@gmail.com', origem: 'loja', compras: 1 },
  ]);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].email, 'ana@gmail.com');
  // fica o registro com histórico, que é o que tem mais informação
  assert.equal(lista[0].compras, 1);
  assert.equal(lista[0].nome, 'Ana Maria');
});

test('PUB-11 quem só tem telefone entra pelo número e não some', () => {
  const lista = juntarSemRepetir([
    { nome: 'Só zap', telefone: '21984703895', origem: 'concurso' },
    { nome: 'Com email', email: 'x@y.com', origem: 'cadastro' },
  ]);
  assert.equal(lista.length, 2);
});

test('PUB-12 contato sem e-mail E sem telefone é descartado', () => {
  assert.equal(juntarSemRepetir([{ nome: 'Fantasma', origem: 'crm' }]).length, 0);
});

test('PUB-13 só a classe "ok" entra no disparo de e-mail', () => {
  const lista = juntarSemRepetir([
    { nome: 'Boa', email: 'boa@gmail.com', telefone: '21984703895', origem: 'cadastro' },
    { nome: 'Sintetica', email: 'c1@concurso.leilaonozap.net', telefone: '21970097848', origem: 'cadastro' },
    { nome: 'Typo', email: 'z@gmail.con', origem: 'cadastro' },
    { nome: 'Qa', email: 'qa_x@teste-lnz.invalid', origem: 'loja' },
  ]);
  const g = separarParaDisparo(lista);
  assert.deepEqual(g.email.map((c) => c.email), ['boa@gmail.com']);
  assert.equal(g.barrados.length, 3);
  // quem foi barrado no e-mail ainda pode receber SMS se o telefone for bom
  assert.equal(g.sms.length, 2);
});

test('PUB-14 quem pediu para sair não recebe por e-mail NEM por SMS', () => {
  const lista = juntarSemRepetir([
    { nome: 'Saiu', email: 'saiu@gmail.com', telefone: '21984703895', origem: 'cadastro' },
    { nome: 'Fica', email: 'fica@gmail.com', telefone: '21970097848', origem: 'cadastro' },
  ]);
  const g = separarParaDisparo(lista, ['saiu@gmail.com']);
  assert.deepEqual(g.email.map((c) => c.email), ['fica@gmail.com']);
  assert.deepEqual(g.sms.map((c) => c.email), ['fica@gmail.com']);
  assert.equal(g.descadastrados.length, 1);
});

test('PUB-15 descadastro pelo telefone também corta o e-mail da mesma pessoa', () => {
  const lista = juntarSemRepetir([
    { nome: 'Saiu no zap', email: 'zap@gmail.com', telefone: '21984703895', origem: 'cadastro' },
  ]);
  const g = separarParaDisparo(lista, ['+5521984703895']);
  assert.equal(g.email.length, 0);
  assert.equal(g.sms.length, 0);
});

test('PUB-16 a contagem por classe bate com a lista', () => {
  const lista = juntarSemRepetir([
    { email: 'a@gmail.com', origem: 'x' },
    { email: 'b@gmail.com', origem: 'x' },
    { email: 'c@concurso.leilaonozap.net', origem: 'x' },
    { telefone: '21984703895', origem: 'x' },
  ]);
  assert.deepEqual(contarPorClasse(lista), { ok: 2, sintetico: 1, sem_email: 1 });
});

test('PUB-17 conta interna da operação fica marcada, mas continua disparável', () => {
  const c = montarContato({ nome: 'TTT', email: 'relacionamento@leilaonozap.com', origem: 'cadastro' });
  assert.equal(c.classe, 'ok');
  assert.equal(c.interno, true);
});
