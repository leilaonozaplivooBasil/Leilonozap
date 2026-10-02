/**
 * 🔨 O "VENDIDO!" CHEGA A TODO MUNDO QUE ESTÁ NA SALA — num Chromium.
 *
 * 01/10/2026: o leiloeiro não aparecia para todos no arremate. A sala só
 * sabia do fim pela própria chamada ao servidor ou por uma consulta a cada
 * 15 s; o tempo real que o código assinava nunca funcionou (publicação vazia).
 *
 * Aqui rodam DUAS salas reais do mesmo leilão. Só uma consegue encerrar no
 * servidor (de mentira); a outra fica sabendo pelo tempo real — e as duas têm
 * que mostrar o VENDIDO praticamente juntas.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-sala-vendido');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
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
    const arq = path.join(SAIDA, rel === '/' ? 'sala-vendido.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/sala-vendido.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

test('duas salas, uma chamada ao servidor: o VENDIDO aparece nas duas, praticamente juntas', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const pagina = await nav.newPage({ viewport: { width: 1340, height: 1000 } });
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(`${BASE}?fim=6`, { waitUntil: 'domcontentloaded' });

  // as duas salas abrem rolando
  for (const k of ['A', 'B']) await pagina.locator(`[data-pane="${k}"]`).getByText('Dar Lance').first().waitFor({ timeout: 20000 });

  // espera o VENDIDO em cada quadro e anota o instante
  const t0 = Date.now(); const vistos = {};
  while (Date.now() - t0 < 30000 && !(vistos.A && vistos.B)) {
    for (const k of ['A', 'B']) {
      if (vistos[k]) continue;
      const txt = await pagina.locator(`[data-pane="${k}"]`).innerText().catch(() => '');
      if (/VENDIDO para Ana Prova/.test(txt)) vistos[k] = Date.now() - t0;
    }
    await pagina.waitForTimeout(100);
  }
  assert.ok(vistos.A, 'a sala A mostrou o VENDIDO');
  assert.ok(vistos.B, 'a sala B mostrou o VENDIDO');
  assert.ok(Math.abs(vistos.A - vistos.B) < 2000, `as duas quase juntas (A ${vistos.A} ms, B ${vistos.B} ms)`);

  // só UMA chamada de encerramento chegou ao servidor: a outra sala soube pelo tempo real
  const chamadas = await pagina.evaluate(() => window.__plataformaFalsa.chamadas.filter((c) => c.nome === 'finalizeAuction').length);
  assert.equal(chamadas, 1, 'uma chamada de encerramento; a outra sala não precisou dela');

  // as duas salas refletem o estado do servidor
  for (const k of ['A', 'B']) {
    const txt = await pagina.locator(`[data-pane="${k}"]`).innerText();
    assert.match(txt, /Encerrado/, `sala ${k} mostra Encerrado`);
  }
  assert.deepEqual(erros, [], 'sem erro de página');
  await pagina.close();
});

test('a janela do F5: quem abre a sala logo depois do fim ainda vê o VENDIDO', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const pagina = await nav.newPage({ viewport: { width: 1340, height: 1000 } });
  // o leilão já terminou há 10 s (fim negativo); a banca semeia como `ended`
  await pagina.goto(`${BASE}?fim=-10&encerrado=1`, { waitUntil: 'domcontentloaded' });
  const txt = async (k) => pagina.locator(`[data-pane="${k}"]`).innerText().catch(() => '');
  const t0 = Date.now(); let viu = false;
  while (Date.now() - t0 < 15000 && !viu) { viu = /VENDIDO para Ana Prova/.test(await txt('A')); if (!viu) await pagina.waitForTimeout(100); }
  assert.ok(viu, 'a sala aberta 10 s depois do fim celebra');
  await pagina.close();
});
