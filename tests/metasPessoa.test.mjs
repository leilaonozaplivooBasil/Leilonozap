// As metas da pessoa (06/09/2026): modelo por função, progresso das tarefas e vendas, ritmo e semáforo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAVES, METAS_MODELO, metasDoModelo, modeloDaFuncao, ritmoDoMes, progressoDasMetas, semaforo, mesDe, fracoesDoScore, carteiraDeCapital } from '../src/lib/metasPessoa.js';

test('o modelo por função vira metas prontas pra gravar, com rótulo e unidade', () => {
  const m = metasDoModelo('socio_executivo', { userId: 'u1', mes: '2026-09', criadoPorId: 'dono' });
  assert.equal(m.length, 4);
  assert.deepEqual([m[0].chave, m[0].rotulo, m[0].alvo, m[0].unidade, m[0].user_id, m[0].mes], ['contatos', 'Contatos feitos', 480, 'no mês', 'u1', '2026-09']);
  assert.equal(m.find((x) => x.chave === 'faturamento').unidade, 'R$');
  assert.deepEqual(metasDoModelo('inventada', { userId: 'u1', mes: '2026-09' }), []);
  assert.equal(Object.keys(METAS_MODELO).length, 23, '11 funções oficiais + 9 de mercado + 3 do painel');
  assert.ok(CHAVES.every((c) => c.rotulo && c.unidade));
});

test('ritmo do mês: quanto já passou; antes do mês 0, depois 1', () => {
  assert.equal(ritmoDoMes('2026-09', '2026-09-15'), 0.5);
  assert.equal(ritmoDoMes('2026-09', '2026-08-31'), 0);
  assert.equal(ritmoDoMes('2026-09', '2026-10-01'), 1);
  assert.equal(ritmoDoMes('2026-09', '2026-09-30'), 1);
  assert.equal(mesDe('2026-09-15'), '2026-09');
});

test('progresso: contatos são Hábito 4 feitos, reuniões Hábito 5, faturamento e produto vêm das vendas; ritmo diz se está atrás', () => {
  const metas = [
    { chave: 'contatos', tipo: 'numero', alvo: 100 },
    { chave: 'reunioes', tipo: 'numero', alvo: 20 },
    { chave: 'faturamento', tipo: 'numero', alvo: 10000 },
    { chave: 'produto:p1', tipo: 'produto', produto_id: 'p1', alvo: 10 },
  ];
  const tarefas = [
    ...Array.from({ length: 60 }, (_, i) => ({ id: `c${i}`, feito: true, habito: 4 })),
    { id: 'r1', feito: true, habito: 5 }, { id: 'r2', feito: false, habito: 5 },
  ];
  const vendas = [{ product_id: 'p1', quantity: 3, total_amount: 3000 }, { product_id: 'p2', total_amount: 1500 }];
  const p = progressoDasMetas({ metas, tarefasDoMes: tarefas, vendasDoMes: vendas, mes: '2026-09', hojeISO: '2026-09-15' });
  assert.deepEqual(p.map((x) => [x.feito, x.pct, x.noRitmo]), [[60, 60, true], [1, 5, false], [4500, 45, false], [3, 30, false]]);
  assert.equal(p[1].faltaNoRitmo, 9, 'na metade do mês devia ter 10 reuniões; tem 1');
});

test('semáforo: verde sem furo, amarelo com um, vermelho com dois ou mais — e diz os motivos', () => {
  assert.deepEqual(semaforo({}), { cor: 'verde', furos: 0, motivos: [] });
  assert.equal(semaforo({ planejou: false }).cor, 'amarelo');
  const v = semaforo({ planejou: false, atrasadas: 2, metasForaDoRitmo: 1 });
  assert.equal(v.cor, 'vermelho');
  assert.deepEqual(v.motivos, ['não gerou o planejamento de hoje', '2 prontos atrasados', '1 meta atrás do ritmo']);
});

test('o modelo das funções oficiais vem do Documento Oficial, marcado como oficial; o que é sugestão fica dito', () => {
  const coo = modeloDaFuncao('coo');
  assert.deepEqual(coo.map((m) => [m.chave, m.alvo, m.oficial]), [['captacao', 150000, true], ['reunioes_investimento', 44, true], ['pontos_retirada', 1, true], ['lojas', 1, true]]);
  assert.equal(coo[0].unidade, 'R$');
  assert.deepEqual(metasDoModelo('cro', { userId: 'u', mes: '2026-10' }).map((m) => `${m.chave}:${m.alvo}`), ['captacao:150000', 'reunioes_investimento:44', 'vendedores:20', 'licenciados:5', 'influenciadores:30', 'treinamentos:22']);
  assert.ok(modeloDaFuncao('cfo').every((m) => m.oficial === false && m.nota));
  assert.ok(modeloDaFuncao('socio_executivo').every((m) => m.oficial === false));
});

test('progresso: captação sai das oportunidades fechadas (fechado_100) do mês; vendedores/licenciados dos cadastros recrutados; entradas da plataforma', () => {
  const metas = [
    { chave: 'captacao', tipo: 'numero', alvo: 150000 },
    { chave: 'vendedores', tipo: 'numero', alvo: 20 },
    { chave: 'licenciados', tipo: 'numero', alvo: 5 },
    { chave: 'entradas', tipo: 'numero', alvo: 30000 },
    { chave: 'reunioes_investimento', tipo: 'numero', alvo: 44 },
  ];
  const oportunidades = [
    { estagio: 'fechado_100', valor_previsto: 50000 }, { estagio: 'fechado_100', valor_previsto: 25000 }, { estagio: 'fechado_99', valor_previsto: 999999 },
  ];
  const cadastros = [
    { id: 'a', primary_career_level: 'vendedor', recruited_by_id: 'eu' }, { id: 'b', career_levels: ['vendedor'], referred_by_id: 'eu' },
    { id: 'c', primary_career_level: 'vendedor', recruited_by_id: 'outro' }, { id: 'd', primary_career_level: 'licenciado', recruited_by_id: 'eu' }, { id: 'e', primary_career_level: 'usuario' },
  ];
  const tarefas = Array.from({ length: 11 }, (_, i) => ({ id: `r${i}`, feito: true, habito: 5 }));
  const p = progressoDasMetas({ metas, tarefasDoMes: tarefas, oportunidadesDoMes: oportunidades, cadastrosDoMes: cadastros, pessoaId: 'eu', mes: '2026-09', hojeISO: '2026-09-15' });
  assert.deepEqual(p.map((x) => [x.chave, x.feito, x.pct]), [['captacao', 75000, 50], ['vendedores', 2, 10], ['licenciados', 1, 20], ['entradas', 5, 0], ['reunioes_investimento', 11, 25]]);
  assert.equal(p[0].noRitmo, true, 'metade do mês, metade da meta');
});

test('as frações do Score saem do que a pessoa fez; sem dado é null, não zero escondido', () => {
  const f = fracoesDoScore({
    progresso: [{ alvo: 10, feito: 5 }, { alvo: 10, feito: 20 }],
    entregaveis: [{ dono_id: 'a', coluna: 'entregue' }, { dono_id: 'a', coluna: 'fazendo' }, { dono_id: 'b', coluna: 'entregue' }],
    tarefasCiclo: [
      { user_id: 'a', data: '2026-09-04', habito: 8, feito: true, categoria: 'mentoria' }, { user_id: 'a', data: '2026-09-04', habito: 8, feito: false, categoria: 'mentoria' },
      { user_id: 'a', data: '2026-09-04', feito: true, categoria: 'producao' }, { user_id: 'a', data: '2026-09-05', origem: 'xperf', feito: false },
      { user_id: 'a', data: '2026-09-09', feito: false, categoria: 'producao' },
    ],
    pessoaId: 'a', hojeISO: '2026-09-07', cicloInicio: '2026-09-01',
  });
  assert.deepEqual(f, { resultado: 0.75, entregaveis: 0.5, equipe: 0.5, cultura: 0.5, organizacao: 0.5 }, 'dia 04 planejado, dia 05 só distribuído; dia 09 ainda não chegou');
  assert.deepEqual(fracoesDoScore({ pessoaId: 'z', hojeISO: '2026-09-07' }), { resultado: null, entregaveis: null, equipe: null, cultura: null, organizacao: null });
});

test('a carteira de capital: o que fechou nos últimos 12 meses (contratos de 12 meses)', () => {
  const o = [
    { estagio: 'fechado_100', valor_previsto: 50000, fechado_em: '2026-08-01' },
    { estagio: 'fechado_100', valor_previsto: 50000, fechado_em: '2025-01-01' },
    { estagio: 'fechado_100', valor_previsto: 10000 },
    { estagio: 'reuniao_agendada', valor_previsto: 99 },
  ];
  assert.equal(carteiraDeCapital(o, '2026-09-07'), 60000);
  assert.equal(carteiraDeCapital([], '2026-09-07'), 0);
});
