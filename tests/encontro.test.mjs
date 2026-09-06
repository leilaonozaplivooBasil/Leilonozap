// 🧠 O ENCONTRO DA MENTALIDADE (dono, 06/09/2026): o cronômetro 15+45+120, as
// pautas virando tópico (IA ou régua local), a demanda que sai do tópico e a
// produção da semana. Tudo puro: o relógio entra por parâmetro.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOCOS, MINUTOS_TOTAL, cronometroInicial, iniciarBloco, pausar, avancar, estadoDoCronometro, fmtTempo,
  pautasDoTexto, promptDoRoteiro, SCHEMA_ROTEIRO, roteiroLocal, normalizarRoteiro, funcaoDaPauta, repartirMinutos,
  sugerirResponsavel, sextaDaSemana, demandaDoTopico, tarefaDaDemanda, cardDaDemanda, estadoDaDemanda, producaoDaSemana, slidesDoEncontro,
} from '../src/lib/encontro.js';

const T = (hhmm) => `2026-09-07T${hhmm}:00.000Z`;

test('os três blocos: 15 de leitura, 45 de treinamento, 120 de reunião — 3 horas', () => {
  assert.deepEqual(BLOCOS.map((b) => [b.id, b.minutos]), [['leitura', 15], ['treinamento', 45], ['reuniao', 120]]);
  assert.equal(MINUTOS_TOTAL, 180);
});

test('cronômetro: começa, pausa (o acumulado absorve), retoma, estoura, avança e fecha — sem relógio de dentro', () => {
  let c = cronometroInicial();
  let e = estadoDoCronometro(c, T('09:00'));
  assert.deepEqual([e.atual, e.rodando, e.comecou, e.proximo.id], [null, false, false, 'leitura']);
  c = iniciarBloco(c, 'leitura', T('09:00'));
  e = estadoDoCronometro(c, T('09:10'));
  assert.deepEqual([e.atual.id, e.atual.decorrido, e.atual.restante, e.rodando], ['leitura', 600, 300, true]);
  c = pausar(c, T('09:10'));
  e = estadoDoCronometro(c, T('09:30'));
  assert.deepEqual([e.rodando, e.atual.decorrido], [false, 600], 'pausado não anda');
  c = iniciarBloco(c, 'leitura', T('09:30'));
  e = estadoDoCronometro(c, T('09:40'));
  assert.deepEqual([e.atual.decorrido, e.atual.estourou, e.atual.estouro, e.atual.restante], [1200, true, 300, 0], 'passou dos 15 min: estourou 5');
  c = avancar(c, T('09:40'));
  e = estadoDoCronometro(c, T('09:40'));
  assert.deepEqual([e.atual.id, e.blocos[0].feito, e.blocos[0].decorrido, e.proximo.id], ['treinamento', true, 1200, 'reuniao']);
  c = avancar(c, T('10:25'));
  c = avancar(c, T('12:25'));
  e = estadoDoCronometro(c, T('12:30'));
  assert.deepEqual([e.terminado, e.atual, e.totalDecorrido, e.rodando], [true, null, 1200 + 2700 + 7200, false]);
  assert.equal(fmtTempo(e.totalDecorrido), '3:05:00');
  assert.equal(fmtTempo(59), '0:59');
  // avançar do zero começa a leitura
  assert.equal(estadoDoCronometro(avancar(cronometroInicial(), T('09:00')), T('09:00')).atual.id, 'leitura');
  // lixo no banco não derruba a tela
  assert.equal(estadoDoCronometro({ atual: 'inventado', blocos: { leitura: { acumulado: 'x' } } }, T('09:00')).atual, null);
});

test('as pautas: uma por linha, sem marcador; a função que cada uma pede', () => {
  assert.deepEqual(pautasDoTexto('- Abrir o ponto de retirada de Jacarepaguá\n2) Tráfego do Ranking caro\n• Fechar o caixa; Contratar 2 vendedores\n\n'), ['Abrir o ponto de retirada de Jacarepaguá', 'Tráfego do Ranking caro', 'Fechar o caixa', 'Contratar 2 vendedores']);
  assert.equal(funcaoDaPauta('Tráfego do Ranking está caro'), 'cmo');
  assert.equal(funcaoDaPauta('Abrir o ponto de retirada de Jacarepaguá'), 'coo');
  assert.equal(funcaoDaPauta('Estoque da distribuidora atrasado'), 'logistica');
  assert.equal(funcaoDaPauta('Fechar o caixa de agosto'), 'cfo');
  assert.equal(funcaoDaPauta('Investidor da Barra quer reunião'), 'cco');
  assert.equal(funcaoDaPauta('Bom dia'), null);
  assert.deepEqual(repartirMinutos(3), [40, 40, 40]);
  assert.deepEqual(repartirMinutos(7), [18, 17, 17, 17, 17, 17, 17]);
  assert.deepEqual(repartirMinutos(0), []);
});

test('o tópico pela régua local: leitura do Hábito do mês, treinamento prático, um tópico por pauta somando 120 min, cada um com demanda no imperativo', () => {
  const r = roteiroLocal({ pautas: ['Abrir o ponto de retirada de Jacarepaguá', 'Tráfego do Ranking está caro'], mes: '2026-09', habitosDoMes: [1, 2] });
  assert.match(r.tema, /Estruturação · Sonho/);
  assert.match(r.leitura.titulo, /Hábito 1 — Sonho/);
  assert.equal(r.treinamento.passos.length, 4);
  assert.equal(r.reuniao.topicos.length, 2);
  assert.equal(r.reuniao.topicos.reduce((s, t) => s + t.minutos, 0), 120);
  assert.deepEqual(r.reuniao.topicos.map((t) => [t.responsavel_funcao, t.demanda]), [['coo', 'Abrir o ponto de retirada de Jacarepaguá'], ['cmo', 'Resolver: Tráfego do Ranking está caro']]);
  assert.equal(roteiroLocal({ pautas: [] }).reuniao.topicos.length, 1, 'sem pauta, um tópico padrão');
});

test('o tópico pela IA: o prompt leva as pautas, o mês e a sala; a resposta é normalizada (minutos fecham em 120, o que faltar vem da régua)', () => {
  const p = promptDoRoteiro({ pautas: ['Fechar o caixa'], mes: '2026-10', tema: 'Lista e Contato', time: [{ nome: 'Emanuel', funcaoCurta: 'COO' }], conduzidoPor: 'Luiz', treinamentoPor: 'Karen' });
  assert.match(p, /1\. Fechar o caixa/);
  assert.match(p, /1\.000 entradas\/dia/);
  assert.match(p, /Na sala: Emanuel \(COO\)/);
  assert.match(p, /quem treina: Karen/);
  assert.match(p, /coo = COO/);
  assert.ok(SCHEMA_ROTEIRO.required.includes('reuniao'));
  const n = normalizarRoteiro({ tema: 'Caixa em dia', reuniao: { topicos: [{ titulo: 'Caixa de agosto', minutos: 50, demanda: 'Fechar o caixa de agosto', mentalidade: 'diretor', habito: 7, responsavel_funcao: 'cfo' }, { titulo: 'Sem minutos' }] } }, { pautas: ['Fechar o caixa', 'Outra'], mes: '2026-10' });
  assert.equal(n.origem, 'ia');
  assert.deepEqual(n.reuniao.topicos.map((t) => [t.titulo, t.minutos, t.responsavel_funcao, t.mentalidade, t.habito]).slice(0, 1), [['Caixa de agosto', 50, 'cfo', 'diretor', 7]]);
  assert.deepEqual([n.reuniao.topicos[1].titulo, n.reuniao.topicos[1].minutos], ['Sem minutos', 70], 'o que faltou fecha os 120 no último');
  assert.ok(n.reuniao.topicos[1].mentalidade && n.reuniao.topicos[1].demanda, 'mentalidade e demanda vêm da régua');
  assert.ok(n.leitura.titulo && n.treinamento.passos.length, 'leitura e treinamento vêm da régua quando a IA não manda');
  assert.equal(normalizarRoteiro(null, { pautas: ['x'] }).origem, 'local');
});

test('a demanda que sai do tópico: quem (pela função), até sexta 18h, com mentalidade, Hábito, peso e ensinamento; vira tarefa do dia e/ou card', () => {
  const time = [{ id: 'emanuel', nome: 'Emanuel Silva', funcaoId: 'coo' }, { id: 'jean', nome: 'Jean', funcaoId: 'cmo' }];
  const t = { titulo: 'Tráfego do Ranking', demanda: 'Cortar o CPC do Ranking pra R$ 0,70', responsavel_funcao: 'cmo', mentalidade: 'diretor', habito: 7, objetivo: 'CPC abaixo de R$ 1' };
  assert.equal(sugerirResponsavel(t, time).id, 'jean');
  assert.equal(sugerirResponsavel({ responsavel_funcao: 'cfo' }, time), null);
  assert.equal(sextaDaSemana('2026-09-07'), '2026-09-11');
  assert.equal(sextaDaSemana('2026-09-11'), '2026-09-11');
  assert.equal(sextaDaSemana('2026-09-12'), '2026-09-18');
  const d = demandaDoTopico(t, { pessoaId: 'jean', pessoaNome: 'Jean', criadoPorId: 'dono', criadoPorNome: 'Luiz', encontroId: 'e1', prazoDia: '2026-09-11' });
  assert.deepEqual([d.titulo, d.pessoa_id, d.origem, d.status, d.mentalidade, d.habito, d.encontro_id, String(d.prazo_em).slice(0, 10)], ['Cortar o CPC do Ranking pra R$ 0,70', 'jean', 'encontro', 'recebida', 'diretor', 7, 'e1', '2026-09-11']);
  assert.ok(d.peso >= 1 && d.peso <= 6);
  assert.match(d.detalhe, /Mentalidade do Diretor/);
  assert.match(d.detalhe, /CPC abaixo de R\$ 1/);
  assert.equal(demandaDoTopico({ demanda: '' }, { pessoaId: 'x' }), null);
  const tarefa = tarefaDaDemanda({ ...d, id: 'd1' }, { dia: '2026-09-08', hora: '10:00', ordem: 3 });
  assert.deepEqual([tarefa.user_id, tarefa.data, tarefa.hora, tarefa.origem, tarefa.demanda_id, tarefa.encontro_id, tarefa.ordem, tarefa.feito], ['jean', '2026-09-08', '10:00', 'xperf', 'd1', 'e1', 3, false]);
  const card = cardDaDemanda({ ...d, id: 'd1' }, { tarefaId: 't9' });
  assert.deepEqual([card.user_id, card.coluna, card.prazo, card.virou_tarefa_id, card.demanda_id, card.responsavel_nome], ['jean', 'aberto', '2026-09-11', 't9', 'd1', 'Luiz']);
});

test('a produção da semana: o estado de cada demanda vem da tarefa/card; por pessoa e no todo', () => {
  const demandas = [
    { id: 'd1', pessoa_id: 'e', pessoa_nome: 'Emanuel', status: 'agendada', tarefa_id: 't1', agendada_para: '2026-09-08', hora: '10:00' },
    { id: 'd2', pessoa_id: 'e', pessoa_nome: 'Emanuel', status: 'recebida' },
    { id: 'd3', pessoa_id: 'e', pessoa_nome: 'Emanuel', status: 'agendada', tarefa_id: 't3' },
    { id: 'd4', pessoa_id: 'c', pessoa_nome: 'Carla', status: 'agendada', tarefa_id: 't4', prazo_em: '2026-09-04T18:00:00Z' },
    { id: 'd5', pessoa_id: 'c', pessoa_nome: 'Carla', status: 'devolvida' },
  ];
  const tarefas = [{ id: 't1', feito: true, conferido: true }, { id: 't3', feito: true }, { id: 't4', feito: false }];
  assert.equal(estadoDaDemanda(demandas[0], { tarefas }).id, 'conferida');
  assert.equal(estadoDaDemanda(demandas[1], { tarefas }).id, 'recebida');
  assert.equal(estadoDaDemanda(demandas[2], { tarefas }).id, 'pronta');
  assert.equal(estadoDaDemanda(demandas[3], { tarefas, hojeISO: '2026-09-07' }).id, 'atrasada');
  assert.equal(estadoDaDemanda(demandas[4], {}).id, 'devolvida');
  assert.match(estadoDaDemanda({ status: 'agendada', agendada_para: '2026-09-08', hora: '10:00' }, {}).rotulo, /agendada · 08\/09 10:00/);
  const p = producaoDaSemana({ demandas, tarefas, hojeISO: '2026-09-07' });
  assert.deepEqual(p.pessoas.map((x) => [x.nome, x.total, x.concluidas, x.recebidas, x.atrasadas, x.devolvidas, x.pct]), [['Emanuel', 3, 2, 1, 0, 0, 67], ['Carla', 2, 0, 0, 1, 1, 0]]);
  assert.deepEqual([p.total, p.concluidas, p.pct, p.atrasadas, p.semAgendar], [5, 2, 40, 1, 1]);
});

test('os slides: capa, abertura, leitura, treinamento, um por tópico, fechamento com as demandas', () => {
  const r = roteiroLocal({ pautas: ['A', 'B'], mes: '2026-09' });
  const s = slidesDoEncontro({ data: 'segunda, 07/09', roteiro: r, mes: '2026-09', conduzidoPor: 'Luiz', treinamentoPor: 'Karen', demandas: [{ pessoa_nome: 'Emanuel', titulo: 'Fazer A' }] });
  assert.deepEqual(s.map((x) => x.id), ['capa', 'abertura', 'leitura', 'treinamento', 'topico-0', 'topico-1', 'fechamento']);
  assert.deepEqual(s.map((x) => x.bloco), [null, null, 'leitura', 'treinamento', 'reuniao', 'reuniao', null]);
  assert.match(s[0].sub, /Estruturação/);
  assert.match(s[3].sub, /quem treina: Karen/);
  assert.match(s.at(-1).corpo.join(' '), /Emanuel: Fazer A/);
});

test('a visão executiva de todo mundo: quem planejou, quem produziu, a semana e as demandas de cada um — vermelho primeiro', async () => {
  const { visaoExecutiva } = await import('../src/lib/encontro.js');
  const time = [{ id: 'e', nome: 'Emanuel', funcaoCurta: 'COO' }, { id: 'c', nome: 'Carla', funcaoCurta: 'Embaixador' }, { id: 'j', nome: 'Jean' }];
  const tarefas = [
    { user_id: 'e', data: '2026-09-07', feito: true }, { user_id: 'e', data: '2026-09-07', feito: false },
    { user_id: 'e', data: '2026-09-08', feito: false },
    { user_id: 'c', data: '2026-09-07', feito: false, origem: 'xperf' },
    { user_id: 'c', data: '2026-09-04', feito: false, prazo_em: '2026-09-04T21:00:00Z' },
  ];
  const demandas = [
    { id: 'd1', pessoa_id: 'e', status: 'agendada', tarefa_id: 't1' }, { id: 'd2', pessoa_id: 'c', status: 'recebida' },
  ];
  const v = visaoExecutiva({ time, tarefas, demandas, tarefasDasDemandas: [{ id: 't1', feito: true, conferido: true }], hojeISO: '2026-09-07', segunda: '2026-09-07' });
  const e = v.linhas.find((l) => l.pessoaId === 'e');
  assert.deepEqual([e.cor, e.hoje.planejou, e.hoje.feitas, e.hoje.total, e.semana.feitas, e.semana.total, e.demandas.concluidas, e.produziu], ['verde', true, 1, 2, 1, 2, 1, true]);
  const c = v.linhas.find((l) => l.pessoaId === 'c');
  assert.deepEqual([c.cor, c.hoje.planejou, c.demandas.semAgendar, c.produziu], ['vermelho', false, 1, false], 'só distribuída hoje (não planejou) + demanda sem agendar');
  const j = v.linhas.find((l) => l.pessoaId === 'j');
  assert.deepEqual([j.cor, j.hoje.vazio, j.produziu], ['verde', true, false], 'dia vazio não é furo — mas não produziu');
  assert.deepEqual(v.linhas.map((l) => l.pessoaId), ['c', 'e', 'j'], 'vermelho primeiro; entre verdes, quem tem mais demanda');
  assert.deepEqual([v.planejaramHoje, v.semPlanejarHoje, v.produziram, v.naoProduziram, v.demandas.pct, v.vermelhos], [1, 2, 1, 2, 50, 1]);
});
