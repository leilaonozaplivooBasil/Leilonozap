// 🔴 13/09/2026 — ACHADO DE AUDITORIA (não pelo dono, pedida por ele: "me
// traga 1000% de certeza que está funcionando").
//
// A DIR-142 (Ritual do Amanhecer = sempre 20% do dia, à parte da régua de
// peso comum) mudou `valoresDasTarefas`/`reguaDoDia` em xgame.js — mas três
// telas (`DistribuirTarefa.jsx`, `QuadroGeralAbas.jsx`/AbaSemana,
// `XPerformanceGestao.jsx`) reimplementavam a conta chamando
// `distribuirDia`/`simularNovaTarefa`/`resumoDoCiclo` (distribuicaoFixo.js)
// DIRETO, com peso e fixo cheios — nenhuma delas sabia que o ritual virou
// balde à parte. Iam mostrar valor ERRADO assim que a DIR-142 publicasse.
//
// Este arquivo prova duas coisas: (1) as funções ritual-aware novas
// (`simularNovaTarefaComRitual`, `resumoDoCicloComRitual`) calculam certo
// sozinhas; (2) as três telas de fato PASSARAM a chamar essas funções, não
// as cruas — sem isso, o teste (1) provaria a função e nada mais.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  simularNovaTarefaComRitual, resumoDoCicloComRitual, valoresDasTarefas, PARTICIPANTE_PADRAO,
} from '../src/lib/xgame.js';
import { resumoDoCiclo } from '../src/lib/distribuicaoFixo.js';

const ler = (p) => semComentarios(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

const emanuel = { ...PARTICIPANTE_PADRAO, fixo_mes: 7000, minimo_dia: 3 };

test('simularNovaTarefaComRitual: a prévia de uma tarefa de RITUAL nova mostra os 20% garantidos, não a fatia de peso', () => {
  const tarefas = [{ id: 'a', peso: 4, categoria: 'producao', titulo: 'Ligações de prospecção' }];
  const sim = simularNovaTarefaComRitual({
    tarefas, participante: emanuel,
    novaTarefa: { peso: 6, titulo: 'Acordar — gratidão e foco no sonho', categoria: 'producao' },
  });
  // 20% de R$ 291,67 = R$ 58,33 — nunca peso 6 dividido pelo resto
  assert.equal(sim.valorNova, 58.33);
});

test('simularNovaTarefaComRitual: uma tarefa comum nova NÃO derruba o valor do ritual já planejado', () => {
  const tarefas = [{ id: 'ritual', peso: 6, categoria: 'producao', titulo: 'Acordar — gratidão e foco no sonho' }];
  const sim = simularNovaTarefaComRitual({
    tarefas, participante: emanuel,
    novaTarefa: { peso: 5, titulo: 'Reunião com o time', categoria: 'producao' },
  });
  // a tarefa do ritual não pode aparecer na lista de "quedas" — o valor dela
  // é fixo (20%), uma tarefa nova nos outros 80% não mexe nela
  assert.ok(!sim.quedas.some((q) => q.id === 'ritual'), 'o ritual caiu na lista de quedas — deixou de ser fixo');
});

test('simularNovaTarefaComRitual: abaixo da Rotina Perfeita, a tarefa nova só usa o que estava em aberto — não tira das outras', () => {
  // propriedade da régua (peso ÷ referência), não bug: enquanto o peso
  // somado fica abaixo da referência, valor por ponto de peso é constante
  // (pool ÷ referência) — só quando o dia "enche" é que uma tarefa nova
  // realoca fatia de quem já tinha.
  const tarefas = [{ id: 'a', peso: 3, categoria: 'producao', titulo: 'Organização da agenda' }];
  const sim = simularNovaTarefaComRitual({
    tarefas, participante: emanuel,
    novaTarefa: { peso: 3, titulo: 'Follow-up de clientes', categoria: 'producao' },
  });
  assert.ok(sim.valorNova > 0, 'a tarefa nova tem que valer algo');
  assert.equal(sim.quedas.length, 0, 'abaixo da referência a tarefa nova usa o que estava em aberto — não derruba quem já tinha');
  assert.ok(sim.pesoFalta < sim.pesoFaltava, 'o peso que falta pro dia completo tem que diminuir');
});

test('simularNovaTarefaComRitual: no dia CHEIO (peso já na referência), a tarefa nova tira fatia de quem já tinha', () => {
  const cheia = { ...emanuel, peso_referencia: 12 }; // referência sem ritual: 12 − 6 = 6
  const tarefas = [{ id: 'a', peso: 6, categoria: 'producao', titulo: 'Fechamento do mês' }];
  const sim = simularNovaTarefaComRitual({
    tarefas, participante: cheia,
    novaTarefa: { peso: 6, titulo: 'Reunião extra', categoria: 'producao' },
  });
  const queda = sim.quedas.find((q) => q.id === 'a');
  assert.ok(queda, 'o dia já estava cheio — a tarefa nova tinha que tirar fatia de quem já tinha');
  assert.ok(queda.para < queda.de);
});

test('resumoDoCicloComRitual: um dia SÓ com o ritual feito já garante 20% de ganho — resumoDoCiclo cru (sem ritual) erraria isso', () => {
  const tarefasPorDia = { '2026-09-08': [{ id: 'r', peso: 6, categoria: 'producao', titulo: 'Acordar — gratidão e foco no sonho', feito: true, conferido: true }] };
  const comRitual = resumoDoCicloComRitual({ participante: emanuel, tarefasPorDia, diasDoCiclo: ['2026-09-08'], hojeISO: '2026-09-08' });
  assert.equal(comRitual.ganho, 58.33, '20% do dia — o ritual sozinho já garante a fatia dele inteira');

  // a versão CRUA (o que as 3 telas chamavam antes da correção) trata o
  // ritual como peso 6 comum contra a referência cheia (76) — bem menos
  const cru = resumoDoCiclo({
    fixoMes: 7000, pesoReferencia: 76, tarefasPorDia, diasDoCiclo: ['2026-09-08'], hojeISO: '2026-09-08',
  });
  assert.ok(cru.ganho < comRitual.ganho, 'a régua crua deveria mostrar MENOS do que os 20% garantidos — é exatamente o bug encontrado');
});

test('resumoDoCicloComRitual: bate com valoresDasTarefas tarefa a tarefa (mesma fonte de verdade)', () => {
  const dia = [
    { id: 'r', peso: 6, categoria: 'producao', titulo: 'Acordar — gratidão e foco no sonho', feito: true, conferido: true },
    { id: 'b', peso: 4, categoria: 'producao', titulo: 'Reunião com o time', feito: true, conferido: false },
  ];
  const valores = valoresDasTarefas(dia, emanuel);
  const r = resumoDoCicloComRitual({ participante: emanuel, tarefasPorDia: { '2026-09-08': dia }, diasDoCiclo: ['2026-09-08'], hojeISO: '2026-09-08' });
  const somaGanho = Math.round((valores.r + valores.b) * 100) / 100;
  assert.equal(r.ganho, somaGanho);
  assert.equal(r.aConferir, valores.b, 'só a tarefa não conferida entra em "a conferir"');
});

// ───────────────────────────────────────────────────────────────────────────
// As três telas PRECISAM chamar as funções ritual-aware — não basta as
// funções existirem e funcionarem, se a tela continuar chamando a crua.

test('DistribuirTarefa.jsx: a prévia usa reguaDoDia/valoresDasTarefas/simularNovaTarefaComRitual — não distribuirDia/simularNovaTarefa cru', () => {
  const src = ler('src/components/licensing/CentralVendas/DistribuirTarefa.jsx');
  assert.match(src, /reguaDoDia, valoresDasTarefas, simularNovaTarefaComRitual,/, "sumiu o import ritual-aware");
  assert.match(src, /const dist = reguaDoDia\(tarefasDoDia, participante\);/);
  assert.match(src, /const valoresDia = valoresDasTarefas\(tarefasDoDia, participante\);/);
  assert.match(src, /simularNovaTarefaComRitual\(\{ tarefas: tarefasDoDia, participante, novaTarefa:/);
  assert.ok(!/\bdistribuirDia\(/.test(src), 'voltou a chamar distribuirDia cru');
  assert.ok(!/\bsimularNovaTarefa\(/.test(src), 'voltou a chamar simularNovaTarefa cru');
});

test('QuadroGeralAbas.jsx (AbaSemana): usa reguaDoDia — não distribuirDia cru', () => {
  const src = ler('src/components/licensing/CentralVendas/QuadroGeralAbas.jsx');
  assert.match(src, /const dist = reguaDoDia\(doDia\.filter\(ehProd\), base\);/);
  assert.ok(!/\bdistribuirDia\(/.test(src), 'voltou a chamar distribuirDia cru');
});

test('XPerformanceGestao.jsx: as três contas (ciclo, hoje, próximos dias) usam as versões ritual-aware', () => {
  const src = ler('src/components/licensing/CentralVendas/XPerformanceGestao.jsx');
  assert.match(src, /return resumoDoCicloComRitual\(\{ participante: base, tarefasPorDia: porDia, diasDoCiclo: diasCiclo, hojeISO: hoje \}\);/);
  assert.match(src, /const reguaHoje = reguaDoDia\(hojeDele, base\);/);
  assert.match(src, /const dist = reguaDoDia\(doDia\.filter\(ehProducao\), base\);/);
  assert.ok(!/\bdistribuirDia\(/.test(src), 'voltou a chamar distribuirDia cru');
  assert.ok(!/\bresumoDoCiclo\(/.test(src), 'voltou a chamar resumoDoCiclo cru');
});
