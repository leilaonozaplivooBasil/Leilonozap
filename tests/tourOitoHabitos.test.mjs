// 🖐️ DIR-124 — O TOUR GUIADO NOS 8 HÁBITOS, TERMINADO (09/09/2026).
//
// O PEDIDO (dono, urgente): "precisa avaliar o tour de ensinamento da Top
// College, começamos e não terminamos isso... tem aba que não está
// funcionando... vamos fazer análise e deixar funcionando perfeito."
//
// A AUDITORIA ACHOU DOIS PROBLEMAS DE VERDADE:
//   1. Hábitos 6 (Acompanhamento/Clientes) e 7 (Verificação) não tinham
//      NENHUM tour — o botão global "Fazer o tour guiado desta tela" não
//      fazia nada ali, e o pedido ficava preso (`tourPendente=true`,
//      nunca consumido) até a pessoa trocar pra outro Hábito, onde então
//      um tour NÃO PEDIDO disparava sozinho — o "tour do Sonho travado"
//      que o dono via era exatamente essa sobra.
//   2. Vários alvos do tour (`sonho-horizonte`, `sonho-adicionar`,
//      `titulo-tarefa`, `acoes-tarefa`, `lista-qualificar`,
//      `contato-acoes`) tinham o MESMO data-teste repetido dentro de um
//      `.map()` — `querySelector` sempre pega o primeiro, então a
//      mãozinha sempre mirava no item errado quando a intenção era outra.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const METODO = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8');
const CLIENTES_TAB = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmClientesTab.jsx', import.meta.url), 'utf8');
const ESTEIRA = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmEsteiraCaptacao.jsx', import.meta.url), 'utf8');

// ── 1. os alvos que viviam duplicados dentro de .map() agora são únicos ──
const CASOS_DUPLICADOS = [
  { arquivo: METODO, nome: 'CrmMetodo.jsx', alvo: 'sonho-horizonte' },
  { arquivo: METODO, nome: 'CrmMetodo.jsx', alvo: 'sonho-adicionar' },
  { arquivo: METODO, nome: 'CrmMetodo.jsx', alvo: 'titulo-tarefa' },
  { arquivo: METODO, nome: 'CrmMetodo.jsx', alvo: 'acoes-tarefa' },
  { arquivo: METODO, nome: 'CrmMetodo.jsx', alvo: 'lista-qualificar' },
  { arquivo: METODO, nome: 'CrmMetodo.jsx', alvo: 'contato-acoes' },
];

for (const { arquivo, nome, alvo } of CASOS_DUPLICADOS) {
  test(`${nome}: "${alvo}" nunca aparece cru dentro de um .map() — está guardado por condicional`, () => {
    // string PURA (data-teste="alvo") não pode mais existir pra estes 6 —
    // eles só podem aparecer dentro de um `{ condição ? 'alvo' : undefined }`
    assert.ok(!new RegExp(`data-teste="${alvo}"`).test(arquivo), `"${alvo}" voltou a ser um data-teste cru — duplica de novo dentro do .map()`);
    assert.match(arquivo, new RegExp(`data-teste=\\{[^}]*'${alvo}'[^}]*\\? undefined|data-teste=\\{[^}]*\\?\\s*'${alvo}'`), `"${alvo}" precisa estar atrás de uma condição (só o primeiro item da lista ganha o data-teste)`);
  });
}

// ── 2. Hábitos 6 e 7 ganharam tour de verdade ──
test('Hábito 6 (Acompanhamento/Clientes) tem tour próprio, com todos os alvos de verdade na tela', () => {
  const inicio = CLIENTES_TAB.indexOf('const PASSOS_TOUR_ACOMPANHAMENTO = [');
  assert.ok(inicio >= 0, 'PASSOS_TOUR_ACOMPANHAMENTO precisa existir');
  const fim = CLIENTES_TAB.indexOf('\n];', inicio);
  const trecho = CLIENTES_TAB.slice(inicio, fim);
  const alvos = [...trecho.matchAll(/alvo:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(alvos.length >= 3, 'PASSOS_TOUR_ACOMPANHAMENTO tem poucos passos');
  for (const alvo of alvos) {
    assert.match(CLIENTES_TAB, new RegExp(`data-teste="${alvo}"`), `alvo "${alvo}" sem elemento correspondente`);
  }
  assert.match(CLIENTES_TAB, /<TourGuiado ativo=\{tourAcompanhamentoAberto\} passos=\{PASSOS_TOUR_ACOMPANHAMENTO\}/);
});

test('Hábito 7 (Verificação) tem tour próprio, com todos os alvos de verdade na tela', () => {
  const inicio = CLIENTES_TAB.indexOf('const PASSOS_TOUR_VERIFICACAO = [');
  assert.ok(inicio >= 0, 'PASSOS_TOUR_VERIFICACAO precisa existir');
  const fim = CLIENTES_TAB.indexOf('\n];', inicio);
  const trecho = CLIENTES_TAB.slice(inicio, fim);
  const alvos = [...trecho.matchAll(/alvo:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(alvos.length >= 3, 'PASSOS_TOUR_VERIFICACAO tem poucos passos');
  for (const alvo of alvos) {
    assert.match(CLIENTES_TAB, new RegExp(`data-teste="${alvo}"`), `alvo "${alvo}" sem elemento correspondente`);
  }
  assert.match(CLIENTES_TAB, /<TourGuiado ativo=\{tourVerificacaoAberto\} passos=\{PASSOS_TOUR_VERIFICACAO\}/);
});

// ── 3. a Esteira (Hábito 6b) aceita o pedido do botão GLOBAL agora ──
test('CrmEsteiraCaptacao aceita iniciarTour/onTourIniciado — não fica mais isolada do botão global', () => {
  assert.match(ESTEIRA, /iniciarTour = false, onTourIniciado/, 'faltam as props de tour externo');
  assert.match(ESTEIRA, /if \(iniciarTour\) \{ setTourAberto\(true\); onTourIniciado\?\.\(\); \}/, 'a tela não abre o próprio tour quando o pedido vem de fora');
});

// ── 4. o roteamento do pedido de tour olha a tela ATUAL, não chuta ──
test('🐛 CORREÇÃO DO BUG: o pedido de tour decide o destino pela tela de agora, nunca um "tourPendente" solto e esquecido', () => {
  assert.match(CLIENTES_TAB, /secaoAtivaRef\.current = secaoAtiva/, 'sem o ref, o listener nunca sabe em qual Hábito a pessoa está de verdade');
  assert.match(CLIENTES_TAB, /const atual = secaoAtivaRef\.current;/);
  // as 4 rotas possíveis, cada uma pro seu próprio estado — nenhuma cai no vazio
  assert.match(CLIENTES_TAB, /setTourPendente\(true\); return;/);
  assert.match(CLIENTES_TAB, /atual === 'verificacao'.*\{ setTourVerificacaoAberto\(true\); return; \}/s);
  assert.match(CLIENTES_TAB, /setTourEsteiraPendente\(true\)/);
  assert.match(CLIENTES_TAB, /setTourAcompanhamentoAberto\(true\)/);
});

test('CrmClientesTab.jsx importa e usa o TourGuiado — antes só existia em CrmMetodo/Esteira', () => {
  assert.match(CLIENTES_TAB, /import TourGuiado from '\.\/TourGuiado';/);
});
