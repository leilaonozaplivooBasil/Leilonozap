// As empresas e as funções (06/09/2026): "a partir da função o sistema já me
// dá as tarefas do dia dele; e preciso identificar a empresa".
import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPRESAS, rotuloDaEmpresa, FUNCOES, funcaoDoNivel, funcaoDaPessoa, montarDiaDaFuncao } from '../src/lib/funcoes.js';

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
  assert.ok(FUNCOES.length >= 9);
  for (const f of FUNCOES) {
    assert.ok(f.dia.length >= 4, f.nome);
    assert.ok(['executivo', 'diretor', 'ceo'].includes(f.mentalidade), f.nome);
    // o dia de uma função pode passar por Hábitos fora do foco da mentalidade
    // (o embaixador ainda faz lista e contato); o que importa é ser dos 8
    for (const t of f.dia) assert.ok(t.habito >= 1 && t.habito <= 8, `${f.nome}: "${t.titulo}" Hábito ${t.habito}`);
    assert.ok(f.dia.every((t, i, arr) => i === 0 || arr[i - 1].hora <= t.hora), `${f.nome}: horas fora de ordem`);
  }
});

test('a função vem do painel de controle pelo nível; a escolhida (CMO) vence; sem nada, null', () => {
  assert.equal(funcaoDoNivel('diretoria_operacao').nome, 'Diretor de Operações');
  assert.equal(funcaoDoNivel('ceo').id, 'ceo');
  assert.equal(funcaoDoNivel('trainee_diretor'), null);
  assert.equal(funcaoDaPessoa({ nivel: 'executivo_conta' }).id, 'socio_executivo');
  assert.equal(funcaoDaPessoa({ funcaoTitulo: 'cmo', nivel: 'diretoria_operacao' }).nome, 'CMO (marketing)');
  assert.equal(funcaoDaPessoa({ funcaoTitulo: 'CMO (marketing)' }).id, 'cmo');
  assert.equal(funcaoDaPessoa({ funcaoTitulo: 'inventada', nivel: 'ceo' }).id, 'ceo', 'título desconhecido cai no nível');
  assert.equal(funcaoDaPessoa({}), null);
});

test('montarDiaDaFuncao: o dia do Diretor de Operações vira linhas prontas pra metodo_tarefas, com ensinamento', () => {
  const linhas = montarDiaDaFuncao('diretor_operacoes', { userId: 'emanuel', dia: '2026-09-08', criadoPorId: 'dono', prazoISO: '2026-09-08T21:00:00.000Z', ordemInicial: 3 });
  assert.equal(linhas.length, 6);
  assert.equal(linhas[0].hora, '08:30');
  assert.deepEqual([linhas[0].user_id, linhas[0].data, linhas[0].origem, linhas[0].mentalidade, linhas[0].habito, linhas[0].ordem], ['emanuel', '2026-09-08', 'xperf', 'diretor', 7, 3]);
  assert.ok(linhas[1].peso >= 5, 'treinamento pesa');
  assert.match(linhas[1].detalhe, /Mentalidade do Diretor/);
  assert.match(linhas[1].detalhe, /Tarefa da função Diretor de Operações \(45 min\)/);
  assert.equal(linhas[5].prazo_em, '2026-09-08T21:00:00.000Z');
  assert.deepEqual(montarDiaDaFuncao('nada', { userId: 'x', dia: '2026-09-08' }), []);
  assert.deepEqual(montarDiaDaFuncao('ceo', {}), []);
});
