// A loja e o depósito contam estoque em dois lugares que não conversam:
//   • products.quantity  → é o que a loja usa e o que a venda desconta
//   • qty_perfeito/bom/oficina/ruim → contagem física, só muda quando alguém digita
// Cada venda derruba o primeiro e não encosta no segundo. Eles se afastam sozinhos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const diag = ler('../api/functions/diagLojaSemEstoque.js');
const baixa = ler('../api/_lib/baixaEstoque.js');
const rpc = ler('../supabase/migrations/20260821e_estoque_baixa_atomica.sql');
const cadastro = ler('../src/pages/AddCatalogProduct.jsx');

test('o relatório é somente leitura', () => {
  // Nenhum verbo de escrita. Se um dia alguém acrescentar, este teste quebra.
  assert.ok(!/method:\s*'(POST|PATCH|PUT|DELETE)'/.test(diag), 'apareceu escrita no relatório');
  assert.match(diag, /somente_leitura:/);
});

test('o relatório exige a chave de diagnóstico', () => {
  assert.match(diag, /body\.key !== process\.env\.DIAG_KEY/);
});

test('a venda desconta quantity e NÃO desconta a contagem física', () => {
  // É esta a origem da divergência. Se mudar, o relatório precisa mudar junto.
  assert.match(rpc, /set quantity = p\.quantity - _qty/);
  assert.ok(!/qty_perfeito|qty_bom|qty_oficina|qty_ruim/.test(rpc), 'a RPC passou a mexer na classificação — rever o relatório');
  assert.match(baixa, /rpc\/baixar_estoque_central/);
});

test('cadastro manual grava quantidade e não grava classificação', () => {
  // É por isso que o relatório separa "veio de lote" de "cadastro manual":
  // sem essa separação, uma regra automática esconderia produto bom da loja.
  assert.match(cadastro, /quantity: parseInt\(formData\.quantity\)/);
  assert.ok(!/qty_perfeito/.test(cadastro), 'o cadastro passou a gravar classificação — a separação do relatório perdeu o sentido');
});

test('o caso grave só conta produto vindo de lote', () => {
  assert.match(diag, /num\(p\.quantity\) > 0 && fisico\(p\) === 0 && p\.lot/);
  assert.match(diag, /num\(p\.quantity\) > 0 && fisico\(p\) === 0 && !p\.lot/);
});

test('reserva ativa vencida não conta como peça prometida', () => {
  assert.match(diag, /status=eq\.ativa&owner_id=is\.null&expira_em=gt\./);
});

// Réplica das regras, para provar o efeito e não só o texto do arquivo.
const num = (v) => Number(v) || 0;
const fisico = (p) => num(p.qty_perfeito) + num(p.qty_bom) + num(p.qty_oficina) + num(p.qty_ruim);
const grave = (p) => p.catalog_active === true && num(p.quantity) > 0 && fisico(p) === 0 && !!p.lot;

test('o efeito: peça de lote à venda sem contagem física é acusada', () => {
  assert.equal(grave({ catalog_active: true, quantity: 3, lot: 'L-99', qty_perfeito: 0, qty_bom: 0 }), true);
});

test('o efeito: cadastro manual sem classificação NÃO é acusado', () => {
  // Este é o falso positivo que esconderia produto bom da loja.
  assert.equal(grave({ catalog_active: true, quantity: 3, lot: null, qty_perfeito: 0 }), false);
});

test('o efeito: peça de lote com contagem física bate, não é acusada', () => {
  assert.equal(grave({ catalog_active: true, quantity: 3, lot: 'L-99', qty_perfeito: 2, qty_bom: 1 }), false);
});

test('o efeito: fora da loja nunca é acusado, mesmo zerado', () => {
  assert.equal(grave({ catalog_active: false, quantity: 5, lot: 'L-99', qty_perfeito: 0 }), false);
});

// ── A paginação: o erro que a primeira rodada real denunciou ──────────────────
// Ordenar por `updated_date` com milhares de linhas gravadas no mesmo segundo
// faz o banco devolver ordem instável entre páginas: o mesmo produto vem duas
// vezes e outro nunca vem. "Cinta Modeladora", "TOALHA UNID." e "Jogo De Lençol"
// vieram duplicados, com o mesmo id.

test('a leitura pagina por id, que não empata', () => {
  assert.match(diag, /&order=id\.asc&limit=\$\{PAGINA\}&offset=/);
  assert.ok(!/order=updated_date/.test(diag), 'voltou a paginar por data — duplica e pula');
});

test('id repetido é descartado, como segunda rede', () => {
  assert.match(diag, /const porId = new Map\(\);/);
  assert.match(diag, /porId\.set\(linha\.id/);
});

test('a busca de reservas traz o id, senão a limpeza por id descarta tudo', () => {
  assert.match(diag, /estoque_reservas\?select=id,product_id,qty/);
});

// Réplica do efeito da paginação instável, para provar e não só descrever.
function juntarComDedupe(paginas) {
  const porId = new Map();
  for (const pagina of paginas) for (const linha of pagina) porId.set(linha.id, linha);
  return [...porId.values()];
}

test('o efeito: página que repete um registro não infla a contagem', () => {
  const paginaA = [{ id: 'p1' }, { id: 'p2' }];
  const paginaB = [{ id: 'p2' }, { id: 'p3' }]; // p2 repetido — foi o que aconteceu
  assert.equal(paginaA.length + paginaB.length, 4, 'sem limpeza, contava 4');
  assert.equal(juntarComDedupe([paginaA, paginaB]).length, 3, 'com limpeza, são 3 produtos');
});

// ── Produto marcado VENDIDO que continua comprável ───────────────────────────
const aindaAVenda = (p) => p.catalog_active === true && /VENDID/i.test(String(p.status || '')) && num(p.quantity) > 0;

test('o relatório acusa produto marcado VENDIDO que segue comprável', () => {
  assert.match(diag, /\/VENDID\/i\.test\(String\(p\.status \|\| ''\)\) && num\(p\.quantity\) > 0/);
});

test('o efeito: VENDIDO e VENDIDO PIX contam; ESTOQUE não', () => {
  // Casos reais da primeira rodada.
  assert.equal(aindaAVenda({ catalog_active: true, status: 'VENDIDO', quantity: 1 }), true);
  assert.equal(aindaAVenda({ catalog_active: true, status: 'VENDIDO PIX', quantity: 1 }), true);
  assert.equal(aindaAVenda({ catalog_active: true, status: 'ESTOQUE', quantity: 1 }), false);
  assert.equal(aindaAVenda({ catalog_active: true, status: 'VENDIDO', quantity: 0 }), false);
  assert.equal(aindaAVenda({ catalog_active: false, status: 'VENDIDO', quantity: 5 }), false);
});
