// O programa da mentoria (06/09/2026): set/2026 a mar/2027, o padrão no código e o do dono por cima.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAMA_PADRAO, MESES, rotuloDoMes, programaJunto, programaParaGravar, cardsDoMes, fimDoMes } from '../src/lib/programaMentoria.js';

test('sete meses, de setembro de 2026 a março de 2027, seguindo os 8 Hábitos, com entregáveis pras três mentalidades', () => {
  assert.deepEqual(MESES, ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03']);
  for (const m of PROGRAMA_PADRAO) {
    assert.ok(m.tema && m.habitos.length);
    for (const men of ['executivo', 'diretor', 'ceo']) assert.ok(m.entregaveis[men].length >= 2, `${m.mes} ${men}`);
  }
  assert.equal(rotuloDoMes('2027-03'), 'mar/2027');
  assert.equal(fimDoMes('2027-02'), '2027-02-28');
});

test('o programa do dono vale por cima do padrão, mês a mês; o resto continua padrão', () => {
  const junto = programaJunto(PROGRAMA_PADRAO, [{ id: 'b1', mes: '2026-10', tema: 'Lista, contato e a loja', habitos: [3, 4], entregaveis: [{ titulo: 'Abrir a loja', mentalidade: 'executivo', habito: 5, peso: 6 }] }]);
  assert.equal(junto.length, 7);
  const out = junto.find((m) => m.mes === '2026-10');
  assert.equal(out.padrao, false);
  assert.equal(out.tema, 'Lista, contato e a loja');
  assert.deepEqual(out.entregaveis.executivo, [{ titulo: 'Abrir a loja', habito: 5, peso: 6 }]);
  assert.deepEqual(out.entregaveis.diretor, []);
  assert.equal(junto.find((m) => m.mes === '2026-09').padrao, true);
  // e volta pra tabela achatado
  const g = programaParaGravar(out);
  assert.deepEqual(g, { mes: '2026-10', tema: 'Lista, contato e a loja', habitos: [3, 4], entregaveis: [{ titulo: 'Abrir a loja', mentalidade: 'executivo', habito: 5, peso: 6 }], ordem: 1 });
});

test('os cards do mês pra uma pessoa: na mentalidade dela, coluna combinado, prazo no fim do mês', () => {
  const cards = cardsDoMes(PROGRAMA_PADRAO[2], { mentalidade: 'diretor', donoId: 'emanuel', donoNome: 'Emanuel' });
  assert.equal(cards.length, 2);
  assert.deepEqual([cards[0].trilha, cards[0].coluna, cards[0].dono_id, cards[0].prazo, cards[0].habito], ['diretor', 'combinado', 'emanuel', '2026-11-30', 7]);
  assert.match(cards[0].detalhe, /nov\/2026 · Apresentação de Sucesso/);
  assert.ok(cards.every((c) => c.peso >= 1 && c.peso <= 5), 'o quadro da diretoria vai de 1 a 5');
  assert.deepEqual(cardsDoMes(null, { donoId: 'x' }), []);
});
