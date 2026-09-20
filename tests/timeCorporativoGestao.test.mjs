// A faixa da gestão do X-Performance (06/09/2026): "do executivo até o
// embaixador, todas essas pessoas, puxando a função do painel de controle".
// Recorte do topo (timeCorporativo.test.mjs cobre o topo inteiro).
import test from 'node:test';
import assert from 'node:assert/strict';
import { NIVEIS_TIME, nivelNoTime, funcaoNoTime, cargoDoNivel, timeCorporativo, CARGOS_TOPO, equipeQuadroGeral } from '../src/lib/timeCorporativo.js';

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

// 🎯 20/09/2026 — dono, no Quadro Geral: "aqui preciso que todos que estão
// recebendo apareça aqui, exemplo Sophia Sant'Anna não está aparecendo."
// Sophia: career_levels ['usuario', 'loja_fisica'], primary_career_level
// 'loja_fisica' (bloco 'rede', não 'diretor') — timeCorporativo não a lista,
// mas ela tem um xgame_participantes ativo (cargo 'executivo').
test('equipeQuadroGeral: quem tem cadastro ativo no jogo mas não é do time corporativo entra também, com a função do painel dela', () => {
  const equipe = timeCorporativo([{ id: 'ceo1', full_name: 'Zeca', career_levels: ['ceo'] }]);
  const participantes = [
    { user_id: 'ceo1', ativo: true }, // já está em equipe — não deve duplicar
    { user_id: 'sophia', ativo: true, cargo: 'executivo' },
    { user_id: 'saiu', ativo: false, cargo: 'executivo' }, // inativa — fora
  ];
  const usuariosPorId = new Map([
    ['ceo1', { id: 'ceo1', full_name: 'Zeca', career_levels: ['ceo'] }],
    ['sophia', { id: 'sophia', full_name: "Sophia Sant'anna", career_levels: ['usuario', 'loja_fisica'], primary_career_level: 'loja_fisica' }],
  ]);
  const lista = equipeQuadroGeral(equipe, participantes, usuariosPorId, (u) => u.full_name);
  assert.deepEqual(lista.map((p) => p.id), ['sophia', 'ceo1'], 'Sophia entra (ordem alfabética), inativa não; ninguém duplica');
  const sophia = lista.find((p) => p.id === 'sophia');
  assert.equal(sophia.nome, "Sophia Sant'anna");
  assert.equal(sophia.funcao, 'Loja Física', 'a função vem do nível dela no painel, mesmo não sendo do time corporativo');
  assert.equal(sophia.nivel, null, 'ela não tem posição na hierarquia do painel — não inventa uma');
});

test('equipeQuadroGeral: sem cadastro no painel, a função cai pro cargo do jogo capitalizado', () => {
  const lista = equipeQuadroGeral([], [{ user_id: 'x', ativo: true, cargo: 'executivo' }], new Map(), (u) => u.full_name, (id) => id);
  assert.equal(lista[0].funcao, 'Executivo');
});

test('equipeQuadroGeral: sem participantes extras, devolve só a equipe (nada some, nada quebra)', () => {
  const equipe = timeCorporativo([{ id: 'z', full_name: 'Zeca', career_levels: ['ceo'] }]);
  assert.deepEqual(equipeQuadroGeral(equipe, [], new Map()), equipe);
  assert.deepEqual(equipeQuadroGeral(), []);
});
