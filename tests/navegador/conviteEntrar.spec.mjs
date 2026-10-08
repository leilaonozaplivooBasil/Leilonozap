/**
 * 🔑 "JÁ TEM CONTA? ENTRAR" NO CONVITE — CONFERIDO NUM CHROMIUM.
 *
 * Caso Renan Silva (08/10/2026): cliente cadastrado via o convite "Crie seu
 * Perfil de Lance" toda vez que abria pelo navegador do WhatsApp (sem a
 * sessão) e o popup só tinha o X. Aqui se prova, com o componente real:
 *   1. o botão existe e está visível no celular (390px) sem rolar o rodapé
 *      pra fora da tela de um jeito que o esconda;
 *   2. tocar nele fecha o convite, abre o login e marca a renovação de sessão
 *      (a tela recarrega com a conta certa ao entrar).
 *
 * COMO RODAR
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-convite-entrar');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function garantirNavegador() {
  if (navegador) return navegador;
  if (!process.env.BANCA_PRONTA) {
    execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
      cwd: path.join(AQUI, '..', '..'),
      env: { ...process.env, SAIDA_BANCA: SAIDA },
      stdio: 'inherit',
    });
  }
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'convite-entrar.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/convite-entrar.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO, proxy: { server: 'per-context' } } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) await new Promise((ok) => servidor.close(ok));
});

async function abrir(largura) {
  const ctx = await (await garantirNavegador()).newContext({ viewport: { width: largura, height: 844 }, proxy: { server: 'http://127.0.0.1:1', bypass: '127.0.0.1' } });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('[data-teste="convite-entrar"]');
  return { ctx, pagina };
}

test('o convite mostra quem indicou e tem o "Já tem conta? Entrar"', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390);
  try {
    assert.ok(await pagina.getByText('Você foi convidado por').isVisible());
    const botao = pagina.locator('[data-teste="convite-entrar"]');
    assert.equal((await botao.innerText()).replace(/\s+/g, ' ').trim(), 'Já tem conta? Entrar');
    await botao.scrollIntoViewIfNeeded();
    assert.ok(await botao.isVisible(), 'o botão aparece no celular');
  } finally { await ctx.close(); }
});

test('tocar em "Entrar" fecha o convite, abre o login e marca a renovação', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390);
  try {
    await pagina.locator('[data-teste="convite-entrar"]').click();
    const r = await pagina.evaluate(() => ({ fechou: window.__fechou, abriuLogin: window.__abriuLogin, relogin: sessionStorage.getItem('nz_relogin') }));
    assert.deepEqual(r, { fechou: 1, abriuLogin: 1, relogin: '1' });
  } finally { await ctx.close(); }
});
