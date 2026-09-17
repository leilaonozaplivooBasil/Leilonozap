/**
 * 🎬 A FILEIRA DE MÍDIAS DO PRODUTO — foto, foto, …, vídeo por último.
 *
 * Pedido do dono (17/09/2026): vídeo no carrossel de imagens dos produtos em
 * destaque, nas duas páginas.
 *
 * A montagem existia escrita à mão dentro de `AuctionDetails` (#378) e lá
 * custou um bug: `videoDoProduto` devolve `{tipo:'youtube'|'vimeo'|'arquivo'}`
 * e espalhá-lo DEPOIS de `tipo:'video'` sobrescrevia o discriminador — o slide
 * de vídeo não renderizava. Copiar aquele bloco para mais duas telas copiaria a
 * armadilha. Aqui o objeto é montado campo a campo; estes testes travam isso.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { midiasDoProduto, fotosDaFileira } from '../src/lib/midiasDoProduto.js';
import { semComentarios } from './_ajuda.mjs';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const leia = (p) => readFileSync(path.join(RAIZ, p), 'utf8');

const ARQUIVO_NOSSO = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/videos-produtos/uploads/1_ps5.mp4';

// ───────────────────────────── a fileira ─────────────────────────────

test('sem vídeo, a fileira é exatamente a lista de fotos', () => {
  const m = midiasDoProduto({ image_urls: ['a.jpg', 'b.jpg'] });
  assert.deepEqual(m, [{ tipo: 'foto', url: 'a.jpg' }, { tipo: 'foto', url: 'b.jpg' }]);
});

test('🔴 o vídeo entra POR ÚLTIMO — a capa continua sendo foto', () => {
  const m = midiasDoProduto({ image_urls: ['a.jpg', 'b.jpg'], video_urls: [ARQUIVO_NOSSO] });
  assert.equal(m.length, 3);
  assert.equal(m[0].tipo, 'foto', 'a capa precisa ser foto: é ela que carrega rápido e aparece na busca');
  assert.equal(m[m.length - 1].tipo, 'video');
});

test('🔴 `tipo` e `origem` NÃO disputam o mesmo nome (o bug da #378)', () => {
  const [video] = midiasDoProduto({ image_urls: [], video_urls: [ARQUIVO_NOSSO] });
  assert.equal(video.tipo, 'video', 'o discriminador de foto/vídeo');
  assert.equal(video.origem, 'arquivo', 'o que decide <video> ou <iframe>');
  assert.equal(video.embed, ARQUIVO_NOSSO);
});

test('YouTube vira origem youtube com endereço de embed', () => {
  const [v] = midiasDoProduto({ image_urls: [], video_urls: ['https://www.youtube.com/watch?v=abc12345678'] });
  assert.equal(v.origem, 'youtube');
  assert.match(v.embed, /^https:\/\/www\.youtube\.com\/embed\//);
});

test('🔴 host fora da lista branca não entra na fileira', () => {
  const m = midiasDoProduto({ image_urls: ['a.jpg'], video_urls: ['https://site-qualquer.example/v.mp4'] });
  assert.equal(m.length, 1, 'endereço de host desconhecido não pode virar <iframe> na loja');
  assert.equal(m[0].tipo, 'foto');
});

test('produto sem nada devolve fileira vazia, sem quebrar', () => {
  assert.deepEqual(midiasDoProduto(null), []);
  assert.deepEqual(midiasDoProduto({}), []);
  assert.deepEqual(midiasDoProduto({ image_urls: 'não é lista' }), []);
});

test('foto vazia ou em branco não vira slide fantasma', () => {
  const m = midiasDoProduto({ image_urls: ['a.jpg', '', '   ', null, 'b.jpg'] });
  assert.equal(m.length, 2);
});

test('fotosDaFileira separa o que o "ampliar" pode usar', () => {
  const m = midiasDoProduto({ image_urls: ['a.jpg'], video_urls: [ARQUIVO_NOSSO] });
  assert.equal(fotosDaFileira(m).length, 1);
  assert.equal(fotosDaFileira(null).length, 0);
});

// ──────────────────── as duas telas usam a mesma fileira ────────────────────

const MODAL = semComentarios(leia('src/components/catalog/ProductDetailsModal.jsx'));
const PAGINA = semComentarios(leia('src/pages/CatalogProductDetails.jsx'));

for (const [nome, FONTE] of [['o modal do card', MODAL], ['a página de link', PAGINA]]) {
  test(`🔴 ${nome} gira pelas MÍDIAS, não pelas fotos`, () => {
    // girar por fotos deixa o último slide (o vídeo) inalcançável pelas setas
    assert.match(FONTE, /midiasDoProduto\(product\)/);
    assert.doesNotMatch(FONTE, /images\.length - 1 \? 0 : prev \+ 1/);
    assert.doesNotMatch(FONTE, /prev === 0 \? images\.length - 1/);
  });

  test(`${nome} desenha a mídia pelo QuadroDeMidia`, () => {
    assert.match(FONTE, /<QuadroDeMidia\s+midia=\{midiaAtual\}/);
  });

  test(`🔎 ${nome} só oferece "ampliar" quando a mídia é foto`, () => {
    // em vídeo, a camada preta cobriria os controles do player
    assert.match(FONTE, /currentImage\s*&&\s*\(\s*\n?\s*<button onClick=\{\(\) => setShowFullscreen\(true\)\}/);
    assert.match(FONTE, /midiaAtual && midiaAtual\.tipo === 'foto' \? midiaAtual\.url : null/);
  });
}

test('🟢 a página de link não tem mais o player solto embaixo da foto', () => {
  assert.doesNotMatch(PAGINA, /PlayerDeVideo/,
    'o vídeo agora mora na fileira; deixar os dois mostraria o mesmo vídeo duas vezes');
});

test('🔇 o QuadroDeMidia nunca toca sozinho', () => {
  const Q = semComentarios(leia('src/components/catalog/QuadroDeMidia.jsx'));
  assert.doesNotMatch(Q, /autoPlay/, 'vitrine que fala sozinha faz a pessoa fechar a aba');
  assert.match(Q, /preload="metadata"/);
  assert.match(Q, /controls/);
});
