// ✏️🗑️ EDITAR/EXCLUIR CLIENTE, DIRETO NA LISTA DE NETWORK (14/09/2026)
//
// Dono, ao vivo: "eu preciso ter um botão de editar o cliente e excluir o
// cliente porque está tendo cliente duplicado" — e, sobre criar uma nova
// oportunidade no Acompanhamento, "não está salvando isso" (tinha que
// redigitar informação que já estava cadastrada).
//
// Os handlers (handleEdit/handleDelete) e o atalho de virar oportunidade
// (onCriarOportunidade) já existiam prontos — o Hábito 3 (Lista de Network)
// só não tinha os botões ligados. Isto prende que a fiação não se perde.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const CRM = ler('src/components/licensing/CentralVendas/CrmMetodo.jsx');
const TAB = ler('src/components/licensing/CentralVendas/CrmClientesTab.jsx');

test('CrmMetodo recebe onEditarCliente e onExcluirCliente como props', () => {
  assert.match(CRM, /onEditarCliente, onExcluirCliente/);
});

test('a Lista de Network (Hábito 3) tem editar, excluir E o atalho pra virar oportunidade — sem redigitar', () => {
  const ini = CRM.indexOf("painel === 'lista' && (() => {");
  const fim = CRM.indexOf("painel === 'contato' &&", ini);
  assert.ok(ini > 0 && fim > ini, 'premissa: o painel do Hábito 3 existe');
  const painel = CRM.slice(ini, fim);
  assert.match(painel, /onClick=\{\(\) => onEditarCliente\(c\)\}/, 'sumiu o botão de editar cliente');
  assert.match(painel, /onClick=\{\(\) => onExcluirCliente\(c\.id\)\}/, 'sumiu o botão de excluir cliente');
  assert.match(painel, /onClick=\{\(\) => onCriarOportunidade\(c\)\}/, 'sumiu o atalho pra virar oportunidade direto da lista');
});

test('CrmClientesTab liga os handlers que JÁ EXISTIAM (não inventa lógica nova de edição/exclusão)', () => {
  const ini = TAB.indexOf('<CrmMetodo');
  const fim = TAB.indexOf('/>', ini);
  const chamada = TAB.slice(ini, fim);
  assert.match(chamada, /onEditarCliente=\{handleEdit\}/);
  assert.match(chamada, /onExcluirCliente=\{handleDelete\}/);
  // e os handlers continuam sendo os mesmos que já existiam pra aba
  // Acompanhamento → Clientes — nenhuma lógica de exclusão nova
  assert.match(TAB, /const handleEdit = \(raw\) => \{/);
  assert.match(TAB, /const handleDelete = async \(id\) => \{/);
  assert.match(TAB, /if \(!confirm\('Tem certeza que deseja excluir este cliente\?'\)\) return;/, 'excluir sem confirmação — clique errado apaga cliente de verdade');
});
