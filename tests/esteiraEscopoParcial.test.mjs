// 🔎 "A ESTEIRA ZEROU" — o recorte que não se anunciava (10/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ESTE TESTE EXISTE
// ═══════════════════════════════════════════════════════════════════════════
// Print do dono, num computador em que o seletor estava em "Só meu": a Esteira
// aparecia praticamente vazia — "R$ 0,00 · 0 negociações ativas" — com uma
// única negociação à vista. As outras seis estavam TODAS no banco.
//
// O seletor de escopo mora no localStorage, ou seja, POR APARELHO. A mesma
// pessoa, na mesma conta, vê números diferentes em dois computadores; e o
// padrão de quem nunca clicou é "Só meu". Nada na tela dizia que aquilo era um
// recorte — bastava um print pra virar "a esteira zerou" no grupo.
//
// ⚠️ E havia uma coincidência que piorava tudo: nesse modo o card da meta
// mostrava 20,0%, que é por acaso o número CERTO do outro conserto desta mesma
// data — só que ali pelo motivo errado (esteira vazia).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolverEscopo } from '../src/lib/escopoDeVisao.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (rel) => semComentarios(readFileSync(new URL(rel, import.meta.url), 'utf8'));
const ESTEIRA = ler('../src/components/licensing/CentralVendas/CrmEsteiraCaptacao.jsx');
const TELA = ler('../src/components/licensing/CentralVendas/CrmClientesTab.jsx');

// A condição do aviso, como a tela calcula: pode ver tudo, mas não está vendo.
const parcial = (vis, escopo) => { const r = resolverEscopo({ vis, escopo }); return r.podeTudo && !r.crmTudo; };

test('🔴 quem PODE ver tudo e está em "só o meu" é avisado', () => {
  assert.equal(parcial({ visaoTotal: true, superAdmin: true }, 'eu'), true);
  assert.equal(parcial({ visaoTotal: true, superAdmin: true }, undefined), true, 'o padrão de quem nunca clicou é "eu" — e é justamente quem mais precisa do aviso');
});

test('🔴 quem já está vendo tudo NÃO leva aviso — senão ele vira ruído permanente', () => {
  assert.equal(parcial({ visaoTotal: true, superAdmin: true }, 'tudo'), false);
});

test('🔴 vendedor NUNCA leva o aviso', () => {
  // Ele não tem outro modo pra ver; um aviso com um botão que não o levaria a
  // lugar nenhum só ensinaria a ignorar avisos.
  assert.equal(parcial({ visaoTotal: false }, 'eu'), false);
  assert.equal(parcial({ visaoTotal: false }, 'tudo'), false, 'sem visão total, escolher "tudo" não muda nada — e continua sem aviso');
  assert.equal(parcial({}, 'eu'), false);
  assert.equal(parcial(null, 'eu'), false, 'sem usuário resolvido, nada de aviso');
});

test('🔴 o aviso está na tela, antes dos números que ele qualifica', () => {
  // Depois dos cards ele não serve: quem bate o olho já leu "R$ 0,00".
  assert.match(ESTEIRA, /escopoParcial && \(/, 'sumiu o aviso de escopo parcial da Esteira');
  const posAviso = ESTEIRA.indexOf('esteira-escopo-parcial');
  const posCards = ESTEIRA.indexOf('esteira-forecast');
  assert.ok(posAviso > 0, 'o bloco do aviso sumiu');
  assert.ok(posAviso < posCards, 'o aviso ficou DEPOIS dos números — quem bate o olho lê o número parcial primeiro');
});

test('⚠️ o aviso diz que os números são parciais, não só que o filtro existe', () => {
  // "Você está no modo X" não avisa nada. O que a pessoa precisa saber é que
  // o NÚMERO que ela está prestes a ler não é o total.
  assert.match(ESTEIRA, /parciais/, 'o aviso parou de dizer que os números são parciais');
  assert.match(ESTEIRA, /só as suas negociações/, 'o aviso parou de dizer de quem é o recorte');
});

test('🔴 a tela informa o escopo e sabe desfazer o recorte', () => {
  assert.match(TELA, /escopoParcial=\{visao\.podeTudo && !visao\.crmTudo\}/, 'a Esteira parou de receber a informação do escopo');
  assert.match(TELA, /onVerTudo=\{\(\) => trocarEscopo\('tudo'\)\}/, 'o botão do aviso perdeu a ação');
  assert.match(TELA, /const \[escopo, trocarEscopo\] = useEscopoDeVisao\(\)/, 'a tela voltou a ignorar o setter do escopo');
});

test('⚠️ sem ação disponível, o aviso ainda aparece — só sem botão', () => {
  // O aviso vale por si. Um `onVerTudo` ausente não pode derrubar a
  // renderização nem esconder a informação.
  assert.match(ESTEIRA, /\{onVerTudo && \(/, 'o botão deixou de ser opcional — quem usar a Esteira sem passar a ação quebra ou perde o aviso');
  assert.match(ESTEIRA, /onVerTudo = null/, 'a prop da ação deixou de ter padrão seguro');
});
