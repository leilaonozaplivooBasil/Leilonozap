// buscaFotos — leitura única da resposta das rotas de busca de imagem
// (DIR-44). Mesma semântica do processarResposta do BuscadorFotos (PONTO 77).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { lerRespostaFotos } from '../src/lib/buscaFotos.js';

describe('lerRespostaFotos', () => {
  test('shape da rota Vercel: { success, images, query_usada }', () => {
    const r = lerRespostaFotos({ success: true, images: ['https://a/1.jpg', 'https://a/2.jpg'], query_usada: 'bmw x6' });
    assert.deepEqual(r.urls, ['https://a/1.jpg', 'https://a/2.jpg']);
    assert.equal(r.queryUsada, 'bmw x6');
    assert.equal(r.erro, null);
  });

  test('shape antigo do Deno: { products: [{ imageUrl }] }, aninhado em .data', () => {
    const r = lerRespostaFotos({ data: { products: [{ imageUrl: 'https://b/1.png' }, { image: 'https://b/2.png' }] } });
    assert.deepEqual(r.urls, ['https://b/1.png', 'https://b/2.png']);
  });

  test('dedupe e filtro: só http(s), sem repetida, sem lixo', () => {
    const r = lerRespostaFotos({ images: ['https://a/1.jpg', 'https://a/1.jpg', 'data:image/png;base64,x', null, 'ftp://x/y'] });
    assert.deepEqual(r.urls, ['https://a/1.jpg']);
  });

  test('"não achei" ≠ "a busca falhou" — a distinção honesta', () => {
    const semResultado = lerRespostaFotos({ success: false, images: [], motivo: 'sem_resultado', query_usada: 'xyz' });
    assert.equal(semResultado.erro.tipo, 'sem_resultado');
    assert.equal(semResultado.queryUsada, 'xyz');

    const falhou = lerRespostaFotos({ success: false, images: [], motivo: 'falha_busca', error: 'cota esgotada' });
    assert.equal(falhou.erro.tipo, 'falha_busca');
    assert.ok(falhou.erro.mensagem.includes('cota'));
  });

  test('resposta vazia/nula não explode', () => {
    assert.equal(lerRespostaFotos(null).erro.tipo, 'sem_resultado');
    assert.equal(lerRespostaFotos({}).erro.tipo, 'sem_resultado');
  });
});
