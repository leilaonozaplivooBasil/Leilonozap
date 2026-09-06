/**
 * A GESTÃO DENTRO DO X-PERFORMANCE: distribuir tarefa com o dinheiro na mão.
 *
 * 🔴 Dono (06/09/2026): "junta o admin do X-Game com o X-Performance. Ali eu
 * boto a tarefa, seleciono o responsável, isso já entra na tarefa do dia
 * dele com quanto equivale em dinheiro dentro do fixo mensal. O sistema tem
 * que me avisar: essa tarefa tem peso x, vale x, e automaticamente vai ser
 * tirado das outras."
 *
 * O que só o navegador mede (banco de mentira, Emanuel a R$ 7.000):
 *   • a prévia diz quanto a tarefa vale E quanto cada outra do dia perde,
 *     ANTES de gravar;
 *   • distribuir grava na tabela do Compromisso da pessoa (origem xperf) e a
 *     lista do dia recalcula na hora; desfazer só o que nasceu aqui;
 *   • mudar o fixo muda o valor do dia em todo lugar;
 *   • dia abaixo do mínimo avisa o que fica em aberto;
 *   • o admin de sempre abre embutido;
 *   • cabe no celular (foto).
 *
 * COMO RODAR
 *   npm i -D playwright        (uma vez; o Chromium já está na máquina)
 *   npm run test:navegador
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA
  || path.join(tmpdir(), `banca-${path.basename(new URL(import.meta.url).pathname, '.spec.mjs')}`);
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch { /* dependência opcional: os casos se marcam como PULADOS */ }

const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'performance.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/performance.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir({ celular = false } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext(celular
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1280, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="gestao"]').waitFor();
  await pagina.locator('[data-teste="pessoa"]').selectOption('emanuel');
  await pagina.locator('[data-teste="tarefas-dia"] li').first().waitFor(); // as tarefas do 08/09 do Emanuel
  return { pagina, ctx, erros };
}

const escritas = (pagina) => pagina.evaluate(() => window.__bancoFalso.escritas);
const texto = async (pagina, sel) => (await pagina.locator(sel).textContent()).replace(/\s+/g, ' ').trim();
const ATE = (n) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

test('PRÉVIA: antes de gravar, diz quanto a tarefa vale e o que cada outra do dia perde', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  assert.equal(await pagina.locator('[data-teste="dia"]').inputValue(), '2026-09-08', 'o dia nasce em "amanhã" (dia útil)');
  assert.equal(await texto(pagina, '[data-teste="valor-dia"]'), ATE(318.18), 'R$ 7.000 ÷ 22 dias úteis');
  assert.equal(await pagina.locator('[data-teste="tarefas-dia"] li').count(), 3);

  await pagina.locator('[data-teste="titulo"]').fill('Pegar as pautas da reunião de amanhã');
  // 🪄 o peso nasce sozinho pelo título ("reunião" = ação de negócio, peso 6), com o motivo ao lado
  assert.equal(await pagina.locator('[data-teste="peso"]').inputValue(), '6');
  assert.match(await texto(pagina, '[data-teste="peso-motivo"]'), /peso 6 — ação de negócio/);
  await pagina.locator('[data-teste="peso"]').selectOption('4');
  await pagina.locator('[data-teste="peso-auto"]').waitFor(); // mexeu: agora é o seu, com o caminho de volta
  assert.equal(await texto(pagina, '[data-teste="valor-nova"]'), ATE(159.10));
  const quedas = await pagina.locator('[data-teste="quedas"] li').allTextContents();
  assert.equal(quedas.length, 3, 'as três do dia perdem');
  assert.match(quedas[0].replace(/\s+/g, ' '), /Gratidão.*R\$ 79,54.*R\$ 39,77/);
  assert.match(quedas[2].replace(/\s+/g, ' '), /Reunião com cliente.*R\$ 159,10.*R\$ 79,54/);
  assert.deepEqual(await escritas(pagina), [], 'prévia não grava NADA');
  await pagina.screenshot({ path: path.join(FOTOS, 'performance-previa.png'), fullPage: false });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('DISTRIBUIR: grava na tabela do Compromisso da pessoa (origem xperf) e a lista do dia recalcula na hora; desfazer só o que nasceu aqui', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="titulo"]').fill('Pegar as pautas da reunião de amanhã');
  await pagina.locator('[data-teste="peso"]').selectOption('4');
  await pagina.locator('[data-teste="distribuir"]').click();
  await pagina.getByText(/vale R\$ 159,10 — as outras do dia foram recalculadas/).waitFor();

  const e = await escritas(pagina);
  assert.equal(e.length, 1);
  assert.equal(e[0].tipo, 'insert');
  assert.equal(e[0].tabela, 'metodo_tarefas');
  const l = e[0].linhas[0];
  assert.equal(l.user_id, 'emanuel');
  assert.equal(l.data, '2026-09-08');
  assert.equal(l.titulo, 'Pegar as pautas da reunião de amanhã');
  assert.equal(l.peso, 4);
  assert.equal(l.categoria, 'mentoria');
  assert.equal(l.origem, 'xperf');
  assert.equal(l.criado_por_id, 'dono');
  assert.equal(l.feito, false);

  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="tarefas-dia"] li').length === 4);
  const linhas = (await pagina.locator('[data-teste="tarefas-dia"] li').allTextContents()).map((s) => s.replace(/\s+/g, ' '));
  assert.match(linhas.find((s) => s.includes('Gratidão')), /R\$ 39,77/, 'a Gratidão caiu de 79,54 pra 39,77');
  assert.match(linhas.find((s) => s.includes('pautas')), /peso 4.*R\$ 159,10/);
  assert.equal(await pagina.locator('[data-teste="titulo"]').inputValue(), '', 'o campo limpa pra próxima');

  // só a tarefa distribuída aqui tem o "desfazer"
  assert.equal(await pagina.locator('[data-teste="tarefas-dia"] li[data-origem="xperf"] button').count(), 1);
  assert.equal(await pagina.locator('[data-teste="tarefas-dia"] li[data-origem=""] button').count(), 0);
  await pagina.getByRole('button', { name: /desfazer Pegar as pautas/ }).click();
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="tarefas-dia"] li').length === 3);
  assert.equal((await escritas(pagina)).at(-1).tipo, 'delete');
  await ctx.close();
});

test('FIXO: o menu suspenso abre o modal da pessoa, e mudar o fixo muda o valor do dia em todo lugar', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  // quem aparece vem do painel de controle: do executivo ao embaixador — o trainee não entra
  const nomes = await pagina.locator('[data-teste="pessoa-fixo"] option').allTextContents();
  assert.ok(nomes.some((n) => /Carla Souza · Embaixador/.test(n)), nomes.join(' | '));
  assert.ok(nomes.some((n) => /Emanuel Silva · Sócio Executivo/.test(n)), 'a função vem do painel, não do jogo');
  assert.ok(nomes.some((n) => /Luiz Santanna · CEO · sem fixo/.test(n)), 'o CEO sem cadastro no jogo aparece, marcado');
  assert.ok(!nomes.some((n) => /Tiago/.test(n)), 'trainee fica de fora');
  assert.equal(await pagina.locator('[data-teste="fixo-pessoa"]').count(), 0, 'sem a parede de cartões');

  await pagina.locator('[data-teste="pessoa-fixo"]').selectOption('emanuel');
  const modal = pagina.locator('[data-teste="modal-pessoa"][data-pessoa="emanuel"]');
  await modal.waitFor();
  assert.equal((await modal.locator('[data-teste="valor-dia-pessoa"]').textContent()).trim(), ATE(318.18));
  // o ciclo do Emanuel: 04/09 teve Gratidão feita e conferida (1 de 3 tarefas → 1/3 do dia)
  assert.match((await modal.textContent()).replace(/\s+/g, ' '), /R\$ 106,06\s*ganho/);
  assert.match((await modal.textContent()).replace(/\s+/g, ' '), /ter\., 08\/09.*3 tarefas.*R\$ 318,18/, 'o que está distribuído de hoje em diante');

  await pagina.screenshot({ path: path.join(FOTOS, 'performance-modal.png') });
  await modal.locator('[data-teste="fixo-mes"]').fill('4400');
  await modal.locator('[data-teste="fixo-mes"]').blur();
  await pagina.getByText(/fixo atualizado/).waitFor();
  const e = (await escritas(pagina)).at(-1);
  assert.equal(e.tipo, 'upsert');
  assert.equal(e.tabela, 'xgame_participantes');
  assert.equal(e.linhas[0].fixo_mes, 4400);
  await pagina.waitForFunction(() => document.querySelector('[data-teste="modal-pessoa"] [data-teste="valor-dia-pessoa"]').textContent.includes('200,00'));
  await pagina.getByRole('button', { name: 'Fechar' }).click();
  assert.equal(await texto(pagina, '[data-teste="valor-dia"]'), ATE(200), 'a prévia lê o mesmo fixo');
  await ctx.close();
});

test('FIXO: quem não tem cadastro no jogo ganha um ao definir o fixo pela primeira vez', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="pessoa-fixo"]').selectOption('dono');
  const modal = pagina.locator('[data-teste="modal-pessoa"][data-pessoa="dono"]');
  await modal.locator('[data-teste="sem-fixo-modal"]').waitFor();
  assert.equal((await modal.locator('[data-teste="valor-dia-pessoa"]').textContent()).trim(), ATE(59.09), 'até definir, a verba padrão');
  await modal.locator('[data-teste="fixo-mes"]').fill('11000');
  await modal.locator('[data-teste="fixo-mes"]').blur();
  await pagina.getByText(/fixo atualizado/).waitFor();
  const e = (await escritas(pagina)).at(-1);
  assert.equal(e.tipo, 'upsert');
  assert.equal(e.linhas[0].user_id, 'dono');
  assert.equal(e.linhas[0].cargo, 'ceo', 'o cargo do jogo vem do nível do painel');
  assert.equal(e.linhas[0].ativo, true);
  await pagina.waitForFunction(() => document.querySelector('[data-teste="modal-pessoa"] [data-teste="valor-dia-pessoa"]').textContent.includes('500,00'));
  assert.equal(await modal.locator('[data-teste="sem-fixo-modal"]').count(), 0);
  await ctx.close();
});

test('MÍNIMO: quem não tem fixo usa a verba de produção; dia abaixo do mínimo avisa o que fica em aberto', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="pessoa"]').selectOption('carla');
  await pagina.locator('[data-teste="sem-fixo"]').waitFor();
  assert.equal(await texto(pagina, '[data-teste="valor-dia"]'), ATE(59.09), 'R$ 1.300 ÷ 22');
  await pagina.locator('[data-teste="titulo"]').fill('Separar os documentos da reunião');
  await pagina.locator('[data-teste="faltam"]').waitFor();
  const aviso = await texto(pagina, '[data-teste="faltam"]');
  assert.match(aviso, /ainda faltam 2 tarefas pro mínimo de 3/);
  assert.match(aviso, /o dia paga R\$ 19,70/, '1 de 3 tarefas = 1/3 de 59,09');
  await ctx.close();
});

test('ADMIN EMBUTIDO: a gestão do X-GAME de sempre abre dentro do X-Performance', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  await pagina.locator('[data-teste="abrir-admin"]').click();
  await pagina.getByRole('button', { name: /Participantes/ }).first().waitFor();
  await pagina.getByText('Início oficial do ciclo').waitFor();
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('CELULAR: a gestão cabe na tela — foto pra julgar', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ celular: true });
  await pagina.locator('[data-teste="titulo"]').fill('Pegar as pautas da reunião de amanhã');
  await pagina.locator('[data-teste="peso"]').selectOption('4');
  assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'a tela rolou pro lado');
  await pagina.locator('[data-teste="gestao"]').scrollIntoViewIfNeeded();
  await pagina.screenshot({ path: path.join(FOTOS, 'performance-celular.png') });
  await ctx.close();
});
