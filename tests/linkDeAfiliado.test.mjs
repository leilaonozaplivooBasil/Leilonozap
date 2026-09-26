// 🔗 Todo compartilhar sai com o código de afiliado de quem compartilha (26/09/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { codigoDoAfiliado, linkComAfiliado } from '../src/lib/linkDeAfiliado.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('👤 logado: o próprio código; sem código: cai no link que trouxe; sem nada: vazio', () => {
  assert.equal(codigoDoAfiliado({ referral_code: 'luciano123' }), 'luciano123');
  assert.equal(codigoDoAfiliado({ referral_code: ' otavio9 ' }), 'otavio9');
  // sem localStorage no Node, e sem usuário: nada
  assert.equal(codigoDoAfiliado(null), '');
});

test('🔗 o link ganha ?ref= (ou &ref=) e não duplica', () => {
  assert.equal(linkComAfiliado('https://leilaonozap.net/l/abc', 'luciano123'), 'https://leilaonozap.net/l/abc?ref=luciano123');
  assert.equal(linkComAfiliado('https://leilaonozap.net/p/x?utm=1', 'otavio9'), 'https://leilaonozap.net/p/x?utm=1&ref=otavio9');
  assert.equal(linkComAfiliado('https://leilaonozap.net/l/abc?ref=ja', 'outro'), 'https://leilaonozap.net/l/abc?ref=ja');
  assert.equal(linkComAfiliado('https://leilaonozap.net/l/abc', ''), 'https://leilaonozap.net/l/abc');
  assert.equal(linkComAfiliado('https://leilaonozap.net/l/abc', 'a b'), 'https://leilaonozap.net/l/abc?ref=a%20b');
});

test('📤 todos os pontos de compartilhar passam pelo link com afiliado', () => {
  for (const f of ['../src/components/auction/AuctionCard.jsx', '../src/pages/AuctionRoom.jsx', '../src/components/comparai/CompareAquiModal.jsx', '../src/components/catalog/CatalogProductCard.jsx']) {
    const S = ler(f);
    assert.match(S, /import \{ linkComAfiliado \} from '@\/lib\/linkDeAfiliado';/, f);
    assert.doesNotMatch(S, /const productUrl = `\$\{window\.location\.origin\}\/(l|p)\/\$\{/, `${f}: link sem afiliado`);
  }
  const C = ler('../src/components/catalog/CatalogProductCard.jsx');
  assert.doesNotMatch(C, /getReferral\(\)/, 'a loja usava só o código de quem TROUXE o visitante; agora é o de quem compartilha');
});
