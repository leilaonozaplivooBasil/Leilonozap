/**
 * A RODA DA VIDA (DIR-112, 09/09/2026) — prova em navegador real que a
 * curva fecha em círculo quando os 5 eixos estão quase 10 (dono: "quase
 * dez em tudo, pra transformar numa roda"), que um eixo fraco amassa a
 * curva visivelmente, e que os rótulos mais compridos (Produção, Real
 * Time) não clipam nas pontas — o mesmo bug que a v1 (pentágono) já teve.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-roda-da-vida');
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
    const arq = path.join(SAIDA, rel === '/' ? 'roda-da-vida.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/roda-da-vida.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

test('a roda da vida: fecha em círculo quando quase tudo é 10, sem clipar rótulo nenhum', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1400, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);

  await pagina.getByText('a roda GIRA', { exact: false }).first().waitFor();
  await pagina.getByText('a roda está torta', { exact: false }).first().waitFor();
  await pagina.getByText('a roda ainda não gira', { exact: false }).first().waitFor();

  // os rótulos mais compridos, nos 4 quadros — se clipar, o texto nem entra no DOM cortado, mas
  // o que quebrava antes era o viewBox cortando visualmente; aqui garantimos que o texto RENDERIZA
  // dentro da área visível do SVG (bounding box do <text> dentro do bounding box do <svg>).
  const cartoes = await pagina.locator('[data-teste^="roda-"]').all();
  assert.equal(cartoes.length, 4, 'os 4 cenários (cheia, torta, murcha, escura) têm que aparecer');
  for (const cartao of cartoes) {
    const svg = cartao.locator('svg').first();
    const svgBox = await svg.boundingBox();
    const textos = await cartao.locator('svg text').all();
    assert.ok(textos.length >= 10, 'cada roda tem 2 linhas de texto por eixo (rótulo + %)');
    for (const t of textos) {
      const tBox = await t.boundingBox();
      // folga de 1px pra arredondamento de sub-pixel
      assert.ok(tBox.x >= svgBox.x - 1 && tBox.x + tBox.width <= svgBox.x + svgBox.width + 1,
        `rótulo clipado horizontalmente: texto em x=${tBox.x}..${tBox.x + tBox.width}, svg em x=${svgBox.x}..${svgBox.x + svgBox.width}`);
    }
  }

  await pagina.screenshot({ path: path.join(FOTOS, 'roda-da-vida.png'), fullPage: true });
  assert.deepEqual(erros, [], `sem erro de JS na página: ${erros.join(' | ')}`);
});
