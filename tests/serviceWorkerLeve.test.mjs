// 🪶 Service worker leve: precache só da primeira tela (27/09/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arquivosDaPrimeiraTela, filtrarPrecache } from '../src/lib/precacheEssencial.js';

const HTML = `<!doctype html><head>
<script type="module" crossorigin src="/assets/index-AAA.js"></script>
<link rel="modulepreload" crossorigin href="/assets/vendor-base-BBB.js">
<link rel="stylesheet" crossorigin href="/assets/index-CCC.css">
<link rel="preload" as="image" href="/brand/logo.webp">
<script async src="https://www.googletagmanager.com/gtag/js?id=X"></script>
</head>`;

test('lê do index.html só os arquivos do próprio site que a primeira tela usa', () => {
  assert.deepEqual([...arquivosDaPrimeiraTela(HTML)].sort(), ['assets/index-AAA.js', 'assets/index-CCC.css', 'assets/vendor-base-BBB.js']);
  assert.equal(arquivosDaPrimeiraTela('').size, 0);
});

test('o precache fica com o JS da primeira tela e tudo que não é JS', () => {
  const entradas = ['assets/index-AAA.js', 'assets/vendor-base-BBB.js', 'assets/Licensing-ZZZ.js', 'assets/vendor-pdf-YYY.js', 'assets/index-CCC.css', 'favicon.ico', 'fonts/x.woff2']
    .map((url) => ({ url, revision: null, size: 1 }));
  const ficou = filtrarPrecache(entradas, arquivosDaPrimeiraTela(HTML)).map((e) => e.url);
  assert.deepEqual(ficou, ['assets/index-AAA.js', 'assets/vendor-base-BBB.js', 'assets/index-CCC.css', 'favicon.ico', 'fonts/x.woff2']);
});

test('sem HTML legível, não filtra (melhor pesado do que sem cache)', () => {
  const entradas = [{ url: 'assets/a.js' }, { url: 'assets/b.js' }];
  assert.equal(filtrarPrecache(entradas, new Set()).length, 2);
  assert.equal(filtrarPrecache(entradas, new Set(['assets/x.css'])).length, 2);
});

test('o vite.config.js liga o filtro e o cache sob demanda do JS/CSS', () => {
  const C = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
  assert.match(C, /manifestTransforms: \[/);
  assert.match(C, /filtrarPrecache\(entradas, arquivosDaPrimeiraTela\(html\)\)/);
  assert.match(C, /handler: 'CacheFirst',\s*options: \{ cacheName: 'assets-imutaveis'/);
  assert.match(C, /cacheName: 'supabase-imagens'/, 'o cache de imagens continua');
  const semComentario = C.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  assert.doesNotMatch(semComentario, /globPatterns: \[[^\]]*html/, 'o HTML não volta pro precache');
  assert.match(semComentario, /navigateFallback: null,/, 'sem fallback de navegação: o index.html não está no precache');
  assert.match(C, /cacheName: 'supabase-imagens', cacheableResponse: \{ statuses: \[200\] \}/, 'imagem opaca não entra no cache');
});

// 🎬 28/09/2026 — dono: "no preview não continha vídeo nos cards de leilões com
// vídeo, como o iPhone". Vídeo que passa pelo service worker não toca no Safari.
test('vídeo e áudio do Storage NÃO passam pelo service worker; imagem passa', async () => {
  const { storageSemVideo } = await import('../src/lib/precacheEssencial.js');
  const pedido = (href, destination = '', range = false) => ({
    url: new URL(href),
    request: { destination, headers: new Headers(range ? { range: 'bytes=0-' } : {}) },
  });
  const S = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public';
  assert.equal(storageSemVideo(pedido(`${S}/videos-produtos/uploads/1790444659781_IHPONE_7.mp4`, 'video', true)), false, 'o vídeo do iPhone');
  assert.equal(storageSemVideo(pedido(`${S}/videos-produtos/uploads/harley.mp4`)), false, 'pelo balde, mesmo sem destination');
  assert.equal(storageSemVideo(pedido(`${S}/outro/qualquer.webm`)), false, 'pela extensão');
  assert.equal(storageSemVideo(pedido(`${S}/public-assets/foto.png`, 'image', true)), false, 'pedido em pedaços nunca');
  assert.equal(storageSemVideo(pedido(`${S}/public-assets/foto.png`, 'audio')), false);
  assert.equal(storageSemVideo(pedido(`${S}/public-assets/foto.png`, 'image')), true, 'foto continua no cache');
  assert.equal(storageSemVideo(pedido('https://outro.supabase.co/storage/v1/x.png', 'image')), false);
  assert.equal(storageSemVideo(pedido('https://gezvviyegtxytnwjkrjv.supabase.co/rest/v1/auctions')), false, 'API não é cache de imagem');
});

test('o vite.config.js usa a régua que deixa o vídeo de fora', () => {
  const C = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
  assert.match(C, /urlPattern: storageSemVideo,/);
  assert.doesNotMatch(C, /urlPattern: \/\^https:\\\/\\\/gezvviyegtxytnwjkrjv/, 'a regex antiga pegava vídeo também');
});
