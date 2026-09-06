// A faixa da gestão do X-Performance (06/09/2026): "do executivo até o
// embaixador, todas essas pessoas, puxando a função do painel de controle".
// Recorte do topo (timeCorporativo.test.mjs cobre o topo inteiro).
import test from 'node:test';
import assert from 'node:assert/strict';
import { NIVEIS_TIME, nivelNoTime, funcaoNoTime, cargoDoNivel, timeCorporativo, CARGOS_TOPO } from '../src/lib/timeCorporativo.js';

test('a faixa é do Sócio Executivo ao Embaixador, na ordem do plano — um recorte do topo', () => {
  assert.deepEqual(NIVEIS_TIME, ['executivo_conta', 'diretoria_operacao', 'diretoria_executiva', 'ceo', 'livoo_live', 'embaixador']);
  assert.ok(NIVEIS_TIME.every((n) => CARGOS_TOPO.includes(n)));
});

test('quem é do time e com que função: o nível mais alto dentro da faixa; trainee, rede e acima do embaixador ficam de fora', () => {
  assert.equal(funcaoNoTime({ career_levels: ['executivo_conta'] }), 'Sócio Executivo');
  assert.equal(funcaoNoTime({ career_levels: ['licenciado', 'ceo', 'executivo_conta'] }), 'CEO');
  assert.equal(funcaoNoTime({ career_levels: ['licenciado'], primary_career_level: 'embaixador' }), 'Embaixador', 'a função principal do painel também conta');
  assert.equal(nivelNoTime({ career_levels: ['trainee_diretor'] }), null, 'trainee ainda não é do time');
  assert.equal(nivelNoTime({ career_levels: ['conselheiro', 'fundador'] }), null, 'acima do embaixador não entra');
  assert.equal(nivelNoTime({ career_levels: ['licenciado'] }), null);
  assert.equal(nivelNoTime({}), null);
  assert.equal(funcaoNoTime({ career_levels: ['executivo'] }), 'Sócio Executivo', 'apelido antigo do painel continua valendo');
});

test('cargo do jogo derivado do nível do painel', () => {
  assert.equal(cargoDoNivel('executivo_conta'), 'executivo');
  assert.equal(cargoDoNivel('ceo'), 'ceo');
  assert.equal(cargoDoNivel('diretoria_operacao'), 'diretor');
  assert.equal(cargoDoNivel('embaixador'), 'diretor');
});

test('timeCorporativo: só o time, em ordem alfabética, com a função do painel', () => {
  const lista = timeCorporativo([
    { id: 'z', full_name: 'Zeca', career_levels: ['embaixador'] },
    { id: 'a', full_name: 'Ana', career_levels: ['usuario'] },
    { id: 'b', full_name: 'Bia', career_levels: ['diretoria_executiva'] },
    { id: 'c', full_name: 'Caio', career_levels: ['trainee_diretor'] },
  ]);
  assert.deepEqual(lista.map((p) => [p.id, p.funcao, p.cargo]), [['b', 'Diretoria Executiva', 'diretor'], ['z', 'Embaixador', 'diretor']]);
});
