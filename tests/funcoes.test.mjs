// As empresas e as funções (06/09/2026): "a partir da função o sistema já me
// dá as tarefas do dia dele; e preciso identificar a empresa".
import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPRESAS, rotuloDaEmpresa, FUNCOES, FUNCOES_OFICIAIS, FUNCOES_DO_PAINEL, funcaoDe, funcaoDoNivel, funcaoDaPessoa, funcaoDaPessoaComOrigem, cargoOficialDaFuncao, montarDiaDaFuncao } from '../src/lib/funcoes.js';

test('o grupo: a holding e os quatro pilares-empresa, e o rótulo "através da"', () => {
  assert.deepEqual(EMPRESAS.map((e) => e.nome), ['To The Top Corporate', 'X-EOS', 'Top Tech Digital', 'Leilão no Zap', 'Human Bank']);
  assert.ok(EMPRESAS.every((e) => e.pilar && e.faz));
  assert.equal(rotuloDaEmpresa('leilao_no_zap'), 'Leilão no Zap');
  assert.equal(rotuloDaEmpresa('leilao_no_zap', 'top_tech_digital'), 'Leilão no Zap, através da Top Tech Digital');
  assert.equal(rotuloDaEmpresa('leilao_no_zap', 'e_digital'), 'Leilão no Zap, através da Top Tech Digital', 'o nome antigo (e-Digital) continua apontando pra Top Tech');
  assert.equal(rotuloDaEmpresa('leilao_no_zap', 'leilao_no_zap'), 'Leilão no Zap', 'através de si mesma não é "através"');
  assert.equal(rotuloDaEmpresa(null), null);
});

test('cada função tem mentalidade, o que entrega e um dia com Hábitos válidos, em ordem de hora', () => {
  assert.equal(FUNCOES.length, 13);
  for (const f of FUNCOES) {
    assert.ok(f.dia.length >= 4, f.nome);
    assert.ok(['executivo', 'diretor', 'ceo'].includes(f.mentalidade), f.nome);
    // o dia de uma função pode passar por Hábitos fora do foco da mentalidade
    // (o embaixador ainda faz lista e contato); o que importa é ser dos 8
    for (const t of f.dia) assert.ok(t.habito >= 1 && t.habito <= 8, `${f.nome}: "${t.titulo}" Hábito ${t.habito}`);
    assert.ok(f.dia.every((t, i, arr) => i === 0 || arr[i - 1].hora <= t.hora), `${f.nome}: horas fora de ordem`);
  }
});

test('a função NÃO é o nível: o Documento Oficial sugere pelo nome, a escolhida vence, posição do painel não vira função', () => {
  // níveis que também são trabalho continuam caindo na função
  assert.equal(funcaoDoNivel('ceo').id, 'ceo');
  assert.equal(funcaoDoNivel('executivo_conta').id, 'socio_executivo');
  assert.equal(funcaoDoNivel('trainee_diretor'), null);
  // Diretor Operacional e Diretoria Executiva são POSIÇÕES (Documento p. 4/6/8): não caem em função nenhuma
  assert.equal(funcaoDoNivel('diretoria_operacao'), null);
  assert.equal(funcaoDoNivel('diretoria_executiva'), null);
  assert.deepEqual(funcaoDaPessoaComOrigem({ nivel: 'diretoria_operacao', nome: 'Fulano de Tal' }), { funcao: null, origem: null });
  // o documento nomeia: Emanuel → COO, Jean → CMO, Luciano → CCO, Karen → CBDO, Aline → CAO, Cristiano → CRO
  const e = funcaoDaPessoaComOrigem({ nivel: 'executivo_conta', nome: 'Emanuel Silva' });
  assert.deepEqual([e.funcao.id, e.origem], ['coo', 'documento'], 'o nome do documento vence o nível do painel');
  assert.equal(funcaoDaPessoaComOrigem({ nome: 'Jean Aranha' }).funcao.id, 'cmo');
  assert.equal(funcaoDaPessoaComOrigem({ nome: 'Karen Castro' }).funcao.id, 'cbdo');
  // a escolhida vence tudo — e aceita o nome por extenso que o dono fala
  assert.deepEqual([funcaoDaPessoa({ funcaoTitulo: 'cfo', nivel: 'diretoria_executiva', nome: 'Emanuel' }).id, funcaoDaPessoaComOrigem({ funcaoTitulo: 'cfo' }).origem], ['cfo', 'escolhida']);
  assert.equal(funcaoDaPessoa({ funcaoTitulo: 'Diretora Financeira' }).id, 'cfo');
  assert.equal(funcaoDaPessoa({ funcaoTitulo: 'diretor_operacoes' }).id, 'coo', 'o id antigo continua valendo');
  assert.equal(funcaoDaPessoa({ funcaoTitulo: 'CMO (marketing)' }).id, 'cmo', 'o nome antigo continua valendo');
  assert.equal(funcaoDaPessoa({ funcaoTitulo: 'inventada', nivel: 'ceo' }).id, 'ceo', 'título desconhecido cai no nível (quando o nível é trabalho)');
  assert.equal(funcaoDaPessoa({}), null);
});

test('as funções oficiais vêm do documento (COO, CRO, CCO, CMO, CBDO, CAO, CXO, CEO, CFO, CTO), cada uma ligada ao cargo oficial', () => {
  assert.deepEqual(FUNCOES_OFICIAIS.map((f) => f.id), ['coo', 'cro', 'cco', 'cmo', 'cbdo', 'cao', 'cxo', 'ceo', 'cfo', 'cto']);
  assert.deepEqual(FUNCOES_DO_PAINEL.map((f) => f.id), ['socio_executivo', 'livoo_live', 'embaixador']);
  for (const f of FUNCOES_OFICIAIS) assert.ok(cargoOficialDaFuncao(f)?.missao, `${f.id} sem cargo oficial`);
  assert.equal(cargoOficialDaFuncao(funcaoDe('coo')).captacaoMes, 150000);
  assert.equal(cargoOficialDaFuncao(funcaoDe('socio_executivo')), null);
  // quem capta faz 2 reuniões de investimento por dia (Documento p. 16): está no dia da função
  for (const id of ['coo', 'cro', 'cco', 'cbdo', 'cao']) assert.equal(funcaoDe(id).dia.filter((t) => /Reunião de investimento/.test(t.titulo)).length, 2, id);
});

test('montarDiaDaFuncao: o dia do COO vira linhas prontas pra metodo_tarefas, com ensinamento', () => {
  const linhas = montarDiaDaFuncao('coo', { userId: 'emanuel', dia: '2026-09-08', criadoPorId: 'dono', prazoISO: '2026-09-08T21:00:00.000Z', ordemInicial: 3 });
  assert.equal(linhas.length, 7);
  assert.equal(linhas[0].hora, '08:30');
  assert.deepEqual([linhas[0].user_id, linhas[0].data, linhas[0].origem, linhas[0].mentalidade, linhas[0].habito, linhas[0].ordem], ['emanuel', '2026-09-08', 'xperf', 'diretor', 7, 3]);
  assert.ok(linhas[1].peso >= 5, 'treinamento pesa');
  assert.match(linhas[1].detalhe, /Mentalidade do Diretor/);
  assert.match(linhas[1].detalhe, /Tarefa da função COO · Diretor de Operações \(45 min\)/);
  assert.equal(linhas[6].prazo_em, '2026-09-08T21:00:00.000Z');
  assert.equal(montarDiaDaFuncao('diretor_operacoes', { userId: 'x', dia: '2026-09-08' }).length, 7, 'o id antigo acha o COO');
  assert.deepEqual(montarDiaDaFuncao('nada', { userId: 'x', dia: '2026-09-08' }), []);
  assert.deepEqual(montarDiaDaFuncao('ceo', {}), []);
});
