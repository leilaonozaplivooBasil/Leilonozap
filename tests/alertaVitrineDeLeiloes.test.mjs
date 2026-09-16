// 🔔 16/09/2026 — O VIGIA DA PRAÇA DE LEILÕES.
//
// O dono, olhando a Home: "só temos 2 leilões ativos". Estava certo, e não era
// defeito. O retrato do banco naquele dia:
//
//   14/09 ... ~30 leilões encerrando de 10 em 10 minutos
//   15/09 ... ~15 leilões encerrando de 30 em 30 minutos
//   16/09 ... ZERO encerrando, ZERO criados
//
// Sobraram 2, os dois terminando em 29/09 — treze dias de praça parada, com o
// site anunciando "Leilões Ativos: 2". A fila de agendados estava VAZIA: nada
// travado, o estoque de leilões acabou e ninguém ficou sabendo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { MINIMO_NA_VITRINE, DIAS_DE_HORIZONTE } from '../api/functions/alertaVitrineDeLeiloes.js';

const VIGIA = readFileSync(new URL('../api/functions/alertaVitrineDeLeiloes.js', import.meta.url), 'utf8');
const semComentarios = VIGIA.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const VERCEL = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('🔴 o vigia NÃO escreve na tabela de leilões — quem vai a leilão é decisão comercial', () => {
  assert.ok(!/sb\('auctions/.test(semComentarios), 'o vigia passou a escrever em auctions');
  assert.ok(!/method:\s*'(POST|PATCH|PUT|DELETE)'[\s\S]{0,200}auctions/.test(semComentarios));
  // a única escrita permitida é o aviso
  const escritas = [...semComentarios.matchAll(/sb\('([a-z_]+)'[^)]*\{\s*\n?\s*method: '(POST|PATCH|PUT|DELETE)'/g)];
  assert.deepEqual(escritas.map((m) => m[1]), ['system_logs'], 'apareceu escrita fora do system_logs');
});

test('plano de investimento não conta como leilão', () => {
  // em 16/09 eram 36 registros de "Plano Visionário" na MESMA tabela — contá-los
  // inflaria a praça e o vigia nunca falaria
  assert.match(semComentarios, /\.filter\(\(a\) => !a\.is_investment_plan\)/);
});

test('só conta leilão aberto DE VERDADE — status active e fim no futuro', () => {
  assert.match(semComentarios, /a\.status === 'active' && a\.end_time && new Date\(a\.end_time\) > agora/);
});

test('o que já está agendado conta como praça garantida', () => {
  // `scheduled` abre sozinho pelo activateScheduledAuctions, que roda 1x/min
  assert.match(semComentarios, /a\.status === 'scheduled'/);
  assert.match(semComentarios, /status=in\.\(active,scheduled\)/);
});

test('dois avisos diferentes: vitrine curta AGORA e praça que vai esvaziar', () => {
  assert.match(semComentarios, /const vitrineCurta = abertos\.length < MINIMO_NA_VITRINE/);
  assert.match(semComentarios, /const vaiEsvaziar = encerramNoHorizonte\.length === 0 && naFila\.length === 0/);
  assert.match(semComentarios, /step: vaiEsvaziar \? 'VITRINE_VAI_ESVAZIAR' : 'VITRINE_CURTA'/);
});

test('🔇 só grava quando acha — vigia que fala todo dia vira ruído', () => {
  assert.match(semComentarios, /if \(vitrineCurta \|\| vaiEsvaziar\) \{/);
  const i = semComentarios.indexOf('if (vitrineCurta || vaiEsvaziar) {');
  const j = semComentarios.indexOf('system_logs');
  assert.ok(i > 0 && j > i, 'o aviso saiu de dentro da condição — passou a gravar todo dia');
});

test('o aviso diz o que fazer, não só que está ruim', () => {
  assert.match(VIGIA, /Para resolver: cadastrar leilões/);
  assert.match(VIGIA, /activateScheduledAuctions abre sozinho/);
});

test('o aviso nunca derruba a checagem', () => {
  // a gravação do aviso é rede de segurança: se o system_logs estiver fora do
  // ar, o vigia ainda tem que responder a contagem em vez de estourar 500.
  const i = semComentarios.indexOf('system_logs');
  assert.ok(i > 0, 'sumiu a gravação do aviso');
  const antes = semComentarios.slice(0, i);
  assert.ok(antes.lastIndexOf('try {') > antes.lastIndexOf('} catch'),
    'a gravação do aviso saiu de dentro do try — uma falha ali derruba a checagem inteira');
  // a mensagem do aviso é longa, então a janela é até o `return` final —
  // cravar um número de caracteres aqui quebraria ao reescrever o texto
  const depois = semComentarios.slice(i);
  const posCatch = depois.indexOf('catch (_)');
  const posRetorno = depois.indexOf('return res.status(200)');
  assert.ok(posCatch > 0, 'o catch do aviso sumiu');
  assert.ok(posCatch < posRetorno, 'o catch ficou depois do retorno — não protege mais a gravação');
});

test('as duas réguas são números explicados, não mágicos no meio do código', () => {
  assert.equal(MINIMO_NA_VITRINE, 3);
  assert.equal(DIAS_DE_HORIZONTE, 3);
  assert.match(VIGIA, /export const MINIMO_NA_VITRINE/);
  assert.match(VIGIA, /export const DIAS_DE_HORIZONTE/);
});

test('mesma trava de cron dos outros vigias — só a Vercel chama', () => {
  assert.match(semComentarios, /process\.env\.CRON_SECRET && \(req\.headers\?\.authorization \|\| ''\) !== `Bearer \$\{process\.env\.CRON_SECRET\}`/);
});

test('🔔 está no cron — senão é um arquivo que ninguém chama', () => {
  const c = VERCEL.crons.find((x) => x.path === '/api/functions/alertaVitrineDeLeiloes');
  assert.ok(c, 'o vigia não foi cadastrado no vercel.json');
  assert.match(c.schedule, /^\d+ \d+ \* \* \*$/, 'vigia de praça é diário, não de minuto em minuto');
});

test('o deploy não é pulado por este arquivo — vercel.json não está na lista de ignorados', () => {
  // o ignoreCommand pula build quando o commit só toca *.md, docs/**, tests/**…
  const ignore = String(VERCEL.ignoreCommand || '');
  assert.ok(!/vercel\.json/.test(ignore), 'mexer no vercel.json passou a não disparar deploy');
});
