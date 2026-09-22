/**
 * O NOSSO QUADRO com os três destinos, no navegador (06/09/2026).
 *
 * 🔴 Dono: "toda alimentação na lista ou no quadro dá a opção de colocar na
 * Jornada; no quadro, de botar na lista e na Jornada — com uma comunicação
 * mais clara, a pessoa não está entendendo o quadro."
 *
 * O que só o navegador mede (banco de mentira, segunda 07/09/2026):
 *   • cada card DIZ onde está: quadro · dia · Jornada, e o caso confuso
 *     (no dia sem horário) vira alerta escrito;
 *   • "levar pro meu dia" abre o painel com a hora, e confirmar cria a tarefa
 *     com a hora e liga o card;
 *   • a entrada nova fala pra onde vai enquanto se escreve, e "também no meu
 *     dia às 07:30" cria card + tarefa ligados de uma vez.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-quadro');
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], { cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit' });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'quadro.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/quadro.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function abrir() {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="quadro-compromisso"]').waitFor();
  await pagina.locator('[data-teste="onde-esta"]').first().waitFor();
  return { pagina, ctx, erros };
}
const escritas = (pagina) => pagina.evaluate(() => window.__bancoFalso.escritas);
const card = (pagina, titulo) => pagina.locator('[data-teste="quadro-compromisso"] [data-teste="onde-esta"]').locator('xpath=ancestor::*[contains(@class,"group")][1]').filter({ hasText: titulo }).first();
const pilulas = async (pagina, titulo) => card(pagina, titulo).locator('[data-teste="onde-esta"] [data-teste^="pilula-"]').evaluateAll((els) => els.map((e) => [e.dataset.teste.replace('pilula-', ''), e.dataset.acesa, e.textContent.trim()]));

test('CADA CARD DIZ ONDE ESTÁ: só no quadro · no dia sem horário (alerta) · na Jornada às 07:00', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  assert.deepEqual(await pilulas(pagina, 'Quinta — Empurrar B'), [['quadro', 'sim', 'no quadro · Academia'], ['dia', 'nao', 'fora do dia'], ['jornada', 'nao', 'fora da Jornada']]);
  assert.deepEqual(await pilulas(pagina, 'Segunda — Empurrar A'), [['quadro', 'sim', 'no quadro · Academia'], ['dia', 'sim', 'no seu dia'], ['jornada', 'nao', 'sem horário · fora da Jornada']]);
  assert.deepEqual(await pilulas(pagina, 'Corrida leve'), [['quadro', 'sim', 'no quadro · Academia'], ['dia', 'sim', 'no seu dia'], ['jornada', 'sim', 'na Jornada às 07:00']]);
  // quem já está no dia não tem "levar pro meu dia"; tem "dar um horário" / "mudar horário"
  assert.equal(await card(pagina, 'Segunda — Empurrar A').locator('[data-teste="levar-pro-dia"]').count(), 0);
  assert.match(await card(pagina, 'Segunda — Empurrar A').locator('[data-teste="chip-hora"]').textContent(), /dar um horário/);
  assert.match(await card(pagina, 'Corrida leve').locator('[data-teste="chip-hora"]').textContent(), /mudar horário \(07:00\)/);
  await pagina.screenshot({ path: path.join(FOTOS, 'quadro-onde-esta.png'), fullPage: true });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('LEVAR PRO MEU DIA: abre o painel, dá a hora, confirma — a tarefa nasce com a hora e o card liga; as pílulas mudam', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  const c = card(pagina, 'Quinta — Empurrar B');
  await c.locator('[data-teste="levar-pro-dia"]').click();
  await c.locator('[data-teste="editor-hora"]').waitFor();
  assert.match(await c.locator('[data-teste="editor-hora"]').textContent(), /Levar pro meu dia — hoje.*sem horário fica no dia, fora da linha do tempo/);
  assert.match(await c.locator('[data-teste="confirmar-pro-dia"]').textContent(), /Entrar no dia sem horário/);
  await c.locator('[data-teste="hora-inicio"]').fill('18:00');
  // 18:00 bate com o "Fechamento do dia" (18:00–19:00): avisa e oferece a saída
  await c.locator('[data-teste="aviso-conflito"]').waitFor();
  assert.match(await c.locator('[data-teste="aviso-conflito"]').textContent(), /bate com “Fechamento do dia”/);
  await c.locator('[data-teste="hora-inicio"]').fill('19:30');
  assert.match(await c.locator('[data-teste="confirmar-pro-dia"]').textContent(), /Entrar no dia às 19:30/);
  await c.locator('[data-teste="confirmar-pro-dia"]').click();
  await pagina.getByText(/entrou na sua Master Task de hoje/).waitFor();
  const esc = await escritas(pagina);
  const t = esc.filter((e) => e.tabela === 'metodo_tarefas' && e.tipo === 'insert').at(-1).linhas[0];
  assert.deepEqual([t.user_id, t.data, t.hora, t.titulo], ['emanuel', '2026-09-07', '19:30', 'Quinta — Empurrar B']);
  const u = esc.filter((e) => e.tabela === 'metodo_quadro' && e.tipo === 'update').at(-1).patch;
  assert.equal(u.virou_tarefa_id, t.id, 'o card aponta pra tarefa');
  await pagina.waitForFunction(() => /na Jornada às 19:30/.test(document.body.textContent));
  assert.deepEqual((await pilulas(pagina, 'Quinta — Empurrar B')).map((p) => p[2]), ['no quadro · Academia', 'no seu dia', 'na Jornada às 19:30']);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('ENTRADA NOVA: a frase diz pra onde vai enquanto escreve; "também no meu dia às 07:30" cria card + tarefa ligados de uma vez', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  const coluna = pagina.locator('[data-teste="entrada-quadro"]').first(); // a Academia
  await coluna.locator('[data-teste="campo-novo-card"]').fill('Terça — Puxar A');
  await coluna.locator('[data-teste="destinos"]').waitFor();
  assert.match(await coluna.locator('[data-teste="frase-destinos"]').textContent(), /Vai entrar: no quadro \(Academia\).*fica só no quadro, fora do seu dia/);
  await coluna.locator('[data-teste="destino-dia"]').check();
  assert.match(await coluna.locator('[data-teste="frase-destinos"]').textContent(), /no quadro \(Academia\) · no seu dia, sem horário.*sem horário fica fora da Jornada/);
  await coluna.locator('[data-teste="destino-hora"]').fill('07:30');
  assert.match(await coluna.locator('[data-teste="frase-destinos"]').textContent(), /Vai entrar: no quadro \(Academia\) · no seu dia, na Jornada às 07:30$/);
  await coluna.locator('[data-teste="campo-novo-card-criar"]').click();
  // 🔮 DIR-91 — tem hora: mostra a prévia da Jornada ANTES de criar
  await pagina.locator('[data-teste="previa-jornada"]').waitFor();
  await pagina.locator('[data-teste="previa-livre"]').waitFor();
  await pagina.locator('[data-teste="previa-confirmar"]').click();
  await pagina.getByText(/Entrou no quadro \(Academia\) e no seu dia, na Jornada às 07:30\./).waitFor();
  const esc = await escritas(pagina);
  const t = esc.filter((e) => e.tabela === 'metodo_tarefas' && e.tipo === 'insert').at(-1).linhas[0];
  const q = esc.filter((e) => e.tabela === 'metodo_quadro' && e.tipo === 'insert').at(-1).linhas[0];
  assert.deepEqual([t.data, t.hora, t.titulo], ['2026-09-07', '07:30', 'Terça — Puxar A']);
  assert.deepEqual([q.lista_id, q.titulo, q.hora, q.coluna, q.virou_tarefa_id], ['l1', 'Terça — Puxar A', '07:30', 'aberto', t.id]);
  // o card novo já nasce dizendo onde está
  await pagina.waitForFunction(() => document.body.textContent.includes('Terça — Puxar A'));
  assert.deepEqual((await pilulas(pagina, 'Terça — Puxar A')).map((p) => p[2]), ['no quadro · Academia', 'no seu dia', 'na Jornada às 07:30']);
  // o campo limpou e a escolha "também no meu dia" ficou pra próxima
  assert.equal(await coluna.locator('[data-teste="campo-novo-card"]').inputValue(), '');
  // a tela de fora foi avisada da tarefa criada
  assert.equal(await pagina.evaluate(() => (window.__tarefasCriadas || []).length), 1);
  await pagina.screenshot({ path: path.join(FOTOS, 'quadro-entrada-destinos.png'), fullPage: true });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('PRÉVIA DA JORNADA: hora que bate avisa e oferece o horário livre; usar o livre limpa o aviso (DIR-91)', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  const coluna = pagina.locator('[data-teste="entrada-quadro"]').first(); // a Academia
  await coluna.locator('[data-teste="campo-novo-card"]').fill('Puxada extra');
  await coluna.locator('[data-teste="destinos"]').waitFor();
  await coluna.locator('[data-teste="destino-dia"]').check();
  // 18:30 cai dentro do "Fechamento do dia" (18:00–19:00, banco de mentira)
  await coluna.locator('[data-teste="destino-hora"]').fill('18:30');
  await coluna.locator('[data-teste="campo-novo-card-criar"]').click();
  await pagina.locator('[data-teste="previa-jornada"]').waitFor();
  assert.match(await pagina.locator('[data-teste="previa-aviso"]').textContent(), /bate com "Fechamento do dia"/);
  assert.match(await pagina.locator('[data-teste="previa-confirmar"]').textContent(), /confirmar mesmo assim/);
  // a peça nova aparece na linha do tempo, marcada como conflito
  await pagina.locator('[data-teste="previa-item-novo"]').filter({ hasText: 'Puxada extra' }).waitFor();
  await pagina.screenshot({ path: path.join(FOTOS, 'quadro-previa-conflito.png') });
  // usar o horário livre sugerido tira o choque, sem fechar o popup
  await pagina.locator('[data-teste="previa-usar-livre"]').click();
  await pagina.locator('[data-teste="previa-livre"]').waitFor();
  assert.equal(await pagina.locator('[data-teste="previa-aviso"]').count(), 0);
  await pagina.locator('[data-teste="previa-confirmar"]').click();
  await pagina.getByText(/Entrou no quadro \(Academia\) e no seu dia, na Jornada às/).waitFor();
  const esc = await escritas(pagina);
  const t = esc.filter((e) => e.tabela === 'metodo_tarefas' && e.tipo === 'insert').at(-1).linhas[0];
  // o horário final não é mais 18:30 (o choque original) — o livre venceu
  assert.notEqual(t.hora, '18:30');
  assert.deepEqual(erros, []);
  await ctx.close();
});

/**
 * 📷 A FOTO NO CARD (22/09/2026).
 *
 * Ávilla, depois de eu perguntar qual era o pedido: "rotina de treino no card
 * do quadro. lá deve ter opção de tirar/anexar foto do treino tbm."
 *
 * A foto de COMPROVAÇÃO já existia em outra tela. Aqui, no card, não havia nem
 * botão nem coluna onde guardar (foto_url entrou na migração 20260922211851).
 */
test('📷 card SEM foto oferece os DOIS caminhos: tirar na hora e anexar', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  try {
    const semFoto = card(pagina, 'Corrida leve');
    await semFoto.locator('[data-teste="tirar-foto-do-cartao"]').waitFor();
    await semFoto.locator('[data-teste="anexar-foto-do-cartao"]').waitFor();

    // um input só não dá os dois: com `capture` o Android não oferece a galeria,
    // sem ele o iPhone não abre a câmera direto
    const entradas = await semFoto.locator('input[type="file"]').evaluateAll(
      (els) => els.map((e) => e.getAttribute('capture')),
    );
    assert.equal(entradas.length, 2, 'esperava os dois inputs — câmera e galeria');
    assert.ok(entradas.includes('environment'), 'nenhum input abre a câmera');
    assert.ok(entradas.includes(null), 'nenhum input pega da galeria');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('📷 card COM foto mostra a imagem, e não os botões', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  try {
    const comFoto = card(pagina, 'Treino de ontem');
    const src = await comFoto.locator('img[alt*="Treino de ontem"]').getAttribute('src');
    assert.equal(src, 'https://exemplo/treino-de-ontem.jpg');
    assert.equal(await comFoto.locator('[data-teste="tirar-foto-do-cartao"]').count(), 0,
      'com foto na tela, oferecer "tirar foto" de novo confunde — o caminho é remover e refazer');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('🔴 📷 remover a foto GRAVA no banco — não some só da tela', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  try {
    const comFoto = card(pagina, 'Treino de ontem');
    await comFoto.locator('[data-teste="remover-foto-do-cartao"]').click();
    await pagina.waitForTimeout(400);

    assert.equal(await comFoto.locator('img[alt*="Treino de ontem"]').count(), 0, 'a imagem continuou na tela');
    await comFoto.locator('[data-teste="tirar-foto-do-cartao"]').waitFor();

    const gravou = (await escritas(pagina)).some(
      (e) => e.tipo === 'update' && e.tabela === 'metodo_quadro' && e.patch?.foto_url === null,
    );
    assert.ok(gravou, 'sumiu da tela e não gravou: ao recarregar a foto voltaria');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

/**
 * 🪞 CONCLUIR NO QUADRO CONCLUI NO DIA (22/09/2026).
 *
 * Ávilla: "todas tarefas concluídas no quadro tbm é concluída nas demais
 * (jornada e lista)".
 *
 * O caminho DIA → QUADRO já existia (DIR-76). Esta é a VOLTA, que não existia:
 * a pessoa fechava o card e a jornada continuava cobrando a mesma coisa.
 *
 * Jornada e Lista são duas VISTAS da mesma linha de metodo_tarefas — então
 * gravar nela é o que sincroniza as duas de uma vez. É isso que se mede aqui:
 * a ESCRITA na tabela certa, não o desenho.
 */
const gravacoesEmTarefas = (pagina) => pagina.evaluate(
  () => (window.__bancoFalso.escritas || []).filter((e) => e.tabela === 'metodo_tarefas'),
);

test('🔴 🪞 concluir um card LIGADO ao dia marca a tarefa — com o carimbo do pronto', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  try {
    // 'Segunda — Empurrar A' é o card já ligado à tarefa t2 (virou_tarefa_id)
    const ligado = card(pagina, 'Segunda — Empurrar A');
    await ligado.locator('[data-teste="concluir-cartao"]').click();
    await pagina.waitForTimeout(500);

    const gravou = await gravacoesEmTarefas(pagina);
    assert.equal(gravou.length, 1, 'o card fechou e a tarefa do dia não foi marcada — é o buraco do pedido');
    assert.equal(gravou[0].patch.feito, true);
    assert.ok(gravou[0].patch.pronto_em,
      'sem pronto_em a tarefa aparece como "pronto" sem hora na Fila do Pronto');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('🪞 reabrir o card desmarca a tarefa de volta', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  try {
    const ligado = card(pagina, 'Segunda — Empurrar A');
    await ligado.locator('[data-teste="concluir-cartao"]').click();
    await pagina.waitForTimeout(400);
    await ligado.locator('[data-teste="concluir-cartao"]').click();
    await pagina.waitForTimeout(500);

    const gravou = await gravacoesEmTarefas(pagina);
    assert.equal(gravou.length, 2, 'a reabertura não voltou pro dia');
    assert.equal(gravou[1].patch.feito, false);
    assert.equal(gravou[1].patch.pronto_em, null, 'hora de pronto em tarefa não feita é mentira guardada');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('🪞 card SOLTO (que nunca foi pro dia) não escreve em metodo_tarefas', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  try {
    // 'Quinta — Empurrar B' não tem virou_tarefa_id
    await card(pagina, 'Quinta — Empurrar B').locator('[data-teste="concluir-cartao"]').click();
    await pagina.waitForTimeout(500);
    assert.deepEqual(await gravacoesEmTarefas(pagina), [],
      'escreveu numa tarefa que não existe — card solto não tem par no dia');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('🔴 🪞 mexer no card SEM concluir não escreve no dia — é o que corta o laço', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  try {
    // adicionar um item de checklist salva o card inteiro, sem mudar o feito
    const ligado = card(pagina, 'Segunda — Empurrar A');
    await ligado.locator('input[placeholder="lista de tarefas"]').fill('comprar caderno');
    await ligado.locator('input[placeholder="lista de tarefas"]').press('Enter');
    await pagina.waitForTimeout(500);

    assert.deepEqual(await gravacoesEmTarefas(pagina), [],
      'qualquer salvamento do card escreve no dia — é assim que as duas telas entram em laço');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});
