// 🖼️ BANNERS SEMPRE ATUALIZADOS (08/10/2026) — caso do banner da Home que não
// trocava no celular do Luiz nem no de outra usuária, embora o banco já estivesse
// certo. Causa: cache de 10 min no sessionStorage + busca só ao montar a página.
//
// O que se prova aqui:
//   1. o cache guardado é lido em qualquer idade (aparece na hora) e nunca lança;
//   2. a comparação só acusa mudança quando a lista mudou de verdade;
//   3. foco/visibilidade em rajada não martelam o banco (intervalo mínimo);
//   4. as três páginas usam o hook e NENHUMA guarda mais o prazo de validade
//      que segurava a busca.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MINIMO_ENTRE_BUSCAS_MS, INTERVALO_REVALIDACAO_MS,
  lerBannersGuardados, guardarBanners, bannersIguais, deveRevalidar,
} from '../src/lib/bannersAoVivo.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

function storageFalso() {
  const m = new Map();
  return { setItem: (k, v) => m.set(k, String(v)), getItem: (k) => (m.has(k) ? m.get(k) : null), removeItem: (k) => m.delete(k), _m: m };
}

const A = { id: '1', image_url: 'a.webp', order: 1, device_type: 'desktop', title: 'Ar' };
const B = { id: '2', image_url: 'b.webp', order: 2, device_type: 'desktop', title: 'TV' };

test('o cache guardado aparece em qualquer idade e nunca lança', () => {
  const st = storageFalso();
  guardarBanners(st, 'home_banners_cache', [A, B]);
  assert.deepEqual(lerBannersGuardados(st, 'home_banners_cache'), [A, B]);
  assert.equal(st.getItem('home_banners_cache_time'), null, 'a validade antiga some: não manda mais em nada');
  st.setItem('home_banners_cache', '{quebrado');
  assert.equal(lerBannersGuardados(st, 'home_banners_cache'), null);
  assert.equal(lerBannersGuardados(null, 'x'), null);
  assert.doesNotThrow(() => guardarBanners({ setItem() { throw new Error('cheio'); } }, 'x', [A]));
});

test('só acusa mudança quando a lista mudou de verdade', () => {
  assert.equal(bannersIguais([A, B], [{ ...A }, { ...B }]), true, 'mesmas artes = sem re-render');
  assert.equal(bannersIguais([A, B], [B]), false, 'o antigo foi desativado');
  assert.equal(bannersIguais([A], [A, B]), false, 'entrou um novo');
  assert.equal(bannersIguais([A, B], [B, A]), false, 'a ordem do painel mudou');
  assert.equal(bannersIguais([A], [{ ...A, image_url: 'trocada.webp' }]), false, 'a arte foi substituída');
  assert.equal(bannersIguais([], []), true);
  assert.equal(bannersIguais(null, []), true);
});

test('foco e visibilidade em rajada não martelam o banco', () => {
  assert.equal(deveRevalidar({ ultimaBuscaMs: 0 }), true, 'primeira busca sempre');
  const agora = 1_000_000;
  assert.equal(deveRevalidar({ ultimaBuscaMs: agora - 1000, agoraMs: agora }), false);
  assert.equal(deveRevalidar({ ultimaBuscaMs: agora - MINIMO_ENTRE_BUSCAS_MS, agoraMs: agora }), true);
  assert.ok(INTERVALO_REVALIDACAO_MS >= 60_000 && INTERVALO_REVALIDACAO_MS <= 10 * 60_000, 'entre 1 e 10 minutos');
});

test('Home, Tigrinho e Loja usam o hook — e nenhuma guarda mais o prazo que segurava a busca', () => {
  for (const rel of ['../src/pages/Home.jsx', '../src/pages/TigrinhoNoLeilao.jsx', '../src/pages/Catalog.jsx']) {
    const src = semComentarios(ler(rel));
    assert.match(src, /useBannersDoPainel\(\{ contexto: '(home|catalog)'/, `${rel} usa o hook`);
    assert.ok(!src.includes('banners_cache_time'), `${rel} não tem mais prazo de validade do cache`);
    assert.ok(!src.includes('BannerImage.filter({ is_active: true'), `${rel} não busca banner por conta própria`);
  }
  const hook = semComentarios(ler('../src/hooks/useBannersDoPainel.js'));
  assert.match(hook, /addEventListener\('visibilitychange'/, 'revalida ao voltar para o app');
  assert.match(hook, /addEventListener\('focus'/, 'revalida ao voltar para a aba');
  assert.match(hook, /setInterval\(aoVoltar, INTERVALO_REVALIDACAO_MS\)/, 'revalida de tempos em tempos');
});
