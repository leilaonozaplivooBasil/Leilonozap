// 🧾 A ficha do leilão sai da origem — ver src/lib/fichaDoLeilao.js.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fichaDoLeilao, FICHAS } from '../src/lib/fichaDoLeilao.js';
import { ORIGENS } from '../src/lib/origemProduto.js';

describe('a ficha pela origem', () => {
  test('🔴 novo de fábrica: direto de fábrica, lacrado, COM garantia, sem asterisco', () => {
    const f = fichaDoLeilao({ product_source: 'factory_new' });
    assert.equal(f.origem, 'Direto de Fábrica');
    assert.equal(f.condicao, 'Novo e lacrado');
    assert.equal(f.garantia, 'Garantia de fábrica');
    assert.equal(f.notaRodape, null);
    assert.equal(f.selo.titulo, 'Produto Novo');
    assert.equal(f.ehNovo, true);
    assert.doesNotMatch(f.garantia + f.selo.texto, /[Ss]em garantia|Testado/);
  });
  test('devolução: o texto de sempre, com o asterisco e o selo de testado', () => {
    const f = fichaDoLeilao({ product_source: 'return_resale' });
    assert.equal(f.origem, 'Arremate & Devoluções');
    assert.equal(f.condicao, 'Testado e Funcional');
    assert.equal(f.garantia, 'Sem Garantia*');
    assert.match(f.notaRodape, /sem garantia de fábrica/);
    assert.equal(f.selo.titulo, 'Produto Testado');
    assert.equal(f.ehNovo, false);
  });
  test('sem origem (ou origem estranha) cai em devolução — a promessa menor, nunca "novo"', () => {
    for (const l of [{}, null, { product_source: null }, { product_source: 'xyz' }]) {
      const f = fichaDoLeilao(l);
      assert.equal(f.garantia, 'Sem Garantia*'); assert.equal(f.ehNovo, false);
      assert.equal(f.origem, 'Arremate & Devoluções');
    }
  });
  test('o rótulo da origem é o do vocabulário único (origemProduto), não uma cópia', () => {
    for (const o of ORIGENS) assert.equal(fichaDoLeilao({ product_source: o.valor }).origem, o.rotulo);
  });
  test('toda origem do vocabulário tem ficha', () => {
    for (const o of ORIGENS) assert.ok(FICHAS[o.valor], `falta ficha para ${o.valor}`);
  });
});
