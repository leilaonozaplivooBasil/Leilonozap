/**
 * 🚫 O "JOÃO PAIM" NÃO PODE NASCER DUAS VEZES SEM QUERER.
 *
 * Pedido do Ávilla (22/09/2026): "já tenho um joão paim, se tentar cadastrar de
 * novo, deve vir um aviso que impossibilite a criação do duplicado."
 *
 * O aviso já existia (DIR-24 Fase 5) e tinha dois furos: só olhava e-mail e
 * telefone — o NOME passava direto, que é justamente o exemplo do pedido — e só
 * avisava, com o botão Salvar continuando clicável do lado.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  acharDuplicado, podeSalvar, aceitaConfirmacao, normalizarNome, sóDigitos,
  motivoEmPalavras, POR_EMAIL, POR_TELEFONE, POR_NOME,
} from '../src/lib/duplicadoDeContato.js';

const PAIM = { id: 'p1', full_name: 'João Paim', email: 'joao@paim.com', phone: '21999990000' };

describe('duplicado de contato', () => {
  test('🔴 o caso do pedido: mesmo NOME é pego — era o furo', () => {
    const d = acharDuplicado([PAIM], { full_name: 'João Paim' });
    assert.ok(d, 'o nome passava direto: só e-mail e telefone eram conferidos');
    assert.equal(d.motivo, POR_NOME);
    assert.equal(d.pessoa.id, 'p1');
  });

  test('nome com acento, caixa e espaço a mais é o MESMO nome', () => {
    for (const escrito of ['joao paim', 'JOÃO PAIM', '  João   Paim  ', 'joão paim']) {
      assert.ok(acharDuplicado([PAIM], { full_name: escrito }), `não pegou "${escrito}"`);
    }
  });

  test('nome parecido mas diferente NÃO é duplicado', () => {
    assert.equal(acharDuplicado([PAIM], { full_name: 'João Paimm' }), null);
    assert.equal(acharDuplicado([PAIM], { full_name: 'João' }), null);
    assert.equal(acharDuplicado([PAIM], { full_name: 'Paim' }), null);
  });

  test('e-mail e telefone continuam pegando', () => {
    assert.equal(acharDuplicado([PAIM], { email: 'JOAO@PAIM.COM' }).motivo, POR_EMAIL);
    assert.equal(acharDuplicado([PAIM], { phone: '(21) 99999-0000' }).motivo, POR_TELEFONE);
  });

  test('telefone curto demais não identifica ninguém', () => {
    assert.equal(acharDuplicado([{ id: 'x', phone: '123' }], { phone: '123' }), null,
      'com 3 dígitos qualquer um colidiria com qualquer um');
  });

  test('campos vazios não acusam duplicado', () => {
    assert.equal(acharDuplicado([PAIM], {}), null);
    assert.equal(acharDuplicado([PAIM], { full_name: '   ', email: '', phone: '' }), null);
    assert.equal(acharDuplicado([{ id: 'sem' }], { full_name: 'Alguém' }), null,
      'cadastro sem nome não pode casar com todo mundo que tem nome');
  });

  describe('o que tranca e o que pede confirmação', () => {
    test('🔒 e-mail e telefone trancam SEM apelação', () => {
      const porEmail = acharDuplicado([PAIM], { email: 'joao@paim.com' });
      assert.equal(podeSalvar(porEmail, false), false);
      assert.equal(podeSalvar(porEmail, true), false,
        'nem marcando "é outra pessoa": duas pessoas não dividem o mesmo e-mail');
      assert.equal(aceitaConfirmacao(POR_EMAIL), false);
      assert.equal(aceitaConfirmacao(POR_TELEFONE), false);
    });

    test('🔓 nome tranca por padrão, mas ABRE se confirmarem que é outra pessoa', () => {
      const porNome = acharDuplicado([PAIM], { full_name: 'João Paim' });
      assert.equal(podeSalvar(porNome, false), false, 'sem confirmar, não cria — é o que o pedido quer');
      assert.equal(podeSalvar(porNome, true), true,
        'homônimo existe; trancar pelo nome sozinho deixaria a pessoa sem saída nenhuma');
      assert.equal(aceitaConfirmacao(POR_NOME), true);
    });

    test('sem duplicado, salva sempre', () => {
      assert.equal(podeSalvar(null, false), true);
      assert.equal(podeSalvar(null, true), true);
    });

    test('confirmação só vale como `true` de verdade', () => {
      const porNome = acharDuplicado([PAIM], { full_name: 'João Paim' });
      for (const quase of ['sim', 1, {}, [], 'true']) {
        assert.equal(podeSalvar(porNome, quase), false, `${JSON.stringify(quase)} passou como confirmação`);
      }
    });
  });

  test('🔴 colidindo por nome E por e-mail, o motivo mostrado é o que TRANCA', () => {
    // se mostrasse "nome", a tela ofereceria "é outra pessoa mesmo" —
    // e deixaria passar um duplicado que não tem escapatória
    const d = acharDuplicado([PAIM], { full_name: 'João Paim', email: 'joao@paim.com' });
    assert.equal(d.motivo, POR_EMAIL);
    assert.equal(podeSalvar(d, true), false);
  });

  test('editar a própria pessoa não acusa ela mesma', () => {
    const d = acharDuplicado([PAIM], { full_name: 'João Paim', email: 'joao@paim.com' }, { ignorarId: 'p1' });
    assert.equal(d, null, 'salvar uma edição acusaria o próprio registro como duplicado');
  });

  describe('bordas', () => {
    test('lista vazia, nula e com buracos', () => {
      assert.equal(acharDuplicado([], { full_name: 'Ana' }), null);
      assert.equal(acharDuplicado(null, { full_name: 'Ana' }), null);
      assert.equal(acharDuplicado(undefined, { full_name: 'Ana' }), null);
      assert.equal(acharDuplicado([null, undefined, PAIM], { full_name: 'João Paim' })?.pessoa.id, 'p1');
    });

    test('normalizarNome e sóDigitos aguentam lixo', () => {
      assert.equal(normalizarNome(null), '');
      assert.equal(normalizarNome(undefined), '');
      assert.equal(normalizarNome('  Ç é Ã  '), 'c e a');
      assert.equal(sóDigitos('(21) 9 9999-0000'), '21999990000');
      assert.equal(sóDigitos(null), '');
    });

    test('todo motivo tem texto, inclusive um inventado', () => {
      assert.equal(motivoEmPalavras(POR_EMAIL), 'este e-mail');
      assert.equal(motivoEmPalavras(POR_TELEFONE), 'este telefone');
      assert.equal(motivoEmPalavras(POR_NOME), 'este nome');
      assert.ok(motivoEmPalavras('inventado').length > 0, 'texto vazio deixaria o aviso sem frase');
    });
  });
});
