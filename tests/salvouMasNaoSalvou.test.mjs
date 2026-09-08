// 🔴 "SALVOU MAS NÃO SALVOU" — a Gestão de Estoque confirmando o que não gravou.
//
// O CHAMADO (Beatriz, 08/09/2026): "eu tinha mudado a categoria dos produtos no
// app / agora está tudo zerado".
//
// A AUDITORIA: nada foi apagado. Nenhuma linha de `products` tinha sido escrita
// desde 06/09 23:18 — dois dias antes. O trabalho dela nunca chegou ao banco, e
// a tela dizia "Produto atualizado!" a cada produto.
//
// A CAUSA: o PostgREST devolve 200 mesmo quando 0 linhas casam com o filtro. A
// rota já sabia disso — havia comentário e trava escritos em 06/09 — mas a
// trava só rodava no `zerarEstoque`. O `update`, por onde passa TODA edição da
// Gestão de Estoque, devolvia sucesso sem conferir nada.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { camposQueNaoGravaram } from '../api/functions/productAdminAction.js';

const ROTA = fs.readFileSync(new URL('../api/functions/productAdminAction.js', import.meta.url), 'utf8');
// a rota tem DELETE e PATCH no mesmo formato de URL; ancorar no PATCH, senão a
// asserção mede o trecho errado e passa (ou falha) por engano
const DEPOIS_DO_PATCH = ROTA.slice(ROTA.indexOf("method: 'PATCH', headers: { Prefer: 'return=representation' }"));

// ── o caso da Beatriz ────────────────────────────────────────────────
test('categoria pedida que NÃO volta do banco é denunciada', () => {
  const patch = { category_id: 'abc123', updated_date: '2026-09-08T10:00:00Z' };
  const linha = { id: 'p1', category_id: null };
  assert.deepEqual(camposQueNaoGravaram(patch, linha), ['category_id']);
});

test('categoria que volta igual passa limpo', () => {
  const patch = { category_id: 'abc123', updated_date: 'x' };
  assert.deepEqual(camposQueNaoGravaram(patch, { category_id: 'abc123' }), []);
});

test('campo descartado em silêncio pela lista ALLOWED também é pego', () => {
  // o defeito que escondeu category_id até 01/09 e condicao até 02/09: o campo
  // some antes do PATCH, a linha volta sem ele, e ninguém era avisado
  const patch = { condicao: 'bom' };
  assert.deepEqual(camposQueNaoGravaram(patch, { id: 'p1' }), ['condicao']);
});

// ── o que NÃO pode virar alarme falso ────────────────────────────────
test('o carimbo updated_date nunca conta — é nosso, não do usuário', () => {
  assert.deepEqual(camposQueNaoGravaram({ updated_date: 'a' }, { updated_date: 'b' }), []);
});

test('lista e objeto ficam de fora: ordem diferente não é erro', () => {
  const patch = { image_urls: ['a', 'b'], linked_auctions: [{ id: 1 }] };
  assert.deepEqual(camposQueNaoGravaram(patch, { image_urls: ['b', 'a'], linked_auctions: [] }), []);
});

test('número como texto é o mesmo valor — 150 e "150" não divergem', () => {
  assert.deepEqual(camposQueNaoGravaram({ quantity: 150 }, { quantity: '150' }), []);
  assert.deepEqual(camposQueNaoGravaram({ selling_price_retail: '19.90' }, { selling_price_retail: 19.9 }), []);
});

test('vazio é vazio: null, undefined e string vazia são a mesma coisa', () => {
  assert.deepEqual(camposQueNaoGravaram({ category_id: null }, { category_id: '' }), []);
  assert.deepEqual(camposQueNaoGravaram({ notes: '' }, { notes: null }), []);
});

test('mas limpar um campo que o banco NÃO limpou é denunciado', () => {
  // tirar a categoria e ela continuar lá é falha de gravação igual
  assert.deepEqual(camposQueNaoGravaram({ category_id: null }, { category_id: 'abc' }), ['category_id']);
});

test('valor trocado por outro diferente é denunciado', () => {
  assert.deepEqual(camposQueNaoGravaram({ quantity: 0 }, { quantity: 5 }), ['quantity']);
  assert.deepEqual(camposQueNaoGravaram({ status: 'VENDIDO' }, { status: 'ESTOQUE' }), ['status']);
});

test('vários campos errados saem todos na mesma mensagem', () => {
  const fora = camposQueNaoGravaram(
    { category_id: 'x', condicao: 'bom', quantity: 3 },
    { category_id: null, condicao: null, quantity: 3 },
  );
  assert.deepEqual(fora.sort(), ['category_id', 'condicao']);
});

test('entradas quebradas não derrubam a rota', () => {
  assert.deepEqual(camposQueNaoGravaram(null, null), []);
  assert.deepEqual(camposQueNaoGravaram({}, {}), []);
  assert.deepEqual(camposQueNaoGravaram({ a: 1 }, null), ['a']);
});

// ── a rota usa mesmo isso, e para TODA atualização ───────────────────
test('a conferência roda no update, não só no zerarEstoque', () => {
  const posConfere = DEPOIS_DO_PATCH.indexOf('camposQueNaoGravaram(patch, linha)');
  const posZerar = DEPOIS_DO_PATCH.indexOf("action === 'zerarEstoque'");
  assert.ok(posConfere > 0, 'a conferência sumiu');
  assert.ok(posConfere < posZerar, 'a conferência voltou a ficar presa dentro do zerarEstoque');
});

test('0 linhas afetadas deixa de virar sucesso', () => {
  assert.match(ROTA, /if \(!linha\) \{[\s\S]{0,200}success: false/);
  assert.match(ROTA, /0 linhas afetadas/);
});

test('o corpo da resposta do PATCH é lido UMA vez só', () => {
  // ler r.json() duas vezes estoura em runtime e ninguém veria em teste de unidade
  assert.equal((DEPOIS_DO_PATCH.match(/await r\.json\(\)/g) || []).length, 1);
});

test('a mensagem de erro diz QUAL campo não gravou — genérico não ajuda ninguém', () => {
  assert.match(ROTA, /Nada foi salvo em: \$\{naoGravaram\.join\(', '\)\}/);
  assert.match(ROTA, /campos_nao_gravados/);
});
