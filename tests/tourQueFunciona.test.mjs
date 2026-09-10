// 🖐️ O TOUR GUIADO PARA DE BRIGAR COM QUEM ESTÁ USANDO (10/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// A AUDITORIA
// ═══════════════════════════════════════════════════════════════════════════
// Dono, com vídeo: "o tour guiado é pouco interativo, extremamente bugado".
// Quatro defeitos graves saíram da leitura do componente:
//
// 1. 🔴 BLOQUEAVA A TELA INTEIRA. O overlay era `fixed inset-0` sem
//    `pointer-events-none`: engolia TODO clique. O tour destacava um botão e a
//    pessoa não conseguia apertar esse botão. É o "pouco interativo".
//
// 2. 🔴 A PÁGINA NÃO ROLAVA. O listener de scroll chamava `medir()`, e
//    `medir()` chamava `scrollIntoView` — rolava, era puxado de volta, em
//    loop, inclusive em rolagem interna (`capture: true`).
//
// 3. 🔴 O BALÃO DESCOLAVA DO ALVO. A posição usava `alturaMax` FIXO em 420px,
//    não a altura real. Em janela útil de ~640px isso dá topMax = 208: todo
//    alvo abaixo de y≈192 jogava o balão pro topo da tela, grampeado em 12.
//
// 4. ⚠️ 6 dos 47 passos apontam pra `data-teste` que não existe em lugar
//    nenhum — todos no CrmMetodo. Cada um custa 600ms e some; se calhar de ser
//    o último, o tour FECHA sozinho.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { posicaoDoBalao, paineisDoEscuro, estiloBalao } from '../src/lib/tourGuiado.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const TOUR = semComentarios(ler('../src/components/licensing/CentralVendas/TourGuiado.jsx'));

// a janela do vídeo do dono: ~640px de área útil
const VH = 640;
const VW = 1200;
const comJanela = (fn) => {
  const antes = globalThis.window;
  globalThis.window = { innerWidth: VW, innerHeight: VH };
  try { return fn(); } finally { globalThis.window = antes; }
};

test('🔴 o overlay deixa o clique chegar no elemento destacado', () => {
  // Sem isto, o tour aponta um botão e não deixa apertar — a queixa inteira.
  assert.match(TOUR, /className="fixed inset-0 z-\[100\] pointer-events-none"/, 'o overlay voltou a engolir todo clique da tela');
  assert.match(TOUR, /paineisDoEscuro\(retangulo, vw, vh, PAD\)/, 'voltou o retângulo único — não dá pra abrir buraco pro clique');
  assert.doesNotMatch(TOUR, /boxShadow: '0 0 0 9999px/, 'voltou o box-shadow gigante, que escurece mas não deixa buraco');
});

test('🔴 medir NUNCA rola a tela — era o loop de briga', () => {
  const corpoMedir = TOUR.slice(TOUR.indexOf('const medir = useCallback'), TOUR.indexOf('const medir = useCallback') + 300);
  assert.doesNotMatch(corpoMedir, /scrollIntoView/, 'medir() voltou a rolar — a página vira briga em qualquer scroll');
  // rolar acontece uma vez, ao ENTRAR no passo
  assert.match(TOUR, /const entrar = \(\) => \{[\s\S]{0,240}scrollIntoView/, 'sumiu a rolagem única de entrada no passo');
});

test('🔴 o buraco do alvo fica livre; o resto escurece', () => {
  const alvo = { top: 300, left: 400, width: 200, height: 40 };
  const paineis = paineisDoEscuro(alvo, VW, VH, 8);
  assert.equal(paineis.length, 4, 'esperava quatro painéis em volta do alvo');
  // nenhum painel invade o retângulo do alvo (com a folga)
  const cima = alvo.top - 8, baixo = alvo.top + alvo.height + 8;
  const esq = alvo.left - 8, dir = alvo.left + alvo.width + 8;
  for (const p of paineis) {
    const invade = p.left < dir && p.left + p.width > esq && p.top < baixo && p.top + p.height > cima;
    assert.equal(invade, false, `painel ${JSON.stringify(p)} cobre o alvo — o clique não passaria`);
  }
});

test('⚠️ sem alvo, escurece a tela inteira (um painel só)', () => {
  assert.deepEqual(paineisDoEscuro(null, VW, VH), [{ top: 0, left: 0, width: VW, height: VH }]);
});

test('🔴 o balão fica COLADO no alvo — não grampeado no topo', () => comJanela(() => {
  // O caso do vídeo: alvo no meio da página, numa janela baixa.
  const alvo = { top: 300, left: 120, width: 220, height: 34 };
  const alturaReal = 150;               // um passo de três linhas
  const nova = posicaoDoBalao(alvo, alturaReal, 420);
  const velha = estiloBalao(alvo, 420); // como era antes: 420 fixo

  assert.equal(velha.top, 12, 'a régua antiga mudou — reconferir o caso do vídeo');
  assert.ok(nova.top > alvo.top, `esperava o balão ABAIXO do alvo (${alvo.top}), veio em ${nova.top}`);
  assert.equal(nova.top, alvo.top + alvo.height + 16, 'o balão deixou de nascer logo abaixo do alvo');
}));

test('⚠️ balão alto ainda cabe inteiro na tela', () => comJanela(() => {
  // A guarda que nasceu do "abriu tanto que não dava pra ver o botão de
  // continuar" (09/09) continua valendo: nada pode nascer fora do viewport.
  const alvo = { top: 560, left: 100, width: 200, height: 40 };
  const pos = posicaoDoBalao(alvo, 400, 420);
  assert.ok(pos.top >= 12, `o balão saiu por cima da tela: ${pos.top}`);
  assert.ok(pos.top + 400 <= VH, `o balão saiu por baixo da tela: ${pos.top} + 400 > ${VH}`);
}));

test('⚠️ a altura medida é limitada pelo teto, e nunca é absurda', () => comJanela(() => {
  const alvo = { top: 100, left: 100, width: 100, height: 20 };
  assert.deepEqual(posicaoDoBalao(alvo, 9999, 420), estiloBalao(alvo, 420), 'altura maior que o teto tem que virar o teto');
  assert.deepEqual(posicaoDoBalao(alvo, 0, 420), estiloBalao(alvo, 80), 'altura zero/inválida tem que cair num piso');
}));

test('🔴 Esc fecha e o foco volta pra onde estava', () => {
  assert.match(TOUR, /e\.key === 'Escape'/, 'o tour voltou a não responder ao Esc');
  assert.match(TOUR, /focoAnteriorRef\.current\?\.focus\?\.\(\)/, 'o foco deixou de voltar pro elemento de origem');
  // `aria-modal` prometia trancar o foco e nunca trancou — saiu, em vez de mentir
  assert.doesNotMatch(TOUR, /aria-modal="true"/, 'voltou o aria-modal, que promete um foco preso que não existe');
});

test('🔴 TRAVA: nenhum passo NOVO pode apontar pro vazio', () => {
  // Os 6 abaixo são dívida conhecida, herdada — os textos são bons e as
  // âncoras vivem em outros componentes, então são conserto separado, com o
  // preview aberto pra conferir elemento por elemento. O que este teste
  // impede é a lista CRESCER.
  const DIVIDA = new Set(['titulo-tarefa', 'acoes-tarefa', 'sonho-horizonte', 'sonho-adicionar', 'lista-qualificar', 'contato-acoes']);

  const raiz = new URL('../src/', import.meta.url);
  const arquivos = [];
  const andar = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const filho = new URL(`${e.name}${e.isDirectory() ? '/' : ''}`, dir);
      if (e.isDirectory()) andar(filho);
      else if (/\.(jsx?|mjs)$/.test(e.name)) arquivos.push(filho);
    }
  };
  andar(raiz);

  const existentes = new Set();
  const alvos = [];
  for (const f of arquivos) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/data-teste=["'{`]+([a-z0-9-]+)/gi)) existentes.add(m[1]);
    for (const m of src.matchAll(/testeCampo="([^"]+)"/g)) existentes.add(m[1]);
    for (const bloco of src.matchAll(/PASSOS[_A-Z]*\s*=\s*\[([\s\S]*?)\n\];/g)) {
      for (const a of bloco[1].matchAll(/alvo:\s*'([^']+)'/g)) alvos.push([f.pathname.split('/').pop(), a[1]]);
    }
  }

  assert.ok(alvos.length >= 40, `esperava achar os passos do tour, achei ${alvos.length}`);
  const orfaos = alvos.filter(([, a]) => !existentes.has(a)).map(([, a]) => a);
  const novos = orfaos.filter((a) => !DIVIDA.has(a));
  assert.deepEqual(novos, [], `passo(s) de tour apontando pra data-teste inexistente: ${novos.join(', ')}`);
});
