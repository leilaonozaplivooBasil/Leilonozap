// 🤝 O LEAD PELO QUADRO — o painel "Tudo aqui" do card (24/09/2026).
//
// Dono: "modal no quadro para que tudo possa ser feito lá (lista, contatos, e
// mais). Da qualificação do lead à criação do contato novo. Sem sair da
// página do quadro."
//
// O que se prova: a régua é a MESMA da Lista e do Hábito 4 (escopo, payload
// do contato novo, trava de duplicado, registro com carimbo) — e o card monta
// o painel sem perder os chips antigos que a banca do lead já cobria.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  ABAS_DO_MODAL, meusContatos, filtrarPorNome, novoContatoParaGravar, duplicadoNaMinhaLista, podeCriarContato,
  registroComCarimbo, historicoComRegistro, resumoDaQualificacao,
} from '../src/lib/leadDoQuadro.js';
import { escopoDoMetodo } from '../src/lib/escopoDoMetodo.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const EU = { id: 'u1', full_name: 'Ana Exemplo', email: 'ana@x.com', role: 'user' };
const TODOS = [
  { id: 'c1', full_name: 'Ângela Conceição', created_by_id: 'u1', phone: '21999990001', email: 'angela@x.com' },
  { id: 'c2', full_name: 'José Antônio', created_by_id: 'u1', qualificacao_network: { produto: 'parceiro', confianca: 5, financeiro: 4, apetite: 3 } },
  { id: 'c3', full_name: 'De Outra Pessoa', created_by_id: 'u9' },
  { id: 'c4', full_name: 'Sem dono (legado)' },
  null,
];

test('🔒 a minha lista é a mesma régua do Método: só created_by_id meu; super admin vê todas', () => {
  assert.deepEqual(meusContatos(TODOS, EU).map((c) => c.id), ['c1', 'c2']);
  // igual ao escopoDoMetodo, que é quem manda na Lista de Networking
  assert.deepEqual(escopoDoMetodo({ clientes: TODOS.filter(Boolean), uid: 'u1' }).clientes.map((c) => c.id), ['c1', 'c2']);
  assert.deepEqual(meusContatos(TODOS, { id: 'dono', role: 'super_admin' }).map((c) => c.id), ['c1', 'c2', 'c3', 'c4']);
  assert.deepEqual(meusContatos(TODOS, null), []);
  assert.deepEqual(meusContatos(null, EU), []);
});

test('busca por nome ignora acento e caixa, e respeita o limite', () => {
  const meus = meusContatos(TODOS, EU);
  assert.deepEqual(filtrarPorNome(meus, 'angela').map((c) => c.id), ['c1']);
  assert.deepEqual(filtrarPorNome(meus, 'JOSE').map((c) => c.id), ['c2']);
  assert.deepEqual(filtrarPorNome(meus, '').map((c) => c.id), ['c1', 'c2']);
  assert.deepEqual(filtrarPorNome(meus, '', 1).map((c) => c.id), ['c1']);
  assert.deepEqual(filtrarPorNome(meus, 'zzz'), []);
});

test('o contato novo: o payload do "Adicionar pessoa", com o carimbo de quem cadastrou', () => {
  const p = novoContatoParaGravar({ nome: '  Carlos   Souza ', telefone: ' (21) 9 8888-7777 ', email: ' CARLOS@X.COM ' }, EU, '2026-09-24');
  assert.deepEqual(p, {
    full_name: 'Carlos Souza', phone: '(21) 9 8888-7777', email: 'carlos@x.com',
    status: 'lead', source: 'site', last_contact: '2026-09-24', created_by_id: 'u1', created_by: 'ana@x.com',
  });
  // sem created_by_id ele não apareceria na lista de ninguém — então nem nasce
  assert.equal(novoContatoParaGravar({ nome: 'Carlos' }, null), null);
  assert.equal(novoContatoParaGravar({ nome: '   ' }, EU), null);
  assert.equal(novoContatoParaGravar({}, EU), null);
});

test('🔴 a trava de duplicado é a do CRM: e-mail/telefone trancam; nome igual só com "é outra pessoa mesmo"', () => {
  const meus = meusContatos(TODOS, EU);
  const porEmail = duplicadoNaMinhaLista(meus, novoContatoParaGravar({ nome: 'Outra', email: 'ANGELA@x.com' }, EU));
  assert.equal(porEmail.motivo, 'email'); assert.equal(podeCriarContato(porEmail, true), false, 'e-mail igual não passa nem confirmando');
  const porFone = duplicadoNaMinhaLista(meus, novoContatoParaGravar({ nome: 'Outra', telefone: '(21) 99999-0001' }, EU));
  assert.equal(porFone.motivo, 'telefone'); assert.equal(podeCriarContato(porFone, true), false);
  const porNome = duplicadoNaMinhaLista(meus, novoContatoParaGravar({ nome: 'jose antonio' }, EU));
  assert.equal(porNome.motivo, 'nome');
  assert.equal(podeCriarContato(porNome, false), false);
  assert.equal(podeCriarContato(porNome, true), true, 'homônimo de verdade pode, se a pessoa disser');
  assert.equal(podeCriarContato(null), true);
  // só olha a MINHA lista: o "De Outra Pessoa" não tranca o meu cadastro
  assert.equal(duplicadoNaMinhaLista(meus, novoContatoParaGravar({ nome: 'De Outra Pessoa' }, EU)), null);
});

test('o registro de contato: o mesmo formato do Hábito 4 (carimbo) e append-only no histórico', () => {
  const completo = registroComCarimbo({ resultado: 'feito', obs: 'ligou' }, EU, { id: 'r1', em: '2026-09-24T15:00:00.000Z' });
  assert.deepEqual(completo, { resultado: 'feito', obs: 'ligou', id: 'r1', em: '2026-09-24T15:00:00.000Z', registrado_por_id: 'u1', registrado_por_nome: 'Ana Exemplo' });
  // sem id/em passados, gera os dois
  const auto = registroComCarimbo({ resultado: 'feito' }, EU);
  assert.ok(auto.id && auto.em);
  const contato = { id: 'c1', contatos_metodo: [{ id: 'r0', resultado: 'nao_atendeu' }] };
  assert.deepEqual(historicoComRegistro(contato, completo).map((r) => r.id), ['r0', 'r1']);
  assert.deepEqual(historicoComRegistro({ id: 'c9' }, completo).map((r) => r.id), ['r1']);
  assert.deepEqual(contato.contatos_metodo.map((r) => r.id), ['r0'], 'o histórico original não é mexido');
});

test('o resumo da qualificação na linha: "12/15 · 75%", ou nada se não qualificou', () => {
  assert.equal(resumoDaQualificacao(TODOS[1]), '12/15 · 75%');
  assert.equal(resumoDaQualificacao(TODOS[0]), null);
  assert.equal(resumoDaQualificacao(null), null);
  assert.deepEqual(ABAS_DO_MODAL.map((a) => a.id), ['lista', 'novo']);
});

test('🔴 o card abre o painel, mantém os chips antigos e monta os três sobrepostos na ordem certa', () => {
  const C = ler('../src/components/licensing/CentralVendas/LeadDoCartao.jsx');
  // os chips que a banca do lead já cobria continuam com os mesmos ids
  for (const id of ['vincular-lead', 'chip-cliente', 'qualificar-lead', 'agendar-google', 'opcao-cliente', 'desvincular-cliente']) assert.ok(C.includes(`data-teste="${id}"`), id);
  assert.ok(C.includes('data-teste="abrir-modal-lead"'));
  // a lista é a régua compartilhada, não um filtro próprio
  assert.match(C, /const meus = meusContatos\(todos, dono\)/);
  assert.doesNotMatch(C, /created_by_id === uid/);
  // o registro do Hábito 4 usa o carimbo compartilhado
  assert.match(C, /registroComCarimbo\(registro, dono\)/);
  assert.match(C, /Customer\.update\(contato\.id, \{ contatos_metodo: historico \}\)/);
  // ordem: ModalDoLead ANTES dos dois modais z-50 que ele abre (quem monta depois fica por cima)
  const iM = C.indexOf('<ModalDoLead'); const iQ = C.indexOf('<CrmNetworkQualificacaoModal'); const iR = C.indexOf('<CrmContatoRegistroModal');
  assert.ok(iM > -1 && iQ > iM && iR > iM, 'o painel tem que montar antes dos modais que abre');
  // o painel NÃO usa o Dialog da casa (z-[200] engoliria os modais de baixo)
  const M = ler('../src/components/licensing/CentralVendas/ModalDoLead.jsx');
  assert.doesNotMatch(M, /from '@\/components\/ui\/dialog'/);
  assert.match(M, /fixed inset-0 .*z-50/);
  for (const id of ['modal-do-lead', 'aba-lista', 'aba-novo', 'modal-busca', 'modal-contato', 'modal-vincular', 'modal-qualificar', 'modal-contatar', 'modal-agendar', 'novo-nome', 'novo-duplicado', 'novo-e-outra-pessoa', 'novo-salvar']) {
    assert.ok(M.includes(`data-teste="${id}"`) || M.includes(`data-teste={\`aba-`), id);
  }
});
