// 🖐️ 09/09/2026 — dono, ao vivo, corrigindo o "Como Funciona": "é um tour. A
// pessoa vai clicando e a plataforma vai ensinando." Ele está lembrando da
// mãozinha (TourGuiado.jsx) que já ensina a Esteira de Captação — este
// arquivo prova que o sinal entre o botão global e o tour local (que mora
// perto dos elementos DE VERDADE que ele aponta) está de pé.
//
// 🆙 mesmo dia, depois de testar o Compromisso: "pode seguir pros outros
// hábitos". O pedido do botão global virou GENÉRICO ('metodo') — ele não
// sabe em qual dos 8 Hábitos a pessoa está; quem decide isso é o CrmMetodo,
// que já sabe o painel atual (PASSOS_POR_PAINEL).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pedirTour, ouvirPedidoDeTour, TOURS_DISPONIVEIS } from '../src/lib/pedidoDeTour.js';

const METODO = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8');
const CLIENTES_TAB = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmClientesTab.jsx', import.meta.url), 'utf8');
const PAGINA = fs.readFileSync(new URL('../src/pages/Licensing.jsx', import.meta.url), 'utf8');
const MODAL = fs.readFileSync(new URL('../src/components/licensing/ComoFuncionaModal.jsx', import.meta.url), 'utf8');

test('pedirTour/ouvirPedidoDeTour: pub/sub simples — avisa quem está ouvindo, e desinscrever para de avisar', () => {
  const recebidos = [];
  const parar = ouvirPedidoDeTour((id) => recebidos.push(id));
  pedirTour('metodo');
  assert.deepEqual(recebidos, ['metodo']);
  parar();
  pedirTour('metodo');
  assert.deepEqual(recebidos, ['metodo'], 'depois de desinscrever, não pode receber mais nada');
});

test('pedirTour: um ouvinte que quebra não pode derrubar os outros', () => {
  const recebidos = [];
  const p1 = ouvirPedidoDeTour(() => { throw new Error('ouvinte quebrado'); });
  const p2 = ouvirPedidoDeTour((id) => recebidos.push(id));
  assert.doesNotThrow(() => pedirTour('metodo'));
  assert.deepEqual(recebidos, ['metodo']);
  p1(); p2();
});

test('TOURS_DISPONIVEIS: só oferece o botão de tour onde alguém sabe atender', () => {
  assert.equal(TOURS_DISPONIVEIS['catalogo-crm'], 'metodo');
});

test('CrmMetodo.jsx: a mãozinha existe, ligada ao pedido de fora, e decide sozinha qual Hábito tem tour', () => {
  assert.match(METODO, /import TourGuiado from '\.\/TourGuiado'/);
  assert.match(METODO, /iniciarTour = false, onTourIniciado/, 'precisa aceitar o pedido vindo de fora, com um padrão seguro (não abre sozinho)');
  assert.match(METODO, /PASSOS_POR_PAINEL\[painel\]/, 'quem decide se o Hábito atual tem tour é o próprio CrmMetodo, não quem pediu de fora');
  assert.match(METODO, /<TourGuiado ativo=\{tourAberto\} passos=\{PASSOS_POR_PAINEL\[painel\] \|\| \[\]\} onFechar=/);
});

test('PASSOS_POR_PAINEL: um Hábito por chave, e todo alvo existe de verdade na tela (nenhuma mãozinha apontando pro vazio)', () => {
  assert.match(METODO, /const PASSOS_POR_PAINEL = \{/);
  const chaves = ['sonho', 'compromisso', 'lista', 'contato', 'apresentacao', 'duplicacao'];
  for (const chave of chaves) {
    assert.match(METODO, new RegExp(`\\b${chave}: PASSOS_TOUR_`), `falta o tour do painel "${chave}" no mapa`);
  }
  const alvos = [...METODO.matchAll(/alvo:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(alvos.length >= chaves.length * 2, 'tours curtos demais pra ensinar alguma coisa');
  // TourGuiado usa document.querySelector — o elemento pode morar em
  // qualquer componente da mesma tela, não só no CrmMetodo. nav-habitos, por
  // exemplo, é a navegação dos 8 Hábitos, em CrmClientesTab.jsx.
  const telaInteira = METODO + CLIENTES_TAB;
  for (const alvo of alvos) {
    assert.match(telaInteira, new RegExp(`data-teste=(\\{\`)?"${alvo}`), `o alvo "${alvo}" não tem nenhum data-teste correspondente na tela`);
  }
});

test('todo passo de todo tour tem título e um texto que ENSINA (não só descreve)', () => {
  const passos = [...METODO.matchAll(/\{\s*alvo:\s*'([^']+)',\s*titulo:\s*'([^']+)',\s*texto:\s*'([^']+)'/g)];
  assert.ok(passos.length >= 12, 'poucos passos pro tamanho de 6 Hábitos com tour');
  for (const [, alvo, titulo, texto] of passos) {
    assert.ok(titulo.trim().length >= 5, `título curto demais no passo "${alvo}"`);
    assert.ok(texto.trim().length >= 20, `texto curto demais pra ensinar alguma coisa de verdade no passo "${alvo}"`);
  }
});

test('CrmClientesTab.jsx: ouve o pedido genérico e repassa pro CrmMetodo, sem forçar navegação', () => {
  assert.match(CLIENTES_TAB, /import \{ ouvirPedidoDeTour \} from '@\/lib\/pedidoDeTour'/);
  assert.match(CLIENTES_TAB, /ouvirPedidoDeTour\(\(id\) => \{/);
  assert.match(CLIENTES_TAB, /if \(id === 'metodo'\) setTourPendente\(true\);/, 'o pedido é genérico — quem decide o Hábito é o CrmMetodo, não esta tela forçando setSecao');
  assert.match(CLIENTES_TAB, /iniciarTour=\{tourPendente\}/);
  assert.match(CLIENTES_TAB, /onTourIniciado=\{\(\) => setTourPendente\(false\)\}/);
});

test('o botão global "Como Funciona" pede o tour certo pra seção certa, e some quando não existe tour', () => {
  assert.match(PAGINA, /import \{ pedirTour, TOURS_DISPONIVEIS \} from '@\/lib\/pedidoDeTour'/);
  assert.match(PAGINA, /onIniciarTour=\{TOURS_DISPONIVEIS\[catalogSubTab\] \? \(\) => \{ pedirTour\(TOURS_DISPONIVEIS\[catalogSubTab\]\); setComoFuncionaAberto\(false\); \} : undefined\}/);
});

test('o modal mostra "fazer o tour" quando existe, e um aviso honesto quando não existe — nunca some as duas coisas', () => {
  assert.match(MODAL, /onIniciarTour \?/);
  assert.match(MODAL, /Fazer o tour guiado desta tela/);
  assert.match(MODAL, /ainda não tem um tour guiado/);
});
