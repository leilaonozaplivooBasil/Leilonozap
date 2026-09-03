/**
 * Exportar o Financeiro em planilha — NUM NAVEGADOR DE VERDADE, baixando o
 * arquivo e ABRINDO o que saiu.
 *
 * 🔴 "A opção de exportar em planilha ainda não está disponível."
 *
 * O que só o navegador mede: o clique realmente baixa; o conteúdo é o da LISTA
 * FILTRADA (não a base toda); o ponto-e-vírgula na descrição não escorrega a
 * linha de coluna; e `=1+1` não sai como fórmula executável.
 *
 * COMO RODAR
 *   npm i -D playwright        (uma vez; o Chromium já está na máquina)
 *   npm run test:navegador
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
// uma pasta por banca — ver a nota em carrossel.spec.mjs
const SAIDA = process.env.SAIDA_BANCA
  || path.join(tmpdir(), `banca-${path.basename(new URL(import.meta.url).pathname, '.spec.mjs')}`);
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((c) => existsSync(c));

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch { /* dependência opcional: os casos se marcam como PULADOS */ }

const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'planilha.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/planilha.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir() {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="exportar"]').waitFor();
  return { pagina, ctx, erros };
}

/** Clica em exportar e devolve o arquivo que o navegador baixou, já lido. */
async function baixar(pagina) {
  const [download] = await Promise.all([
    pagina.waitForEvent('download'),
    pagina.locator('[data-teste="exportar"]').click(),
  ]);
  const caminho = await download.path();
  return { nome: download.suggestedFilename(), texto: readFileSync(caminho, 'utf8') };
}
const linhasDe = (texto) => texto.replace(/^﻿/, '').split('\r\n');

// ─────────────── o clique baixa mesmo ───────────────

test('clicar em Exportar baixa um arquivo .csv', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const arq = await baixar(pagina);
  assert.match(arq.nome, /^financeiro-\d{8}-\d{4}\.csv$/, `nome estranho: ${arq.nome}`);
  assert.ok(arq.texto.length > 0, 'o arquivo veio vazio');
  await ctx.close();
});

test('o arquivo começa com o BOM — sem ele o Excel come o acento', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const { texto } = await baixar(pagina);
  assert.equal(texto.charCodeAt(0), 0xFEFF, 'o BOM não foi para o arquivo');
  assert.match(texto, /alimentação/, 'o acento não sobreviveu');
  await ctx.close();
});

// ─────────────── segue os filtros da tela ───────────────

test('exporta o que está NA TELA, não a base inteira', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  // sem filtro: 4 linhas
  assert.equal(linhasDe((await baixar(pagina)).texto).length, 5, 'cabeçalho + 4');

  // com o filtro ligado, a tela mostra 2 — a planilha tem de acompanhar
  await pagina.locator('[data-teste="filtrar-pendentes"]').click();
  assert.equal(await pagina.locator('[data-teste="na-tela"]').innerText(), '2');
  const filtrado = linhasDe((await baixar(pagina)).texto);
  assert.equal(filtrado.length, 3, `saíram ${filtrado.length - 1} linhas, a tela mostra 2`);
  assert.match(filtrado[1], /^Hotel Restaurante;/);
  assert.match(filtrado[2], /^Concorcio Bradesco;/);
  assert.ok(!filtrado.join('\n').includes('diária de setembro'), 'exportou linha que não está na tela');
  await ctx.close();
});

test('sem linha nenhuma na tela, o botão desliga', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="esvaziar"]').click();
  assert.equal(await pagina.locator('[data-teste="na-tela"]').innerText(), '0');
  assert.equal(await pagina.locator('[data-teste="exportar"]').isDisabled(), true,
    'dá para baixar uma planilha vazia');
  await ctx.close();
});

// ─────────────── as duas travas, no arquivo de verdade ───────────────

test('ponto-e-vírgula na descrição não escorrega a linha de coluna', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const linhas = linhasDe((await baixar(pagina)).texto);
  const colunas = linhas[0].split(';').length;
  const daArmadilha = linhas.find((l) => l.includes('diária de setembro'));
  assert.ok(daArmadilha, 'a linha da armadilha não saiu');
  assert.match(daArmadilha, /^"Hotel; diária de setembro";/, `não foi escapada: ${daArmadilha}`);
  // conta as células respeitando as aspas — tem de bater com o cabeçalho
  const celulas = daArmadilha.match(/("([^"]|"")*"|[^;]*)(;|$)/g).filter((x, i, a) => i < a.length - 1);
  assert.equal(celulas.length, colunas, `linha com ${celulas.length} células e cabeçalho com ${colunas}`);
  await ctx.close();
});

test('"=1+1" NÃO sai como fórmula executável', { skip: semNavegador }, async () => {
  // Célula começando com =, +, - ou @ é fórmula para o Excel. Descrição e
  // empresa são digitadas por gente: isso é execução na máquina do contador.
  const { pagina, ctx } = await abrir();
  const linhas = linhasDe((await baixar(pagina)).texto);
  const perigosa = linhas.find((l) => l.includes('1+1'));
  assert.ok(perigosa, 'a linha da fórmula não saiu');
  assert.match(perigosa, /^'=1\+1;/, `saiu como fórmula: ${perigosa}`);
  assert.match(perigosa, /'@REF/, 'o @ da empresa não foi neutralizado');
  await ctx.close();
});

// ─────────────── a planilha fala a língua da tela ───────────────

test('os rótulos do arquivo são os mesmos que a tabela mostra', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const daTabela = await pagina.locator('[data-teste="tabela"]').innerText();
  const { texto } = await baixar(pagina);
  for (const palavra of ['Pendente', 'Pago', 'Vencido', 'Fixo', 'Único', 'Parcelado', 'PIX', 'Boleto']) {
    if (!daTabela.includes(palavra)) continue;   // só cobra o que a tela realmente mostra
    assert.ok(texto.includes(palavra), `a tabela diz "${palavra}" e a planilha não`);
  }
  await ctx.close();
});

test('as colunas que o PDF esconde estão no arquivo', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const cabecalho = linhasDe((await baixar(pagina)).texto)[0];
  for (const col of ['Centro de custo', 'Parcela', 'Juros', 'Conta de pagamento',
    'Data de pagamento', 'Observações', 'Lançado em', 'Lançado por']) {
    assert.ok(cabecalho.includes(col), `faltou "${col}" no cabeçalho`);
  }
  await ctx.close();
});

test('nenhum erro de JavaScript ao exportar', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  await baixar(pagina);
  await pagina.waitForTimeout(200);
  assert.deepEqual(erros, [], `erros na página: ${erros.join(' | ')}`);
  await ctx.close();
});
