// 📦 Crédito em produtos da adesão (26/09/2026) — o caso da Parceira com R$ 5.000 a escolher.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('📦 o painel mostra o crédito em produtos e leva para a tela de escolha', () => {
  const C = ler('../src/components/licensing/CreditoProdutosCard.jsx');
  assert.match(C, /seller_credit_balance/);
  assert.match(C, /if \(!\(credito > 0\)\) return null/, 'sem crédito, não aparece');
  assert.match(C, /navigate\('\/VendedorEscolherProdutos'\)/);
  const L = ler('../src/pages/Licensing.jsx');
  assert.match(L, /<CreditoProdutosCard user=\{user\} \/>/);
});

test('🎖️ o painel reconhece os cargos de rede pagos (parceiro, ponto de retirada, loja física)', () => {
  const L = ler('../src/pages/Licensing.jsx');
  assert.match(L, /'parceiro': 'Parceiro', 'ponto_retirada': 'Ponto de Retirada', 'loja_fisica': 'Loja Física'/);
  assert.match(L, /careerHierarchy = \[.*'parceiro', 'licenciado', 'vendedor', 'influenciador', 'usuario'\]/);
  assert.match(L, /\['licenciado', 'parceiro', 'ponto_retirada', 'loja_fisica', 'trainee_diretor'/, 'Parceiro+ divulga a Loja Virtual, não o App');
  assert.match(L, /'parceiro': 'um Parceiro'/);
});

test('🔒 escolher os produtos do crédito não rebaixa quem já é Parceiro ou acima', () => {
  const F = ler('../api/functions/finalizeSellerOrder.js');
  assert.match(F, /CARGOS_ACIMA = \['parceiro', 'ponto_retirada', 'loja_fisica', 'distribuidor'\]/);
  assert.match(F, /const cargoFinal = cargoQueJaTem \|\| cargo;/);
  assert.match(F, /new Set\(\[\.\.\.\(user\.career_levels \|\| \[\]\), cargoFinal\]\)/);
  assert.doesNotMatch(F, /new Set\(\[\.\.\.\(user\.career_levels \|\| \[\]\), cargo\]\)/);
  const E = ler('../src/pages/VendedorEscolherProdutos.jsx');
  assert.match(E, /Seus produtos entram no estoque da sua loja de/);
});
