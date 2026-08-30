// buscaPessoa — comparador único de busca (DIR-33): qualquer campo do
// cadastro, sem acento/caixa, telefone e CPF por dígitos.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pessoaBateBusca, buscarPessoas } from '../src/lib/buscaPessoa.js';

const pessoa = {
  full_name: 'José Antônio da Silva', nickname: 'Zezão',
  display_first_name: 'José', display_last_name: 'Silva',
  email: 'jose.silva@x.com', phone: '(21) 99887-5544', cpf: '123.456.789-00',
  referral_code: 'ZEZAO10', store_name: 'Loja do Zé',
};

describe('pessoaBateBusca', () => {
  test('nome sem acento e sem caixa acha nome com acento', () => {
    assert.equal(pessoaBateBusca(pessoa, 'jose antonio'), true);
    assert.equal(pessoaBateBusca(pessoa, 'SILVA'), true);
  });
  test('apelido, e-mail, código de indicação e loja também acham', () => {
    assert.equal(pessoaBateBusca(pessoa, 'zezão'), true);
    assert.equal(pessoaBateBusca(pessoa, 'jose.silva@'), true);
    assert.equal(pessoaBateBusca(pessoa, 'zezao10'), true);
    assert.equal(pessoaBateBusca(pessoa, 'loja do ze'), true);
  });
  test('telefone e CPF acham com ou sem máscara (só dígitos)', () => {
    assert.equal(pessoaBateBusca(pessoa, '99887-5544'), true);
    assert.equal(pessoaBateBusca(pessoa, '21998875544'), true);
    assert.equal(pessoaBateBusca(pessoa, '123.456.789'), true);
    assert.equal(pessoaBateBusca(pessoa, '45678900'), true);
  });
  test('nome de exibição composto acha ("José Silva")', () => {
    assert.equal(pessoaBateBusca(pessoa, 'jose silva'), true);
  });
  test('termo que não existe não acha; vazio não acha', () => {
    assert.equal(pessoaBateBusca(pessoa, 'maria'), false);
    assert.equal(pessoaBateBusca(pessoa, ''), false);
  });
  test('dígitos curtos (< 3) não disparam busca por telefone/CPF', () => {
    assert.equal(pessoaBateBusca(pessoa, '21'), false);
  });
});

describe('buscarPessoas', () => {
  test('filtra a lista pela mesma regra', () => {
    const lista = [pessoa, { full_name: 'Maria Souza', phone: '11911112222' }];
    assert.equal(buscarPessoas(lista, 'maria').length, 1);
    assert.equal(buscarPessoas(lista, '9111122').length, 1);
    assert.equal(buscarPessoas(lista, '').length, 0);
  });
});
