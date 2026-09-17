// 📱 (17/09/2026) — cartão da Loja Virtual no celular: nome em cima, faixa de
// entrega embaixo; o carrinho anda só dentro da faixa. Dono: "o caminhão andando
// no celular fica feio; equalizar, botar um embaixo do outro."
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('no celular o cartão tem faixa própria de entrega e o carrinho usa as âncoras dela', () => {
  const s = ler('../src/components/catalog/CartaoLojaVirtual.jsx');
  assert.match(s, /window\.matchMedia\('\(min-width: 640px\)'\)/);
  assert.match(s, /inicioRef=\{desktop \? inicioRef : pistaInicioRef\}/);
  assert.match(s, /fimRef=\{desktop \? compartilharRef : pistaFimRef\}/);
  assert.match(s, /textoNoMeio=\{desktop\}/);
  assert.match(s, /<div className="sm:hidden mt-2 pt-2 border-t border-gray-700\/60 flex items-center gap-1\.5 text-\[11px\] text-gray-400">/);
  assert.match(s, /<span ref=\{pistaInicioRef\}>Envio para todo Brasil<\/span>/);
  // o nome pode quebrar em 2 linhas no celular em vez de ser cortado
  assert.match(s, /line-clamp-2 sm:line-clamp-none sm:truncate/);
});

test('a animação só desenha o texto centralizado quando pedido (desktop)', () => {
  const s = ler('../src/components/catalog/CarrinhoEntrega.jsx');
  assert.match(s, /textoNoMeio = true, entradaY = -34/);
  assert.match(s, /\{textoNoMeio && \(\s*\n\s*<motion\.div\s*\n\s*key=\{`envio-\$\{ciclo\}`\}/);
  assert.match(s, /y: \[entradaY, 0, 0, 0\]/);
});
