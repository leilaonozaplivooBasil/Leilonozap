// 🔗 Para onde o banner leva — e como. Ver src/lib/linkDoBanner.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { destinoDoBanner } from '../src/lib/linkDoBanner.js';

test('sem link não existe destino — a tela não deve oferecer clique', () => {
  for (const vazio of ['', '   ', null, undefined]) {
    assert.equal(destinoDoBanner(vazio), null, `falhou para ${JSON.stringify(vazio)}`);
  }
});

test('caminho nosso já relativo passa direto, como interno', () => {
  assert.deepEqual(destinoDoBanner('/leiloes'), { tipo: 'interno', para: '/leiloes' });
  assert.deepEqual(destinoDoBanner('/Loja-Virtual'), { tipo: 'interno', para: '/Loja-Virtual' });
});

test('🔴 endereço ABSOLUTO do nosso site vira caminho — é o que para de recarregar a aplicação', () => {
  assert.deepEqual(
    destinoDoBanner('https://leilaonozap.net/leiloes'),
    { tipo: 'interno', para: '/leiloes' },
  );
});

test('www e http também são nossos', () => {
  assert.deepEqual(destinoDoBanner('https://www.leilaonozap.net/Loja-Virtual'), { tipo: 'interno', para: '/Loja-Virtual' });
  assert.deepEqual(destinoDoBanner('http://leilaonozap.net/Lucre'), { tipo: 'interno', para: '/Lucre' });
});

test('a busca e a âncora vão junto — o link do banner pode levar a um filtro', () => {
  assert.deepEqual(
    destinoDoBanner('https://leilaonozap.net/Loja-Virtual?categoria=abc#topo'),
    { tipo: 'interno', para: '/Loja-Virtual?categoria=abc#topo' },
  );
});

test('a raiz do nosso site não vira caminho vazio', () => {
  assert.deepEqual(destinoDoBanner('https://leilaonozap.net'), { tipo: 'interno', para: '/' });
});

test('site de fora abre em aba nova', () => {
  assert.deepEqual(
    destinoDoBanner('https://www.mercadolivre.com.br/oferta'),
    { tipo: 'externo', href: 'https://www.mercadolivre.com.br/oferta', novaAba: true },
  );
});

test('🛡️ domínio que só TERMINA parecido com o nosso é de fora', () => {
  const d = destinoDoBanner('https://leilaonozap.net.golpe.com/entrar');
  assert.equal(d.tipo, 'externo', 'leilaonozap.net.golpe.com não é nosso');
  assert.equal(d.novaAba, true);
});

test('WhatsApp e e-mail abrem o aplicativo, sem aba nova', () => {
  assert.deepEqual(destinoDoBanner('https://wa.me/5521984072064'), {
    tipo: 'externo', href: 'https://wa.me/5521984072064', novaAba: true,
  });
  assert.deepEqual(destinoDoBanner('mailto:contato@leilaonozap.net'), {
    tipo: 'externo', href: 'mailto:contato@leilaonozap.net', novaAba: false,
  });
  assert.deepEqual(destinoDoBanner('tel:+5521984072064'), {
    tipo: 'externo', href: 'tel:+5521984072064', novaAba: false,
  });
});

test('🛡️ javascript: nunca vira href — o campo é digitado por gente', () => {
  for (const veneno of ['javascript:alert(1)', '  JavaScript:alert(1)', 'data:text/html,<script>x</script>', 'vbscript:msgbox']) {
    assert.equal(destinoDoBanner(veneno), null, `deixou passar: ${veneno}`);
  }
});

test('texto solto sem barra é tratado como caminho nosso', () => {
  assert.deepEqual(destinoDoBanner('leiloes'), { tipo: 'interno', para: '/leiloes' });
});

test('endereço quebrado não derruba a tela', () => {
  assert.equal(destinoDoBanner('https://'), null);
});
