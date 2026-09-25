/** 📝 O botão D: anotar cria demanda + tarefa de hoje + card ligado, fecha a demanda e avisa as telas — num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-bloco-de-demandas');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));
let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';
let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'bloco-de-demandas.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/bloco-de-demandas.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

test('📝 anotar no "D": demanda + tarefa de hoje (sem horário) + card ligado + fechamento + evento', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 900, height: 800 } });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  try {
    await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('[data-teste="botao-d-demandas"]', { timeout: 20000 });
    // só logado: o segundo (deslogado) não desenha nada
    assert.equal(await pagina.locator('[data-teste="botao-d-demandas"]').count(), 1);
    assert.equal(await pagina.locator('[data-teste="deslogado"]').evaluate((n) => n.children.length), 0);
    // 🎓 24/09 — fora da Top College o "D" some na hora; ao voltar, reaparece
    await pagina.evaluate(() => window.__sairDaTopCollege());
    await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="botao-d-demandas"]').length === 0, null, { timeout: 5000 });
    await pagina.evaluate(() => window.__voltarParaTopCollege());
    await pagina.waitForSelector('[data-teste="botao-d-demandas"]', { timeout: 5000 });
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-cabecalho.png') });

    await pagina.click('[data-teste="botao-d-demandas"]');
    await pagina.waitForSelector('[data-teste="modal-bloco-demandas"]');
    // a lista mostra só as do bloco (a do mapa fica de fora)
    await pagina.waitForSelector('[data-teste="anotacao"]');
    assert.equal(await pagina.locator('[data-teste="anotacao"]').count(), 1);
    assert.match(await pagina.locator('[data-teste="anotacao"]').first().innerText(), /Anotação antiga[\s\S]*na jornada e no quadro/);

    await pagina.fill('[data-teste="texto-anotacao"]', 'Ligar pro fornecedor de caixas');
    await pagina.waitForTimeout(300);
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA });
    await pagina.press('[data-teste="texto-anotacao"]', 'Enter');
    await pagina.waitForFunction(() => window.__eventos.length > 0, null, { timeout: 10000 });

    const r = await pagina.evaluate(() => {
      const b = window.__bancoFalso;
      const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
      const dem = b.tabelas.xperf_demandas.find((d) => d.titulo === 'Ligar pro fornecedor de caixas');
      const tar = b.tabelas.metodo_tarefas.find((t) => t.titulo === 'Ligar pro fornecedor de caixas');
      const card = b.tabelas.metodo_quadro.find((c) => c.titulo === 'Ligar pro fornecedor de caixas');
      return {
        hoje, eventos: window.__eventos,
        demanda: dem && { origem: dem.origem, status: dem.status, agendada_para: dem.agendada_para, tarefa_id: dem.tarefa_id, card_id: dem.card_id, pessoa_id: dem.pessoa_id },
        tarefa: tar && { user_id: tar.user_id, data: tar.data, hora: tar.hora, ordem: tar.ordem, feito: tar.feito, demanda_id: tar.demanda_id, id: tar.id },
        card: card && { user_id: card.user_id, virou_tarefa_id: card.virou_tarefa_id, coluna: card.coluna, demanda_id: card.demanda_id, id: card.id },
        ordemEscritas: b.escritas.map((e) => `${e.tipo}:${e.tabela}`),
      };
    });
    assert.deepEqual(r.eventos, ['demandaAnotada']);
    assert.equal(r.demanda.origem, 'bloco'); assert.equal(r.demanda.pessoa_id, 'u1');
    assert.equal(r.tarefa.data, r.hoje, 'a tarefa é de HOJE');
    assert.equal(r.tarefa.hora, null, 'sem horário');
    assert.equal(r.tarefa.ordem, 1, 'entra depois da que já existia no dia');
    assert.equal(r.tarefa.feito, false);
    assert.equal(r.card.virou_tarefa_id, r.tarefa.id, 'o card não ficou ligado à tarefa');
    assert.equal(r.card.coluna, 'aberto');
    assert.equal(r.demanda.status, 'agendada'); assert.equal(r.demanda.agendada_para, r.hoje);
    assert.equal(r.demanda.tarefa_id, r.tarefa.id); assert.equal(r.demanda.card_id, r.card.id);
    assert.ok(r.tarefa.demanda_id && r.tarefa.demanda_id === r.card.demanda_id, 'tarefa e card apontam pra mesma demanda');
    assert.deepEqual(r.ordemEscritas, ['insert:xperf_demandas', 'insert:metodo_tarefas', 'insert:metodo_quadro', 'update:xperf_demandas']);

    // a lista do modal já mostra a nova em primeiro, e o campo limpou
    await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="anotacao"]').length === 2);
    assert.match(await pagina.locator('[data-teste="anotacao"]').first().innerText(), /Ligar pro fornecedor de caixas[\s\S]*na jornada e no quadro/);
    assert.equal(await pagina.inputValue('[data-teste="texto-anotacao"]'), '');
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-depois.png') });
  } finally { await ctx.close(); }
  assert.deepEqual(erros, []);
});

test('texto vazio não grava nada', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 900, height: 800 } });
  const pagina = await ctx.newPage();
  try {
    await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pagina.click('[data-teste="botao-d-demandas"]');
    await pagina.waitForSelector('[data-teste="modal-bloco-demandas"]');
    assert.equal(await pagina.locator('[data-teste="anotar"]').isDisabled(), true);
    await pagina.fill('[data-teste="texto-anotacao"]', '   ');
    await pagina.press('[data-teste="texto-anotacao"]', 'Enter');
    await pagina.waitForTimeout(500);
    assert.equal(await pagina.evaluate(() => window.__bancoFalso.escritas.length), 0);
  } finally { await ctx.close(); }
});

// ═══════════════════════════════════════════════════════════════════════════
// 25/09 — destino escolhido, edição, ordem e a janela solta
// ═══════════════════════════════════════════════════════════════════════════
async function abrirBloco(nav, largura = 1100) {
  const ctx = await nav.newContext({ viewport: { width: largura, height: 800 } });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="botao-d-demandas"]', { timeout: 20000 });
  await pagina.click('[data-teste="botao-d-demandas"]');
  await pagina.waitForSelector('[data-teste="modal-bloco-demandas"]');
  return { ctx, pagina, erros };
}

test('🎯 "Só Quadro": nasce demanda + card, sem tarefa; "Só anotar": só a demanda, sem fechar', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const { ctx, pagina, erros } = await abrirBloco(nav);
  try {
    await pagina.click('[data-teste="destino-quadro"]');
    assert.match(await pagina.$eval('[data-teste="resumo-destino"]', (n) => n.innerText), /quadro/);
    assert.doesNotMatch(await pagina.$eval('[data-teste="resumo-destino"]', (n) => n.innerText), /jornada/);
    await pagina.fill('[data-teste="texto-anotacao"]', 'Só no quadro');
    await pagina.press('[data-teste="texto-anotacao"]', 'Enter');
    await pagina.waitForFunction(() => window.__bancoFalso.tabelas.metodo_quadro.some((c) => c.titulo === 'Só no quadro'), null, { timeout: 10000 });
    let r = await pagina.evaluate(() => {
      const b = window.__bancoFalso;
      const dem = b.tabelas.xperf_demandas.find((d) => d.titulo === 'Só no quadro');
      return { escritas: b.escritas.map((e) => `${e.tipo}:${e.tabela}`), tarefa: b.tabelas.metodo_tarefas.some((t) => t.titulo === 'Só no quadro'), dem: { status: dem.status, tarefa_id: dem.tarefa_id, card_id: dem.card_id } };
    });
    assert.deepEqual(r.escritas, ['insert:xperf_demandas', 'insert:metodo_quadro', 'update:xperf_demandas']);
    assert.equal(r.tarefa, false, 'só quadro não cria tarefa');
    assert.equal(r.dem.status, 'agendada'); assert.equal(r.dem.tarefa_id, null); assert.ok(r.dem.card_id);
    // a escolha fica lembrada no aparelho
    assert.equal(await pagina.evaluate(() => localStorage.getItem('nz_bloco_destino')), 'quadro');

    await pagina.evaluate(() => { window.__bancoFalso.escritas = []; });
    await pagina.click('[data-teste="destino-anotar"]');
    await pagina.fill('[data-teste="texto-anotacao"]', 'Pensar depois');
    await pagina.press('[data-teste="texto-anotacao"]', 'Enter');
    await pagina.waitForFunction(() => window.__bancoFalso.tabelas.xperf_demandas.some((d) => d.titulo === 'Pensar depois'), null, { timeout: 10000 });
    await pagina.waitForTimeout(300);
    r = await pagina.evaluate(() => {
      const b = window.__bancoFalso; const dem = b.tabelas.xperf_demandas.find((d) => d.titulo === 'Pensar depois');
      return { escritas: b.escritas.map((e) => `${e.tipo}:${e.tabela}`), status: dem.status };
    });
    assert.deepEqual(r.escritas, ['insert:xperf_demandas'], 'só anotar não cria nem fecha nada');
    assert.equal(r.status, 'recebida');
    await pagina.waitForFunction(() => [...document.querySelectorAll('[data-teste="anotacao"]')].some((n) => n.innerText.includes('Pensar depois') && n.innerText.includes('só anotada')));
    // volta o padrão pros próximos casos
    await pagina.click('[data-teste="destino-tudo"]');
  } finally { await ctx.close(); }
  assert.deepEqual(erros, []);
});

test('✏️ editar a nota muda a demanda E a tarefa/card que ela virou; ↕️ subir reordena e grava ordem_bloco', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const { ctx, pagina, erros } = await abrirBloco(nav);
  try {
    await pagina.evaluate(() => {
      const b = window.__bancoFalso;
      b.tabelas.metodo_tarefas.push({ id: 'tx', user_id: 'u1', titulo: 'Anotação antiga', feito: false });
      b.tabelas.metodo_quadro.push({ id: 'cx', user_id: 'u1', titulo: 'Anotação antiga', coluna: 'aberto' });
      b.tabelas.xperf_demandas.push({ id: 'd1', pessoa_id: 'u1', origem: 'bloco', titulo: 'Segunda nota', status: 'recebida', created_at: '2026-09-21T10:00:00Z' });
      b.escritas = [];
    });
    // recarrega a lista (fecha e abre)
    await pagina.click('[data-teste="fechar-bloco"]');
    await pagina.click('[data-teste="botao-d-demandas"]');
    await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="anotacao"]').length === 2);
    let nomes = await pagina.$$eval('[data-teste="anotacao"]', (ns) => ns.map((n) => n.getAttribute('data-id')));
    assert.deepEqual(nomes, ['d1', 'd0'], 'sem ordem escolhida: mais nova primeiro');

    // editar a antiga (d0, que virou tarefa tx e card cx)
    await pagina.locator('[data-teste="anotacao"][data-id="d0"] [data-teste="nota-editar"]').click();
    await pagina.fill('[data-teste="nota-editando"]', 'Anotação antiga, revisada');
    await pagina.press('[data-teste="nota-editando"]', 'Enter');
    await pagina.waitForFunction(() => window.__bancoFalso.tabelas.metodo_quadro.find((c) => c.id === 'cx')?.titulo === 'Anotação antiga, revisada', null, { timeout: 10000 });
    const ed = await pagina.evaluate(() => {
      const b = window.__bancoFalso;
      return { dem: b.tabelas.xperf_demandas.find((d) => d.id === 'd0').titulo, tar: b.tabelas.metodo_tarefas.find((t) => t.id === 'tx').titulo, card: b.tabelas.metodo_quadro.find((c) => c.id === 'cx').titulo, escritas: b.escritas.map((e) => `${e.tipo}:${e.tabela}`) };
    });
    assert.equal(ed.dem, 'Anotação antiga, revisada'); assert.equal(ed.tar, 'Anotação antiga, revisada'); assert.equal(ed.card, 'Anotação antiga, revisada');
    assert.deepEqual(ed.escritas, ['update:xperf_demandas', 'update:metodo_tarefas', 'update:metodo_quadro']);

    // subir a antiga pra primeira: grava ordem_bloco nas duas
    await pagina.evaluate(() => { window.__bancoFalso.escritas = []; });
    await pagina.locator('[data-teste="anotacao"][data-id="d0"] [data-teste="nota-subir"]').click();
    await pagina.waitForFunction(() => document.querySelector('[data-teste="anotacao"]')?.getAttribute('data-id') === 'd0');
    await pagina.waitForFunction(() => window.__bancoFalso.escritas.length >= 2, null, { timeout: 5000 });
    const ord = await pagina.evaluate(() => { const b = window.__bancoFalso; return { d0: b.tabelas.xperf_demandas.find((d) => d.id === 'd0').ordem_bloco, d1: b.tabelas.xperf_demandas.find((d) => d.id === 'd1').ordem_bloco }; });
    assert.deepEqual(ord, { d0: 0, d1: 1 });
    // e a ordem sobrevive ao fechar/abrir (o banco falso guarda)
    await pagina.click('[data-teste="fechar-bloco"]');
    await pagina.click('[data-teste="botao-d-demandas"]');
    await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="anotacao"]').length === 2);
    nomes = await pagina.$$eval('[data-teste="anotacao"]', (ns) => ns.map((n) => n.getAttribute('data-id')));
    assert.deepEqual(nomes, ['d0', 'd1']);
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-notas.png') });
  } finally { await ctx.close(); }
  assert.deepEqual(erros, []);
});

test('🪟 a janela solta: sem fundo escuro, a página atrás continua clicável, arrasta pela alça e lembra a posição', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const { ctx, pagina, erros } = await abrirBloco(nav);
  try {
    const antes = await pagina.$eval('[data-teste="modal-bloco-demandas"]', (n) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, flutua: n.getAttribute('data-flutua'), modal: n.getAttribute('aria-modal') }; });
    assert.equal(antes.flutua, '1'); assert.equal(antes.modal, 'false');
    assert.ok(antes.x > 1100 - antes.w - 40, 'nasce no canto direito');
    // nada de backdrop: o cabeçalho falso atrás recebe clique
    const clicavel = await pagina.evaluate(() => { const el = document.elementFromPoint(20, 20); return !!el && !document.querySelector('[data-teste="modal-bloco-demandas"]').contains(el); });
    assert.equal(clicavel, true, 'a página atrás tem que continuar viva');
    // arrasta pela alça: 300px pra esquerda, 120px pra baixo
    const alca = await pagina.$('[data-teste="arrastar-bloco"]'); const r = await alca.boundingBox();
    await pagina.mouse.move(r.x + 60, r.y + r.height / 2); await pagina.mouse.down();
    await pagina.mouse.move(r.x + 60 - 150, r.y + r.height / 2 + 60, { steps: 5 });
    await pagina.mouse.move(r.x + 60 - 300, r.y + r.height / 2 + 120, { steps: 5 });
    await pagina.mouse.up();
    const depois = await pagina.$eval('[data-teste="modal-bloco-demandas"]', (n) => { const r2 = n.getBoundingClientRect(); return { x: r2.x, y: r2.y }; });
    assert.ok(Math.abs((antes.x - depois.x) - 300) <= 3, `andou ${antes.x - depois.x}px em X, esperava 300`);
    assert.ok(Math.abs((depois.y - antes.y) - 120) <= 3, `andou ${depois.y - antes.y}px em Y, esperava 120`);
    const lembrada = JSON.parse(await pagina.evaluate(() => localStorage.getItem('nz_bloco_posicao')));
    assert.deepEqual(lembrada, { x: Math.round(depois.x), y: Math.round(depois.y) });
    // fecha e abre: volta onde ficou
    await pagina.click('[data-teste="fechar-bloco"]');
    assert.equal(await pagina.locator('[data-teste="modal-bloco-demandas"]').count(), 0);
    await pagina.click('[data-teste="botao-d-demandas"]');
    const reaberta = await pagina.$eval('[data-teste="modal-bloco-demandas"]', (n) => { const r3 = n.getBoundingClientRect(); return { x: Math.round(r3.x), y: Math.round(r3.y) }; });
    assert.deepEqual(reaberta, lembrada);
    // Esc fecha
    await pagina.keyboard.press('Escape');
    await pagina.waitForFunction(() => !document.querySelector('[data-teste="modal-bloco-demandas"]'));
    if (process.env.FOTO_BANCA) { await pagina.click('[data-teste="botao-d-demandas"]'); await pagina.waitForTimeout(300); await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-janela.png') }); }
  } finally { await ctx.close(); }
  assert.deepEqual(erros, []);
});

test('📱 no celular o bloco cola embaixo, sem arrastar', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const { ctx, pagina, erros } = await abrirBloco(nav, 390);
  try {
    const m = await pagina.$eval('[data-teste="modal-bloco-demandas"]', (n) => { const r = n.getBoundingClientRect(); return { flutua: n.getAttribute('data-flutua'), esquerda: r.left, direita: r.right, fundo: r.bottom }; });
    assert.equal(m.flutua, '0'); assert.ok(m.esquerda <= 1 && m.direita >= 370, `largura total (esquerda ${m.esquerda}, direita ${m.direita} — barra de rolagem conta)`); assert.ok(m.fundo >= 799, 'colado embaixo');
  } finally { await ctx.close(); }
  assert.deepEqual(erros, []);
});
