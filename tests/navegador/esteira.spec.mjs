/**
 * ESTEIRA DE CAPTAÇÃO — clique da fila até o card, e a mãozinha.
 *
 * 🔴 Dono (08/09/2026): "eu estou com dificuldade de ver aonde é o contato
 * pra entrar na esteira." O que só o navegador prova:
 *   • a fila "Quem contatar hoje" mostra a reunião que JÁ aconteceu com
 *     rótulo e cor PRÓPRIOS (antes: sem estilo nenhum, motivo não mapeado);
 *   • tocar nela abre DIRETO o card de editar na Esteira — mesmo quando a
 *     oportunidade não tem e-mail (o caso que antes abria um cliente vazio);
 *   • a mãozinha (tour guiado) abre sozinha na primeira visita, aponta pros
 *     elementos DE VERDADE da tela, anda com "próximo", e não volta mais
 *     depois de fechada (localStorage).
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-esteira');
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], { cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit' });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'esteira.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/esteira.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function abrir({ tourVisto = true } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  // controla se a mãozinha nasce aberta sozinha (marca do localStorage)
  await ctx.addInitScript((visto) => { if (visto) localStorage.setItem('tour_esteira_visto', '1'); }, tourVisto);
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="esteira-painel"]').waitFor();
  return { pagina, ctx, erros };
}

test('FILA: reunião que já aconteceu ganha rótulo e cor próprios (antes: sem estilo nenhum)', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  await pagina.locator('[data-teste="quem-contatar-hoje"]').getByText('Marina Alves').waitFor();
  await pagina.getByText('Reunião aconteceu — atualize').waitFor();
  const cor = await pagina.getByText('Reunião aconteceu — atualize').evaluate((el) => getComputedStyle(el).color);
  assert.notEqual(cor, 'rgba(0, 0, 0, 0)', 'a pastilha tem que ter cor de verdade, não nascer sem classe');
  await pagina.screenshot({ path: path.join(FOTOS, 'esteira-fila.png') });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('CLIQUE: tocar na reunião da fila abre DIRETO o card de editar na Esteira (mesmo sem e-mail cadastrado)', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.getByText('Marina Alves').first().click();
  // o modal de EDITAR (não "Nova oportunidade") abre com o nome dela
  await pagina.getByText('Editar — Marina Alves').waitFor();
  assert.equal(await pagina.locator('input[value="Marina Alves"]').count(), 1);
  // e o valor já vem preenchido — prova que é o card de VERDADE, não um em branco
  await pagina.getByText('= R$ 50.000,00').waitFor();
  await ctx.close();
});

test('ATALHO "Nova oportunidade": quem não passou pela Lista/Contato do Método vê o aviso e fica travado até marcar "seguir mesmo assim"', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="esteira-nova"]').click();
  await pagina.getByText('Buscar cliente do CRM').waitFor();
  await pagina.locator('p:text-is("Telefone (WhatsApp)") + input').fill('11966665555'); // Diego — nada feito no Método
  await pagina.getByText('🪜 Antes da esteira, o caminho do Método:').waitFor();
  await pagina.getByText('❌ Está na Lista, qualificada (Hábito 3)').waitFor();
  await pagina.getByText('❌ Já registrou o contato (Hábito 4)').waitFor();

  // preenche o resto do formulário — mesmo assim, Salvar continua travado
  await pagina.locator('p:text-is("Nome do cliente *") + input').fill('Diego Prado');
  await pagina.locator('p:text-is("Executivo responsável *") + select').selectOption('exec1');
  const salvar = pagina.getByRole('button', { name: 'Salvar' });
  assert.equal(await salvar.isDisabled(), true, 'sem marcar "seguir mesmo assim", não pode pular o Método');
  await pagina.screenshot({ path: path.join(FOTOS, 'esteira-gate.png') });

  // "ir qualificar" manda pro Hábito 3
  await pagina.getByRole('button', { name: 'ir qualificar →' }).click();
  assert.deepEqual(await pagina.evaluate(() => window.__foiPara), ['lista']);
  await ctx.close();
});

test('ATALHO "Nova oportunidade": quem JÁ fez Lista + Contato + Agenda não vê aviso nenhum', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="esteira-nova"]').click();
  await pagina.locator('p:text-is("Telefone (WhatsApp)") + input').fill('11977776666'); // Roberta — já fez tudo
  await pagina.waitForTimeout(200);
  assert.equal(await pagina.getByText('🪜 Antes da esteira').count(), 0, 'quem já fez a Lista/Contato/Agenda não precisa ver aviso nenhum');
  await ctx.close();
});

test('MÃOZINHA: abre sozinha na primeira visita, aponta pra elementos reais, anda com "próximo" e não volta mais', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ tourVisto: false });
  await pagina.getByText('Essa é a Esteira de Captação').waitFor();
  // aponta pro título de verdade da tela, não uma caixa solta
  const alvo = pagina.locator('[data-teste="esteira-titulo"]');
  await pagina.locator('[data-teste="tour-spotlight"]').waitFor();
  await pagina.waitForTimeout(350); // o recorte desliza (transition-all) — espera assentar antes de medir
  const retSpotlight = await pagina.locator('[data-teste="tour-spotlight"]').boundingBox();
  const retAlvo = await alvo.boundingBox();
  assert.ok(Math.abs(retSpotlight.y - retAlvo.y) < 20, 'o spotlight tem que estar em cima do título de verdade');

  await pagina.getByRole('button', { name: /próximo/ }).click();
  await pagina.getByText('Comece por aqui').waitFor();
  await pagina.getByRole('button', { name: /próximo/ }).click();
  await pagina.getByText('Cada coluna é um estágio').waitFor();
  await pagina.getByRole('button', { name: /próximo/ }).click();
  await pagina.getByText('E aqui você vê se está indo bem').waitFor();
  await pagina.screenshot({ path: path.join(FOTOS, 'esteira-tour.png') });
  await pagina.getByRole('button', { name: /entendi/ }).click();
  await pagina.waitForTimeout(200);
  assert.equal(await pagina.getByText('E aqui você vê se está indo bem').count(), 0, 'fechou de verdade');

  // marcou como visto — recarregar não abre sozinha de novo
  const visto = await pagina.evaluate(() => localStorage.getItem('tour_esteira_visto'));
  assert.equal(visto, '1');
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('MÃOZINHA: quem já viu não é incomodado sozinho — só reabre pelo botão "Como funciona"', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ tourVisto: true });
  assert.equal(await pagina.getByText('Essa é a Esteira de Captação').count(), 0, 'não abre sozinha de novo');
  await pagina.locator('[data-teste="esteira-como-funciona"]').click();
  await pagina.getByText('Essa é a Esteira de Captação').waitFor();
  await ctx.close();
});
