// 🏷️ Categoria obrigatória + sugestão pela IA (08/09/2026).
//
// O que estes testes seguram:
//  1. a regra do obrigatório vale no CREATE e no formulário completo, mas NÃO
//     nas ações rápidas (setField) — senão "tirar da vitrine" quebraria;
//  2. a IA não consegue inventar categoria: nome fora da lista vira nada;
//  3. a trava está na ROTA, não só na tela.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  faltaCategoria, escolhaValida, normalizar, sistemaDoClassificador,
  AVISO_CATEGORIA, CONFIANCA_MINIMA, LIMITE_DESCRICAO,
} from '../src/lib/sugestaoDeCategoria.js';

/** Tira comentários pra assertiva não casar com a explicação do bug. */
const semComentarios = (txt) =>
  txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const CATS = [
  { id: 'c1', name: 'Eletrônicos' },
  { id: 'c2', name: 'Casa & Construção' },
  { id: 'c3', name: 'Ferramentas' },
];

test('produto novo sem categoria é recusado', () => {
  assert.equal(faltaCategoria({ action: 'create', fields: {} }), true);
  assert.equal(faltaCategoria({ action: 'create', fields: { category_id: '' } }), true);
  assert.equal(faltaCategoria({ action: 'create', fields: { category_id: '   ' } }), true);
  assert.equal(faltaCategoria({ action: 'create', fields: { category_id: 'c1' } }), false);
});

test('o formulário completo de edição também exige', () => {
  // o formulário SEMPRE manda category_id (null quando vazio)
  assert.equal(faltaCategoria({ action: 'update', fields: { description: 'x', category_id: null } }), true);
  assert.equal(faltaCategoria({ action: 'update', fields: { description: 'x', category_id: 'c2' } }), false);
});

test('ação rápida não é afetada — senão "tirar da vitrine" quebra', () => {
  assert.equal(faltaCategoria({ action: 'setField', fields: { catalog_active: false } }), false);
  assert.equal(faltaCategoria({ action: 'setField', fields: { linked_auctions: [] } }), false);
  assert.equal(faltaCategoria({ action: 'update', fields: { description: 'só a descrição' } }), false);
  assert.equal(faltaCategoria({ action: 'zerarEstoque', fields: {} }), false);
  assert.equal(faltaCategoria({ action: 'delete', fields: {} }), false);
});

test('a IA não inventa categoria: nome fora da lista vira nada', () => {
  assert.equal(escolhaValida('Brinquedos', CATS), null);
  assert.equal(escolhaValida('', CATS), null);
  assert.equal(escolhaValida(null, CATS), null);
  assert.equal(escolhaValida('Eletrônicos', []), null);
});

test('acento e caixa não atrapalham o casamento do nome', () => {
  assert.deepEqual(escolhaValida('eletronicos', CATS), { category_id: 'c1', name: 'Eletrônicos' });
  assert.deepEqual(escolhaValida('  CASA & CONSTRUCAO ', CATS), { category_id: 'c2', name: 'Casa & Construção' });
  assert.equal(normalizar('Ferramentas'), 'ferramentas');
});

test('o prompt lista as categorias que vieram do banco, não uma lista fixa', () => {
  const p = sistemaDoClassificador(CATS);
  for (const c of CATS) assert.ok(p.includes(c.name), `faltou ${c.name}`);
  assert.ok(!p.includes('Brinquedos'), 'listou categoria que não veio do banco');
  // categoria sem id ou sem nome não entra na lista
  assert.ok(!sistemaDoClassificador([{ id: '', name: 'Fantasma' }]).includes('Fantasma'));
});

test('o prompt ensina os erros que a regra de palavra-chave cometeu', () => {
  const p = sistemaDoClassificador(CATS).toLowerCase();
  assert.ok(p.includes('sem costura'), 'não avisa do "cueca sem costura"');
  assert.ok(p.includes('titanio') || p.includes('titânio'), 'não avisa do "taça Titanio"');
  assert.ok(p.includes('confianca 0') || p.includes('vazia'), 'não manda admitir quando não sabe');
});

test('a trava está na ROTA, não só na tela', () => {
  const rota = semComentarios(readFileSync(new URL('../api/functions/productAdminAction.js', import.meta.url), 'utf8'));
  assert.ok(rota.includes('faltaCategoria'), 'a rota parou de exigir categoria');
  // precisa valer no create E no update, não em um só
  assert.equal((rota.match(/faltaCategoria\(/g) || []).length, 2, 'a rota checa em menos de dois lugares');
  assert.ok(rota.includes('AVISO_CATEGORIA'), 'a rota inventou mensagem própria em vez da compartilhada');
});

test('a tela recusa antes de a pessoa perder o preenchimento', () => {
  const tela = semComentarios(readFileSync(new URL('../src/pages/ProductManagement.jsx', import.meta.url), 'utf8'));
  assert.ok(tela.includes('AVISO_CATEGORIA'), 'a tela parou de avisar');
  assert.ok(!tela.includes('— sem categoria —'), 'a opção "sem categoria" voltou ao seletor');
  assert.ok(tela.includes('pedirSugestaoDeCategoria'), 'a sugestão sumiu da tela');
  assert.ok(tela.includes('onBlur={pedirSugestaoDeCategoria}'), 'a sugestão deixou de ser disparada');
});

test('a sugestão nunca escreve por cima de escolha humana', () => {
  const tela = semComentarios(readFileSync(new URL('../src/pages/ProductManagement.jsx', import.meta.url), 'utf8'));
  const i = tela.indexOf('const pedirSugestaoDeCategoria');
  assert.ok(i > 0, 'a função sumiu');
  const corpo = tela.slice(i, i + 1200);
  assert.ok(/if \(formData\.category_id \|\| /.test(corpo), 'deixou de sair cedo quando já há categoria');
  assert.ok(corpo.includes('f.category_id ? f :'), 'passou a sobrescrever a categoria já escolhida');
});

test('a rota de sugestão nunca derruba o cadastro', () => {
  const rota = semComentarios(readFileSync(new URL('../api/functions/sugerirCategoria.js', import.meta.url), 'utf8'));
  assert.ok(!/res\.status\(5\d\d\)/.test(rota), 'a rota passou a devolver 5xx e trava a tela');
  assert.ok(rota.includes('escolhaValida'), 'a rota parou de conferir o nome devolvido pela IA');
  assert.ok(rota.includes('parent_category_id=is.null'), 'passou a oferecer subcategoria, que a tela não lista');
  assert.ok(rota.includes('is_active=is.true'), 'passou a oferecer categoria desativada');
});

test('os números da regra são um só, compartilhados', () => {
  assert.equal(typeof AVISO_CATEGORIA, 'string');
  assert.ok(AVISO_CATEGORIA.length > 20);
  assert.equal(CONFIANCA_MINIMA, 70);
  assert.equal(LIMITE_DESCRICAO, 400);
});
