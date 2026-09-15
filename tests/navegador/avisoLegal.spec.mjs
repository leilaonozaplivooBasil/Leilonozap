/**
 * ⚖️ O AVISO LEGAL NÃO PODE ENCOSTAR NO ENDEREÇO — MEDIDO NUM CHROMIUM.
 *
 * Print do dono (15/09/2026): na capa do convite ao parceiro, "NÃO É OFERTA
 * PÚBLICA" ficava colado no fim do endereço, e o "/RJ" sumia atrás dele.
 * Parecia bug de renderização, não nota de rodapé.
 *
 * Os dois viviam na mesma linha flex, sem `gap`, com o endereço sem largura
 * máxima e o aviso sem `shrink-0`. O conserto foi descer o aviso para uma
 * linha própria — e é isso que se mede aqui, em SEIS larguras: as caixas dos
 * dois não podem se cruzar, e o aviso tem que ficar ABAIXO do endereço.
 *
 * Um teste que só olhasse classe de CSS não pegaria: o defeito acontece no
 * desenho, não no código-fonte.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-aviso-legal');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'aviso-legal.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/aviso-legal.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

// 360 é o celular estreito de verdade; 1440 é o notebook do print.
const LARGURAS = [360, 390, 640, 768, 1024, 1440];

async function medir(width) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="aviso-oferta-publica"]').waitFor();
  const aviso = await pagina.locator('[data-teste="aviso-oferta-publica"]').boundingBox();
  const endereco = await pagina.locator('p', { hasText: 'Av. das Américas' }).first().boundingBox();
  const empresa = await pagina.locator('p', { hasText: 'COMPRAS FULL' }).first().boundingBox();
  await ctx.close();
  return { aviso, endereco, empresa, erros };
}

const seCruzam = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width
  && a.y < b.y + b.height && b.y < a.y + a.height;

for (const w of LARGURAS) {
  test(`⚖️ ${w}px — o aviso NÃO encosta no endereço`, { skip: semNavegador }, async () => {
    const { aviso, endereco, erros } = await medir(w);
    assert.ok(aviso && endereco, 'não achei uma das caixas');
    assert.ok(!seCruzam(aviso, endereco),
      `as caixas se cruzam em ${w}px — aviso ${JSON.stringify(aviso)} × endereço ${JSON.stringify(endereco)}`);
    assert.deepEqual(erros, []);
  });

  test(`⚖️ ${w}px — o aviso fica ABAIXO do endereço, com respiro`, { skip: semNavegador }, async () => {
    const { aviso, endereco } = await medir(w);
    const folga = aviso.y - (endereco.y + endereco.height);
    assert.ok(folga > 8,
      `o aviso começa ${Math.round(folga)}px depois do endereço em ${w}px — perto demais para ler como nota de rodapé`);
  });
}

test('a ordem de leitura continua empresa → endereço → aviso', { skip: semNavegador }, async () => {
  const { aviso, endereco, empresa } = await medir(1440);
  assert.ok(empresa.y < endereco.y, 'o endereço subiu acima da empresa');
  assert.ok(endereco.y < aviso.y, 'o aviso subiu acima do endereço');
});

test('o aviso continua discreto: uma linha só, e não vira manchete', { skip: semNavegador }, async () => {
  const { aviso, empresa } = await medir(1440);
  assert.ok(aviso.height < empresa.height * 2,
    `o aviso ficou com ${Math.round(aviso.height)}px de altura — quebrou em várias linhas`);
});
