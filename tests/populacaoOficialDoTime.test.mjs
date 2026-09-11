// 🔢 10/09/2026 — dono, comparando prints do ADM X-Game e da Visão
// Executiva lado a lado: "os números não batem... eu preciso ter o número
// perfeito, e ele precisa estar aparecendo em todos os lugares." Achado:
// cada tela contava um TIME diferente pra "hoje" (ADM: hierarquia do
// painel, ~12; Visão Executiva: todo mundo com registro, sem filtrar quem
// está ativo, ~17) e a Visão Executiva lia de uma fotografia atrasada
// (xgame_diario) em vez de ao vivo. Dono, decidindo a população oficial:
// "todos que estão de fato recebendo voto, esses de fato estão atuando na
// operação ativa."
import test from 'node:test';
import assert from 'node:assert/strict';
import { participantesVotaveis, resumoTimeHoje, textoCompartilharRanking } from '../src/lib/xgame.js';

test('participantesVotaveis: só quem está ativo E é votável — nem inativo, nem super_admin fechado', () => {
  const participantes = [
    { user_id: 'a', ativo: true },
    { user_id: 'b', ativo: false },
    { user_id: 'c', ativo: true, aceita_ser_votado: false },
    { user_id: 'd', ativo: true, aceita_ser_votado: true },
  ];
  const usuariosPorId = new Map([
    ['a', { role: 'executivo' }],
    ['b', { role: 'executivo' }],
    ['c', { role: 'super_admin' }],
    ['d', { role: 'super_admin' }],
  ]);
  assert.deepEqual(participantesVotaveis(participantes, usuariosPorId), ['a', 'd'], 'b está inativo; c é super_admin que não abriu o próprio voto');
});

test('participantesVotaveis: super_admin comum (sem role especial) sem aceita_ser_votado continua votável — não regride quem já estava certo', () => {
  const participantes = [{ user_id: 'x', ativo: true }];
  const usuariosPorId = new Map([['x', { role: 'executivo' }]]);
  assert.deepEqual(participantesVotaveis(participantes, usuariosPorId), ['x']);
});

test('participantesVotaveis: sem usuariosPorId (role desconhecido) não quebra — trata como não-super_admin', () => {
  const participantes = [{ user_id: 'x', ativo: true }];
  assert.deepEqual(participantesVotaveis(participantes), ['x']);
});

test('participantesVotaveis: lista vazia não quebra', () => {
  assert.deepEqual(participantesVotaveis([], new Map()), []);
  assert.deepEqual(participantesVotaveis(), []);
});

const TAREFAS = [
  { data: '2026-09-10', feito: true, titulo: 'Gratidão' },
  { data: '2026-09-10', feito: false, titulo: 'Reunião 1 (45-60 min)' },
  { data: '2026-09-10', feito: true, titulo: 'Apresentação pro cliente' },
  { data: '2026-09-09', feito: true, titulo: 'Reunião de ontem' }, // fora de hoje
];

test('resumoTimeHoje: total/feitas e reuniões total/feitas, só do dia pedido', () => {
  const r = resumoTimeHoje(TAREFAS, '2026-09-10');
  assert.deepEqual(r, { total: 3, feitas: 2, reunioesTotal: 2, reunioesFeitas: 1 });
});

test('resumoTimeHoje: nada hoje não quebra, devolve tudo zerado', () => {
  assert.deepEqual(resumoTimeHoje(TAREFAS, '2026-01-01'), { total: 0, feitas: 0, reunioesTotal: 0, reunioesFeitas: 0 });
  assert.deepEqual(resumoTimeHoje([], '2026-09-10'), { total: 0, feitas: 0, reunioesTotal: 0, reunioesFeitas: 0 });
});

test('src/components/licensing/CentralVendas/XPerformanceGestao.jsx: o resumo do time hoje usa a população votável (não timeCorporativo)', async () => {
  const fs = await import('node:fs');
  const ARQ = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/XPerformanceGestao.jsx', import.meta.url), 'utf8');
  assert.match(ARQ, /participantesVotaveis\(/, 'a população do resumo hoje precisa vir de participantesVotaveis — não de timeCorporativo');
  assert.match(ARQ, /resumoTimeHoje\(/, 'o cálculo do resumo do dia precisa reusar a função pura compartilhada');
});

test('src/components/licensing/CentralVendas/XGameVisaoExecutiva.jsx: tarefas/reuniões hoje vêm da mesma função e população, ao vivo', async () => {
  const fs = await import('node:fs');
  const ARQ = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/XGameVisaoExecutiva.jsx', import.meta.url), 'utf8');
  assert.match(ARQ, /participantesVotaveis\(/, 'a Visão Executiva precisa filtrar pela mesma população oficial');
  assert.match(ARQ, /resumoTimeHoje\(/, 'tarefas/reuniões hoje precisam vir da mesma função pura — não mais só da fotografia de xgame_diario');
});

// 📣 10/09/2026 — dono: "eu preciso ter um local de compartilhamento do
// ranking do dia, junto com o primeiro, o segundo e o terceiro lugar...
// exatamente como é visto hoje no pódio... o texto bacana diretamente no
// WhatsApp com o link."
test('textoCompartilharRanking: pódio + o dia de hoje + link, nessa ordem', () => {
  const texto = textoCompartilharRanking({
    linhasPodio: ['🥇 Ribeiro — 12,47 · ouro', '🥈 Paim — 12,36 · ouro', '🥉 Luciano Pinheiro — 11,78 · ouro'],
    diaHojePct: 0.52,
    tarefasHojeTotal: 191,
    tarefasHojeFeitas: 99,
    link: 'https://leilaonozap.net/RankingXGame',
  });
  assert.match(texto, /X-GAME — Ranking do Ciclo/);
  assert.match(texto, /🥇 Ribeiro — 12,47 · ouro/);
  assert.match(texto, /🥉 Luciano Pinheiro/);
  assert.match(texto, /52% do time fechou o dia · 99\/191 tarefas/);
  assert.match(texto, /https:\/\/leilaonozap\.net\/RankingXGame/);
  // a ordem importa: pódio (evolução do ciclo) primeiro, hoje depois — "a
  // informação do dia importa, mas evolução também precisa ser forte"
  assert.ok(texto.indexOf('Ribeiro') < texto.indexOf('Hoje:'), 'o pódio do ciclo vem antes do resumo de hoje');
});

test('textoCompartilharRanking: sem link não quebra, e some a linha do link', () => {
  const texto = textoCompartilharRanking({ linhasPodio: ['🥇 Ribeiro — 12,47 · ouro'], diaHojePct: 0.3, tarefasHojeTotal: 10, tarefasHojeFeitas: 3 });
  assert.ok(!/Ranking completo/.test(texto));
  assert.match(texto, /30% do time fechou o dia · 3\/10 tarefas/);
});

test('textoCompartilharRanking: sem nada não quebra', () => {
  assert.doesNotThrow(() => textoCompartilharRanking());
  assert.match(textoCompartilharRanking(), /0% do time fechou o dia · 0\/0 tarefas/);
});

// 🔎 10/09/2026 — dono, olhando o pódio em produção: "pode clicar a abrir
// as informações da moeda de cada um... mais coisas validando e mais
// informações pra gerar melhor entendimento." Clicar numa linha da tabela
// abre o detalhe — a mesma moeda em fatias + os dois portões (caráter e
// vendas) escritos por extenso, com o número exato que decidiu cada um.
test('src/components/licensing/CentralVendas/XGameVisaoExecutiva.jsx: a linha do ranking abre o detalhe da moeda (componentes + portões) ao clicar', async () => {
  const fs = await import('node:fs');
  const ARQ = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/XGameVisaoExecutiva.jsx', import.meta.url), 'utf8');
  assert.match(ARQ, /data-teste="linha-ranking"/, 'a linha da tabela precisa ser clicável');
  assert.match(ARQ, /data-teste="detalhe-moeda"/, 'o detalhe expandido precisa existir');
  assert.match(ARQ, /function DetalheMoeda/, 'o detalhe reusa a MoedaPizza — não recalcula nada');
  assert.match(ARQ, /PISO_CARATER_LIGA/);
  assert.match(ARQ, /PISO_CARATER_PLATINA/);
  assert.match(ARQ, /META_VENDAS_CICLO/);
});
