// timeCorporativo — o topo da estrutura (DIR-39): Sócio Executivo → Fundador,
// função principal e ordenação pela hierarquia. Fonte única sobre careerLevels.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CARGOS_TOPO, ehExecutivoTopo, membrosDoTopo } from '../src/lib/timeCorporativo.js';

describe('CARGOS_TOPO', () => {
  test('do Sócio Executivo ao Fundador — Trainee fora (em formação)', () => {
    assert.deepEqual(CARGOS_TOPO, [
      'executivo_conta', 'diretoria_operacao', 'diretoria_executiva',
      'ceo', 'livoo_live', 'embaixador', 'conselheiro', 'fundador',
    ]);
  });
});

describe('ehExecutivoTopo', () => {
  test('cargo de rede não é topo; cargo diretor é; alias legado resolve', () => {
    assert.equal(ehExecutivoTopo({ career_levels: ['licenciado', 'vendedor'] }), false);
    assert.equal(ehExecutivoTopo({ career_levels: ['trainee_diretor'] }), false);
    assert.equal(ehExecutivoTopo({ primary_career_level: 'embaixador' }), true);
    assert.equal(ehExecutivoTopo({ career_levels: ['executivo'] }), true); // alias → executivo_conta
  });
});

describe('membrosDoTopo', () => {
  test('só o topo entra; função principal = primary quando é topo, senão o maior cargo; ordena pela hierarquia', () => {
    const m = membrosDoTopo([
      { id: 'a', full_name: 'Ana Sócia', primary_career_level: 'executivo_conta', career_levels: ['executivo_conta', 'licenciado'] },
      { id: 'b', full_name: 'Beto Fundador', primary_career_level: 'licenciado', career_levels: ['fundador', 'licenciado'] }, // primary não é topo → maior cargo
      { id: 'c', full_name: 'Caio Rede', primary_career_level: 'vendedor', career_levels: ['vendedor'] },       // fora
      { id: 'd', full_name: 'Dani CEO', primary_career_level: 'ceo', career_levels: ['ceo'] },
    ]);
    assert.deepEqual(m.map((x) => [x.user.id, x.funcaoPrincipal]), [
      ['b', 'fundador'], ['d', 'ceo'], ['a', 'executivo_conta'],
    ]);
  });
});
