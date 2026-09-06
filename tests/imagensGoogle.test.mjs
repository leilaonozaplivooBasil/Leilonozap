// Busca de imagens "igual o Google" pro quadro dos sonhos (06/09/2026):
// a leitura de cada fonte e a cascata, com as respostas cravadas — sem rede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { limparResultados, lerSerpApiImagens, lerSearchApiImagens, lerSerpApiShopping, buscarImagensGoogle } from '../api/_lib/imagensGoogle.js';

const SERP = { images_results: [
  { position: 1, original: 'https://a.com/casa.jpg', thumbnail: 'https://tbn/1', title: 'Casa na praia', source: 'a.com' },
  { position: 2, original: 'https://b.com/casa.svg', thumbnail: 'https://tbn/2', title: 'vetor' },
  { position: 3, original: 'https://a.com/casa.jpg', thumbnail: 'https://tbn/3', title: 'repetida' },
  { position: 4, thumbnail: 'https://tbn/4', title: 'só miniatura' },
] };
const SEARCH = { images: [
  { title: 'Grécia', source: { name: 'viagens.com' }, original: { link: 'https://v.com/grecia.jpg', width: 1200 }, thumbnail: 'https://tbn/g' },
] };
const SHOP = { shopping_results: [{ title: 'BMW X6 miniatura', thumbnail: 'https://shop/bmw.jpg', source: 'loja' }], inline_images: [{ original: 'https://img/bmw-grande.jpg', thumbnail: 'https://tbn/b' }] };

test('SerpAPI google_images: original + miniatura + título; SVG fora, repetida fora, só-miniatura usa a miniatura', () => {
  const r = limparResultados(lerSerpApiImagens(SERP));
  assert.deepEqual(r.map((x) => x.original), ['https://a.com/casa.jpg', 'https://tbn/4']);
  assert.equal(r[0].miniatura, 'https://tbn/1');
  assert.equal(r[0].titulo, 'Casa na praia');
  assert.equal(r[0].fonte, 'a.com');
  assert.equal(r[1].miniatura, 'https://tbn/4');
});

test('SearchAPI google_images: o link grande vem de original.link e a fonte de source.name', () => {
  const r = limparResultados(lerSearchApiImagens(SEARCH));
  assert.deepEqual(r, [{ original: 'https://v.com/grecia.jpg', miniatura: 'https://tbn/g', titulo: 'Grécia', fonte: 'viagens.com' }]);
});

test('Shopping (último recurso): miniatura de anúncio e imagens inline', () => {
  const r = limparResultados(lerSerpApiShopping(SHOP));
  assert.deepEqual(r.map((x) => x.original), ['https://shop/bmw.jpg', 'https://img/bmw-grande.jpg']);
});

test('limparResultados: no máximo 24, e lixo (sem URL, http inválido) não passa', () => {
  const muitos = Array.from({ length: 40 }, (_, i) => ({ original: `https://x/${i}.jpg` }));
  assert.equal(limparResultados(muitos).length, 24);
  assert.deepEqual(limparResultados([{ original: 'ftp://x' }, { titulo: 'nada' }, null]), []);
});

function fetchFalso(respostas) {
  const chamadas = [];
  const fn = async (url) => {
    chamadas.push(url);
    const r = respostas.find((x) => url.includes(x.trecho));
    if (!r) throw new Error('rede');
    if (r.status) return { ok: false, status: r.status };
    return { ok: true, json: async () => r.json };
  };
  return { fn, chamadas };
}

test('cascata: SerpAPI Imagens responde → para ali, não gasta a reserva', async () => {
  const { fn, chamadas } = fetchFalso([{ trecho: 'engine=google_images&q=casa', json: SERP }]);
  const r = await buscarImagensGoogle('casa na praia', { chaves: { serpapi: 'S', searchapi: 'A' }, fetchFn: fn });
  assert.equal(r.fonte, 'serpapi_google_images');
  assert.equal(r.resultados[0].original, 'https://a.com/casa.jpg');
  assert.equal(chamadas.length, 1);
  assert.ok(chamadas[0].startsWith('https://serpapi.com/search.json?engine=google_images'));
  assert.ok(chamadas[0].includes('q=casa%20na%20praia'));
});

test('cascata: SerpAPI Imagens falha (HTTP 429) → SearchAPI responde', async () => {
  const { fn } = fetchFalso([{ trecho: 'serpapi.com/search.json?engine=google_images', status: 429 }, { trecho: 'searchapi.io', json: SEARCH }]);
  const r = await buscarImagensGoogle('grécia', { chaves: { serpapi: 'S', searchapi: 'A' }, fetchFn: fn });
  assert.equal(r.fonte, 'searchapi_google_images');
  assert.match(r.trilha[0], /erro HTTP 429/);
});

test('cascata: Imagens vazias nas duas → Shopping como último recurso; tudo vazio → sem resultado com trilha', async () => {
  const { fn } = fetchFalso([
    { trecho: 'serpapi.com/search.json?engine=google_images', json: { images_results: [] } },
    { trecho: 'searchapi.io', json: { images: [] } },
    { trecho: 'engine=google_shopping', json: SHOP },
  ]);
  const r = await buscarImagensGoogle('bmw x6', { chaves: { serpapi: 'S', searchapi: 'A' }, fetchFn: fn });
  assert.equal(r.fonte, 'serpapi_google_shopping');

  const nada = fetchFalso([]);
  const v = await buscarImagensGoogle('x', { chaves: { serpapi: 'S' }, fetchFn: nada.fn });
  assert.deepEqual(v.resultados, []);
  assert.equal(v.trilha.length, 2, 'só as fontes da SerpAPI (sem SearchAPI, sem chave)');
});

test('sem chave nenhuma: não chama ninguém e diz o motivo', async () => {
  const { fn, chamadas } = fetchFalso([]);
  const r = await buscarImagensGoogle('x', { chaves: {}, fetchFn: fn });
  assert.equal(chamadas.length, 0);
  assert.match(r.trilha[0], /sem chave/);
});
