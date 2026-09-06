// 🔗 A tarefa do dia sabe pra onde levar (DIR-75, 06/09/2026).
//
// O que estes testes protegem:
//   1. as tarefas reais da Rotina Padrão caem no Hábito CERTO — link errado é
//      pior que link nenhum, porque a pessoa clica uma vez, se perde, e não
//      clica em mais nenhum;
//   2. tarefa sem ferramenta continua SEM botão;
//   3. tarefa escrita à mão pela pessoa também acha a ferramenta.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ferramentaDaTarefa, tarefasComFerramenta, FERRAMENTAS } from '../src/lib/ferramentaDaTarefa.js';
import { ROTINA_PADRAO, HABITOS } from '../src/lib/metodo.js';

describe('a ligação tarefa → ferramenta do Hábito', () => {
  test('as da Rotina Padrão caem onde o dono descreveu', () => {
    const esperado = {
      'Acordar — gratidão e foco no sonho': 1,
      'Reunião 1 (45-60 min)': 4,
      'Reunião 2 (45-60 min)': 4,
      'Reunião 3 (45-60 min)': 4,
      'Contratos + follow-ups': 6,
      'Organização do negócio (até 11:30)': 2,
      'Treinamento diário com o time': 8,
      'Fechamento do dia': 2,
    };
    for (const [titulo, habito] of Object.entries(esperado)) {
      const f = ferramentaDaTarefa(titulo);
      assert.ok(f, `"${titulo}" ficou sem ferramenta`);
      assert.equal(f.habito, habito, `"${titulo}" foi pro Hábito ${f.habito}, esperado ${habito}`);
    }
  });

  // 🔒 link errado é pior que link nenhum
  test('tarefa que não tem pra onde levar fica SEM botão', () => {
    for (const titulo of ['Almoço', 'Leitura leve + descanso', 'ABRIR A LOJA', 'Término do treino + post']) {
      assert.equal(ferramentaDaTarefa(titulo), null, `"${titulo}" ganhou ferramenta indevida`);
    }
    assert.equal(ferramentaDaTarefa(''), null);
    assert.equal(ferramentaDaTarefa(null), null);
  });

  test('tarefa escrita à mão pela pessoa também acha a ferramenta', () => {
    assert.equal(ferramentaDaTarefa('ligar pro Renan').habito, 4);
    assert.equal(ferramentaDaTarefa('reunião com o contador').habito, 4);
    assert.equal(ferramentaDaTarefa('qualificar minha lista de network').habito, 3);
    assert.equal(ferramentaDaTarefa('ensinar o método pro time novo').habito, 8);
    assert.equal(ferramentaDaTarefa('conferir os números da semana').habito, 7);
  });

  test('"Reunião" ganha a agenda, e não a esteira — a ordem das regras importa', () => {
    // as duas palavras existem no mesmo universo; se a regra da esteira viesse
    // antes, "Reunião de follow-up" iria parar no Hábito 6 em vez do 4
    assert.equal(ferramentaDaTarefa('Reunião de follow-up com o cliente').habito, 4);
  });

  test('todo alvo aponta pra um Hábito que existe de verdade', () => {
    const numeros = HABITOS.map((h) => h.n);
    const ids = HABITOS.map((h) => h.id);
    for (const [chave, f] of Object.entries(FERRAMENTAS)) {
      assert.ok(numeros.includes(f.habito), `${chave}: Hábito ${f.habito} não existe`);
      assert.ok(ids.includes(f.secao), `${chave}: seção "${f.secao}" não é um Hábito`);
    }
  });

  // 🩹 este teste começou como "mais da metade do dia tem ferramenta" e eu
  // troquei: metade era régua inventada minha, e ela reprovava um resultado
  // CERTO (9 de 20 — as outras 11 são treino, story e descanso, que não têm
  // ferramenta nenhuma no sistema). A invariante de verdade é esta: nenhuma
  // tarefa de NEGÓCIO pode ficar órfã, e as pessoais não podem ganhar link.
  test('nenhuma tarefa de negócio do dia real fica sem ferramenta', () => {
    const deNegocio = /reuni[ãa]o|contrato|follow|contato|treinamento|organiza[çc][ãa]o do neg[óo]cio|fechamento do dia/i;
    const orfas = ROTINA_PADRAO
      .filter((r) => deNegocio.test(r.titulo) && !ferramentaDaTarefa(r.titulo));
    assert.deepEqual(orfas.map((r) => r.titulo), []);
  });

  test('e as pessoais continuam sem link — a régua não pode alargar', () => {
    const pessoais = ['Almoço', 'Leitura leve + descanso', 'Término do treino + post', 'Post rápido do aprendizado'];
    const comLinkIndevido = pessoais.filter((t) => !!ferramentaDaTarefa(t));
    assert.deepEqual(comLinkIndevido, []);
    // e o dia real não pode virar 100% ligado: isso seria regra larga demais
    const lista = ROTINA_PADRAO.map((r) => ({ titulo: r.titulo }));
    assert.ok(tarefasComFerramenta(lista) < lista.length);
  });
});
