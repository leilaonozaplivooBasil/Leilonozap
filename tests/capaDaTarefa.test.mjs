// 🖼️ A FAMÍLIA VISUAL DA TAREFA converge com o que a tarefa realmente é
// (dono, 08/09/2026): "quando uma pessoa gera um horário através do quadro,
// através da lista, ou pela geração automática, está gerando uma imagem
// aleatória... precisa ter esse comando pra a imagem convergir".
import test from 'node:test';
import assert from 'node:assert/strict';
import { familiaDaTarefa, FAMILIA_POR_HABITO } from '../src/lib/capaDaTarefa.js';

test('o Hábito GRAVADO na tarefa vence — nem olha pro título', () => {
  assert.equal(familiaDaTarefa({ titulo: 'não bate em nenhuma regra de título', habito: 8 }), 'treinamento');
  assert.equal(familiaDaTarefa({ titulo: 'Reunião 1', habito: 1 }), 'sonho', 'Hábito gravado vence mesmo quando o título sugeriria outra coisa');
});

test('sem Hábito gravado, lê o título pela mesma régua do botão "abrir ferramenta"', () => {
  // frases de negócio do Catálogo de ações (DistribuirTarefa/xperf) que não
  // batem em nenhum SELO/CENA por palavra — é exatamente o buraco relatado
  assert.equal(familiaDaTarefa({ titulo: 'Decidir com os números: o gargalo da empresa nesta semana' }), 'verificacao');
  assert.equal(familiaDaTarefa({ titulo: 'Treinar o time no Hábito da semana' }), 'treinamento');
  assert.equal(familiaDaTarefa({ titulo: 'Conferir os números da semana (reuniões, win rate, PPV)' }), 'fechamento');
});

test('título livre demais pra régua nenhuma pegar (ex.: "Formar um diretor novo") só converge quando o Hábito vem gravado — é por isso que o gravado vence', () => {
  assert.equal(familiaDaTarefa({ titulo: 'Formar um diretor novo (plano de 30 dias)' }), null);
  assert.equal(familiaDaTarefa({ titulo: 'Formar um diretor novo (plano de 30 dias)', habito: 8 }), 'treinamento');
});

test('sem Hábito e sem título reconhecível, devolve null — a tela decide o padrão', () => {
  assert.equal(familiaDaTarefa({ titulo: 'xyz completamente livre' }), null);
  assert.equal(familiaDaTarefa({ titulo: '' }), null);
  assert.equal(familiaDaTarefa({}), null);
});

test('Hábito 0/inválido não conta como gravado — cai pro título ou pro null', () => {
  assert.equal(familiaDaTarefa({ titulo: 'Apresentação de sucesso amanhã', habito: 0 }), 'apresentacao');
  assert.equal(familiaDaTarefa({ titulo: 'xyz', habito: 99 }), null);
});

test('FAMILIA_POR_HABITO cobre os 8 Hábitos, um a um', () => {
  assert.deepEqual(Object.keys(FAMILIA_POR_HABITO).map(Number).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
});
