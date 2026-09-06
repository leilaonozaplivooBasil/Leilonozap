// 🤖 O ASSISTENTE DA LISTA (DIR-76.2, 06/09/2026).
//
// Ordem do dono: "quando eu escrever Academia, ele traz um espaço pro peso, pra
// foto, faz a entrevista — perder ou ganhar peso — e já gera a rotina de treino
// da semana... sempre ajudando ela a organizar o dia pra escrever menos."
//
// O que estes testes protegem:
//   1. cada resposta MUDA o que sai — assistente que gera a mesma coisa pra
//      qualquer resposta é formulário decorativo;
//   2. não gera nada com pergunta obrigatória em branco;
//   3. o que sai é CARD NORMAL (título + checklist), não um formato especial.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSISTENTES, assistenteDaLista, assistentePorId, faltaResponder,
  gerarDaEntrevista, resumoDaFicha,
} from '../src/lib/assistenteDeLista.js';

const COMPLETA = { objetivo: 'ganhar', dias: 4, nivel: 'treinando' };

describe('quem chama o assistente', () => {
  test('o nome da lista reconhece — e só ele', () => {
    assert.equal(assistenteDaLista('Academia')?.id, 'academia');
    assert.equal(assistenteDaLista('meu treino da semana')?.id, 'academia');
    assert.equal(assistenteDaLista('MUSCULAÇÃO')?.id, 'academia');
    assert.equal(assistenteDaLista('Trabalho'), null);
    assert.equal(assistenteDaLista(''), null);
    assert.equal(assistenteDaLista(null), null);
  });

  test('toda pergunta obrigatória é cobrada antes de gerar', () => {
    const a = assistentePorId('academia');
    assert.deepEqual(faltaResponder(a, {}), ['objetivo', 'dias', 'nivel']);
    assert.deepEqual(faltaResponder(a, COMPLETA), []);
    // peso e foto são opcionais de propósito: não mudam o treino
    assert.deepEqual(faltaResponder(a, { ...COMPLETA, peso: '', foto: '' }), []);
  });

  test('sem responder o obrigatório, não gera nada', () => {
    assert.equal(gerarDaEntrevista('academia', { objetivo: 'ganhar' }), null);
    assert.equal(gerarDaEntrevista('academia', {}), null);
    assert.equal(gerarDaEntrevista('nao-existe', COMPLETA), null);
  });

  test('toda pergunta tem id, rótulo e tipo — e as de escolha têm opções', () => {
    for (const a of ASSISTENTES) {
      for (const p of a.perguntas) {
        assert.ok(p.id && p.rotulo && p.tipo, `${a.id}: pergunta incompleta`);
        if (p.tipo === 'escolha') assert.ok(p.opcoes?.length >= 2, `${a.id}/${p.id}: escolha sem opções`);
      }
    }
  });
});

describe('🔒 cada resposta muda o que sai', () => {
  test('os dias por semana decidem quantos treinos e a divisão', () => {
    for (const dias of [3, 4, 5, 6]) {
      const r = gerarDaEntrevista('academia', { ...COMPLETA, dias });
      assert.equal(r.cards.length, dias, `${dias} dias gerou ${r.cards.length} treinos`);
    }
    // e as divisões são REALMENTE diferentes entre si
    const tres = gerarDaEntrevista('academia', { ...COMPLETA, dias: 3 }).cards.map((c) => c.titulo);
    const cinco = gerarDaEntrevista('academia', { ...COMPLETA, dias: 5 }).cards.map((c) => c.titulo);
    assert.notDeepEqual(tres, cinco.slice(0, 3));
  });

  test('o card é do DIA da semana, começando na segunda, sem repetir dia', () => {
    const r = gerarDaEntrevista('academia', { ...COMPLETA, dias: 5 });
    const dias = r.cards.map((c) => c.titulo.split(' — ')[0]);
    assert.equal(dias[0], 'Segunda');
    assert.equal(new Set(dias).size, dias.length, 'repetiu dia da semana');
  });

  test('quem quer PERDER peso ganha cardio no fim; quem quer massa, não', () => {
    const perder = gerarDaEntrevista('academia', { ...COMPLETA, objetivo: 'perder' });
    const ganhar = gerarDaEntrevista('academia', { ...COMPLETA, objetivo: 'ganhar' });
    const temCardio = (r) => r.cards.every((c) => c.checklist.some((i) => /esteira|bike/i.test(i.texto)));
    assert.equal(temCardio(perder), true);
    assert.equal(temCardio(ganhar), false);
  });

  test('o nível muda a série — quem está começando não pega o mesmo volume', () => {
    const novato = gerarDaEntrevista('academia', { ...COMPLETA, nivel: 'comecando' });
    const veterano = gerarDaEntrevista('academia', { ...COMPLETA, nivel: 'treinando' });
    assert.notEqual(novato.ficha.serie, veterano.ficha.serie);
    assert.ok(novato.cards[0].checklist[0].texto.includes(novato.ficha.serie));
  });

  test('cada exercício já vem com a série escrita — a pessoa não escreve nada', () => {
    const r = gerarDaEntrevista('academia', COMPLETA);
    const exercicios = r.cards[0].checklist.filter((i) => !/esteira|bike|circuito/i.test(i.texto));
    assert.ok(exercicios.every((i) => /\d+x\d+/.test(i.texto)), JSON.stringify(exercicios.map((i) => i.texto)));
  });
});

describe('o que sai é card normal', () => {
  test('título e checklist de itens abertos — nada de formato especial', () => {
    const r = gerarDaEntrevista('academia', COMPLETA);
    for (const c of r.cards) {
      assert.deepEqual(Object.keys(c).sort(), ['checklist', 'titulo']);
      assert.ok(c.titulo.trim().length > 0);
      assert.ok(c.checklist.length >= 4);
      assert.ok(c.checklist.every((i) => typeof i.texto === 'string' && i.feito === false));
    }
  });

  test('a ficha guarda o acompanhamento, incluindo peso e foto quando vieram', () => {
    const r = gerarDaEntrevista('academia', { ...COMPLETA, peso: '92', foto: 'https://f/1.jpg' });
    assert.equal(r.ficha.peso_inicial, 92);
    assert.equal(r.ficha.foto_url, 'https://f/1.jpg');
    assert.equal(r.ficha.assistente, 'academia');
    // e sem elas não inventa número
    assert.equal(gerarDaEntrevista('academia', COMPLETA).ficha.peso_inicial, null);
  });

  test('o resumo da ficha lê pra tela, e some quando não há ficha', () => {
    const r = gerarDaEntrevista('academia', { ...COMPLETA, peso: 92 });
    const txt = resumoDaFicha(r.ficha);
    assert.match(txt, /ganhar massa/);
    assert.match(txt, /4x na semana/);
    assert.match(txt, /92 kg/);
    assert.equal(resumoDaFicha({}), '');
    assert.equal(resumoDaFicha(null), '');
  });
});
