/**
 * O MODAL DO SONHO: COLAR IMAGEM E BUSCAR "IGUAL O GOOGLE".
 *
 * 🔴 Dono (06/09/2026): "mais uma forma: copiar e colar a imagem — no celular
 * fica ainda mais foda; e o buscador está trazendo imagens aleatórias,
 * precisa puxar do Google igual o Google".
 *
 * O que só o navegador mede (com a plataforma de mentira da banca):
 *   • colar uma IMAGEM (evento paste, como Ctrl+V ou o "Colar" do dedo) sobe
 *     pelo MESMO upload de sempre e já entra marcada;
 *   • colar um ENDEREÇO no campo do nome vira imagem da galeria, não texto;
 *   • o botão "Colar imagem" lê a área de transferência e sobe;
 *   • a busca chama a rota nova (buscarImagensGoogle), a galeria mostra a
 *     MINIATURA e o quadro recebe a imagem GRANDE re-hospedada;
 *   • no celular o modal continua cabendo (foto pra julgar).
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
    const arq = path.join(SAIDA, rel === '/' ? 'sonho.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/sonho.html`;
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
    ? { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1280, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="sonho-modal"]').waitFor();
  return { pagina, ctx, erros };
}

const chamadas = (pagina) => pagina.evaluate(() => window.__plataformaFalsa.chamadas);
const adicionados = async (pagina) => JSON.parse(await pagina.locator('[data-teste="adicionados"]').textContent());
const galeria = (pagina) => pagina.locator('[data-teste="sonho-modal"] img');
// sem rede a miniatura não carrega e some (onError) — o que se toca é o
// BOTÃO da imagem, que continua lá
const botaoDaImagem = (pagina, i = 0) => galeria(pagina).nth(i).locator('xpath=ancestor::button[1]');

// uma imagem PNG de verdade (o convertToWebP precisa decodificar), colada
// como se fosse Ctrl+V / "Colar" do menu do dedo, em cima do elemento dado
async function colarImagem(pagina, seletor) {
  await pagina.evaluate(async (sel) => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 48;
    const g = c.getContext('2d'); g.fillStyle = '#3B6FF6'; g.fillRect(0, 0, 64, 48);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'print.png', { type: 'image/png' }));
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.querySelector(sel).dispatchEvent(ev);
  }, seletor);
}
async function colarTexto(pagina, seletor, texto) {
  return pagina.evaluate(([sel, t]) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', t);
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    return document.querySelector(sel).dispatchEvent(ev); // false = o modal engoliu
  }, [seletor, texto]);
}

test('COLAR: uma imagem colada (Ctrl+V / "Colar" do dedo) sobe pelo upload de sempre e já entra marcada', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  await colarImagem(pagina, 'input[placeholder*="busca no Google"]');
  await pagina.getByText(/1 escolhida/).waitFor({ timeout: 10000 });
  const c = await chamadas(pagina);
  assert.equal(c.filter((x) => x.tipo === 'upload').length, 1, JSON.stringify(c));
  assert.equal(await galeria(pagina).count(), 1);
  await pagina.getByRole('button', { name: /adicionar 1 imagem/i }).click();
  await pagina.waitForFunction(() => document.querySelector('[data-teste="adicionados"]').textContent !== '[]');
  const itens = await adicionados(pagina);
  assert.equal(itens.length, 1);
  assert.match(itens[0].imagem_url, /^https:\/\/nosso-bucket\//);
  assert.ok(!c.some((x) => x.nome === 'proxyImage'), 'imagem já nossa não passa pelo proxy');
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('COLAR: um endereço de imagem colado no campo do nome vira imagem da galeria, não texto', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const engoliu = !(await colarTexto(pagina, 'input[placeholder*="busca no Google"]', 'https://fotos.com/casa.jpg'));
  assert.equal(engoliu, true, 'o modal tinha que interceptar o endereço');
  await pagina.getByText(/1 escolhida/).waitFor();
  assert.equal(await galeria(pagina).getAttribute('src'), 'https://fotos.com/casa.jpg');
  assert.equal(await pagina.locator('input[placeholder*="busca no Google"]').inputValue(), '');
  // texto comum segue o caminho normal (não é engolido)
  const engoliuTexto = !(await colarTexto(pagina, 'input[placeholder*="busca no Google"]', 'casa na praia'));
  assert.equal(engoliuTexto, false);
  await ctx.close();
});

test('COLAR: o botão "Colar imagem" lê a área de transferência e sobe a imagem', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  // a Async Clipboard API pede gesto + permissão; aqui a área de transferência
  // é simulada com um item de imagem, como o Chrome no Android entrega
  await pagina.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
    Object.defineProperty(navigator, 'clipboard', { value: { read: async () => [{ types: ['image/png'], getType: async () => blob }] }, configurable: true });
  });
  await pagina.locator('[data-teste="sonho-colar"]').click();
  await pagina.getByText(/1 escolhida/).waitFor({ timeout: 10000 });
  const c = await chamadas(pagina);
  assert.equal(c.filter((x) => x.tipo === 'upload').length, 1);
  // o nome nasce "colada-<hora>.png" (o convertToWebP pode trocar a extensão)
  assert.match(c.find((x) => x.tipo === 'upload').nome, /^colada-\d+\.(png|webp)$/);
  await ctx.close();
});

test('COLAR: sem a API (navegador antigo / sem permissão), o botão ensina o gesto em vez de falhar calado', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  await pagina.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); });
  await pagina.locator('[data-teste="sonho-colar"]').click();
  await pagina.getByText(/escolha "Colar"/).waitFor();
  assert.equal(await pagina.evaluate(() => document.activeElement?.placeholder || ''), 'ex.: "casa na praia", "BMW X6 preta" — busca no Google');
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('BUSCA: chama a rota do Google Imagens, mostra a MINIATURA e manda a imagem GRANDE re-hospedada pro quadro', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  await pagina.evaluate(() => {
    window.__plataformaFalsa.respostas.buscarImagensGoogle = {
      success: true,
      images: ['https://site.com/grande.jpg', 'https://outro.com/grande2.jpg'],
      resultados: [
        { original: 'https://site.com/grande.jpg', miniatura: 'https://tbn/1', titulo: 'Casa', fonte: 'site.com' },
        { original: 'https://outro.com/grande2.jpg', miniatura: 'https://tbn/2', titulo: 'Casa 2', fonte: 'outro.com' },
      ],
      query_usada: 'casa na praia', source: 'serpapi_google_images',
    };
    window.__plataformaFalsa.respostas.proxyImage = ({ imageUrl }) => ({ file_url: `https://nosso-bucket/proxy/${encodeURIComponent(imageUrl)}` });
  });
  await pagina.locator('input[placeholder*="busca no Google"]').fill('casa na praia');
  await pagina.getByRole('button', { name: /buscar imagem/i }).click();
  await pagina.getByText(/toque pra marcar/i).waitFor();
  const c = await chamadas(pagina);
  const busca = c.find((x) => x.tipo === 'invoke' && x.nome === 'buscarImagensGoogle');
  assert.deepEqual(busca.corpo, { q: 'casa na praia' });
  assert.ok(!c.some((x) => x.nome === 'extractGoogleShoppingImages'), 'a rota do Shopping não pode mais ser a da busca do sonho');
  assert.deepEqual(await galeria(pagina).evaluateAll((els) => els.map((e) => e.getAttribute('src'))), ['https://tbn/1', 'https://tbn/2']);

  await botaoDaImagem(pagina).click();
  await pagina.getByRole('button', { name: /adicionar 1 imagem/i }).click();
  await pagina.waitForFunction(() => document.querySelector('[data-teste="adicionados"]').textContent !== '[]');
  const itens = await adicionados(pagina);
  assert.equal(itens[0].imagem_url, `https://nosso-bucket/proxy/${encodeURIComponent('https://site.com/grande.jpg')}`);
  assert.equal(itens[0].titulo, 'casa na praia');
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('BUSCA: se o site da imagem grande bloquear o proxy, o quadro fica com a miniatura re-hospedada', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.evaluate(() => {
    window.__plataformaFalsa.respostas.buscarImagensGoogle = {
      success: true, images: ['https://bloqueado.com/g.jpg'],
      resultados: [{ original: 'https://bloqueado.com/g.jpg', miniatura: 'https://tbn/ok', titulo: 'x', fonte: 'y' }],
    };
    window.__plataformaFalsa.respostas.proxyImage = ({ imageUrl }) => (imageUrl.includes('bloqueado') ? { success: false } : { file_url: `https://nosso-bucket/proxy/${encodeURIComponent(imageUrl)}` });
  });
  await pagina.locator('input[placeholder*="busca no Google"]').fill('sonho');
  await pagina.getByRole('button', { name: /buscar imagem/i }).click();
  await pagina.getByText(/toque pra marcar/i).waitFor();
  await botaoDaImagem(pagina).click();
  await pagina.getByRole('button', { name: /adicionar 1 imagem/i }).click();
  await pagina.waitForFunction(() => document.querySelector('[data-teste="adicionados"]').textContent !== '[]');
  assert.equal((await adicionados(pagina))[0].imagem_url, `https://nosso-bucket/proxy/${encodeURIComponent('https://tbn/ok')}`);
  await ctx.close();
});

test('CELULAR: o modal cabe e os três caminhos (buscar, enviar, colar) estão à vista — foto pra julgar', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ celular: true });
  // dentro do CARTÃO (não só da tela): botão vazando pela borda é feio
  const cartao = await pagina.locator('[data-teste="sonho-modal"]').boundingBox();
  for (const nome of [/buscar/i, /enviar do aparelho/i, /colar imagem/i, /^usar$/i, /adicionar só com texto/i]) {
    const b = await pagina.getByRole('button', { name: nome }).first().boundingBox();
    assert.ok(b && b.x >= cartao.x && b.x + b.width <= cartao.x + cartao.width + 0.5, `${nome} vaza do cartão: ${JSON.stringify(b)} vs ${JSON.stringify(cartao)}`);
  }
  assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'a tela rolou pro lado');
  await pagina.screenshot({ path: path.join(FOTOS, 'sonho-celular.png') });
  await ctx.close();
});
