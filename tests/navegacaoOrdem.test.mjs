// A ordem dos ícones é UMA conta pro desktop e pro celular (06/09/2026).
//
// Dono: "no celular não estou conseguindo arrastar de forma simples os
// ícones, como no computador". O celular agora lê a mesma lista achatada e a
// mesma ordem guardada que a lateral do desktop. Estes testes cravam a conta
// pura — quem já arrumou os ícones não pode perder nada, item novo nunca
// pode sumir, e o arrastar move exatamente um item.
import test from 'node:test';
import assert from 'node:assert/strict';
import { achatarItens, aplicarOrdem, moverItem, chaveOrdemDe, ITENS_OCULTOS } from '../src/lib/navegacaoOrdem.js';
import { getLicensingGroups, chaveDoItem } from '../src/lib/licensingTabs.js';

const ADMIN = { id: 'u1', email: 'a@x.com', role: 'admin', career_levels: ['usuario'] };
const COMUM = { id: 'u2', email: 'b@x.com', role: 'user', career_levels: ['usuario'] };

test('achatarItens: vira lista única, cada item com chave estável e o bloco de origem', () => {
  const lista = achatarItens(ADMIN);
  assert.ok(lista.length > 3);
  const chaves = lista.map((i) => i.chave);
  assert.equal(new Set(chaves).size, chaves.length, 'chave repetida');
  for (const item of lista) {
    assert.equal(typeof item.chave, 'string');
    assert.equal(typeof item.grupo, 'number');
    assert.equal(typeof item.titulo, 'string');
    // 06/09/2026 — a Top College (`sempre`) é grupo mesmo com um destino: o botão fica, e ao clicar aparece só a X-EOS
    if (item.type === 'group') assert.ok(item.subItens.length > 1 || item.sempre, `grupo ${item.label} com ${item.subItens.length} destino`);
  }
});

test('achatarItens: os duplicados escondidos não aparecem — nem soltos, nem dentro de grupo', () => {
  for (const user of [ADMIN, COMUM]) {
    const lista = achatarItens(user);
    for (const oculto of ITENS_OCULTOS) {
      assert.ok(!lista.some((i) => i.chave === oculto), `${oculto} solto`);
      assert.ok(!lista.some((i) => (i.subItens || []).some((s) => s.to === oculto)), `${oculto} dentro de grupo`);
    }
  }
});

test('achatarItens: quem não é admin não alcança o Consignado (a regra de cargo é a de sempre)', () => {
  const alcanca = (user) => achatarItens(user).some((i) => i.chave === '/painel/consignado' || (i.subItens || []).some((s) => s.to === '/painel/consignado'));
  assert.equal(alcanca(ADMIN), true);
  assert.equal(alcanca(COMUM), false);
});

test('achatarItens: grupo colapsado que sobrou com 1 item NÃO vira menu — vira o item direto (menos a Top College, que é `sempre` grupo)', () => {
  const grupos = getLicensingGroups(COMUM);
  const lista = achatarItens(COMUM);
  for (const g of grupos) {
    if (!g.colapsar) continue;
    const visiveis = g.items.filter((i) => !ITENS_OCULTOS.includes(chaveDoItem(i)));
    if (visiveis.length === 1 && !g.colapsar.sempre) {
      assert.ok(lista.some((i) => i.chave === chaveDoItem(visiveis[0])), `${g.title}: item único deveria estar solto`);
    }
  }
  // 06/09/2026 — a Top College: o botão continua na lateral e o menu mostra só a marca X-EOS
  const tc = lista.find((i) => i.type === 'group' && i.chave === 'group:topcollege');
  assert.ok(tc, 'o botão Top College continua na lateral');
  assert.equal(tc.subItens.length, 1);
  assert.ok(tc.subItens[0].marcaCompleta, 'ao clicar, só a X-EOS');
});

test('aplicarOrdem: sem ordem guardada, a lista é a de fábrica; com ordem, obedece; item novo vai pro fim', () => {
  const lista = achatarItens(ADMIN);
  assert.deepEqual(aplicarOrdem(lista, []), lista);
  const invertida = [...lista].reverse().map((i) => i.chave);
  assert.deepEqual(aplicarOrdem(lista, invertida).map((i) => i.chave), invertida);
  // ordem antiga que não conhece os dois últimos itens (chegaram depois)
  const antiga = invertida.filter((c) => !lista.slice(-2).some((i) => i.chave === c));
  const resultado = aplicarOrdem(lista, antiga).map((i) => i.chave);
  assert.deepEqual(resultado.slice(0, antiga.length), antiga);
  assert.deepEqual(resultado.slice(antiga.length), lista.slice(-2).map((i) => i.chave), 'item novo tem que entrar no fim, na ordem de fábrica');
});

test('moverItem: tira de um índice e põe no outro, sem perder nem duplicar', () => {
  const l = ['a', 'b', 'c', 'd'].map((chave) => ({ chave }));
  assert.deepEqual(moverItem(l, 0, 2).map((i) => i.chave), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moverItem(l, 3, 0).map((i) => i.chave), ['d', 'a', 'b', 'c']);
  assert.deepEqual(moverItem(l, 1, 1).map((i) => i.chave), ['a', 'b', 'c', 'd']);
  assert.deepEqual(l.map((i) => i.chave), ['a', 'b', 'c', 'd'], 'não pode mexer na lista original');
});

test('a chave do localStorage é a MESMA de sempre — a ordem já arrumada no computador continua valendo', () => {
  assert.equal(chaveOrdemDe(ADMIN), 'navLateralOrdem_u1');
  assert.equal(chaveOrdemDe({}), null);
});
