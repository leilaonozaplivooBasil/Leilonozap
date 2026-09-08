// ⏭️ X-MUSIC tocando em SEQUÊNCIA (pedido do Ávilla, 07/09/2026).
//
// O que estava acontecendo: o player só escutava o evento PLAYING. Não havia
// tratamento de FIM — acabou a música, silêncio. "A SUA PLAYLIST" era uma
// prateleira (uma música por clique) e a fila das estações da casa só era
// usada pra pular vídeo bloqueado, nunca no fim natural da faixa.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { proximaDaSequencia } from '../src/lib/xmusic.js';

const XMUSIC = fs.readFileSync(new URL('../src/components/licensing/XMusic.jsx', import.meta.url), 'utf8');

// o que a pessoa salva na playlist dela
const m = (id, nome = id) => ({ id, nome, lista: false, video: id });
// o que a rota /api/functions/xmusicBuscar devolve na fila da vaga:
// { id, titulo, canal, lista } — repare que NÃO tem `nome`, por isso o
// nome da estação ("Foco") sobrevive ao espalhamento
const cand = (id) => ({ id, titulo: `faixa ${id}`, canal: 'X-EOS', lista: false });
const PL = [m('a'), m('b'), m('c')];
const ESTACOES = [
  { slot: 'foco', nome: 'Foco', fila: [cand('f1'), cand('f2'), cand('f3')] },
  { slot: 'calma', nome: 'Calma', fila: [] },
];

// ── 1. tem playlist salva → a ordem é a dela ─────────────────────────
test('playlist salva: toca a PRÓXIMA na ordem em que ela salvou', () => {
  assert.equal(proximaDaSequencia({ atual: m('a'), playlist: PL }).id, 'b');
  assert.equal(proximaDaSequencia({ atual: m('b'), playlist: PL }).id, 'c');
});

test('playlist salva: no fim da lista volta pro começo — rádio de trabalho não emudece', () => {
  assert.equal(proximaDaSequencia({ atual: m('c'), playlist: PL }).id, 'a');
});

test('playlist salva vence a estação, mesmo quando a faixa salva carrega um slot', () => {
  // favoritar uma estação salva o objeto INTEIRO, com slot junto
  const salvaComSlot = { ...m('f2'), slot: 'foco' };
  const prox = proximaDaSequencia({
    atual: salvaComSlot,
    playlist: [m('a'), salvaComSlot, m('c')],
    estacoes: ESTACOES,
  });
  assert.equal(prox.id, 'c', 'deveria seguir a playlist salva, não a fila da vaga');
});

// ── 2. sem playlist salva → a primeira escolha dele ──────────────────
test('sem playlist salva: anda na fila da estação que ELE escolheu', () => {
  const atual = { ...ESTACOES[0], ...cand('f1') };
  assert.equal(proximaDaSequencia({ atual, playlist: [], estacoes: ESTACOES }).id, 'f2');
});

test('sem playlist salva: a fila da estação também dá a volta', () => {
  const atual = { ...ESTACOES[0], ...cand('f3') };
  const prox = proximaDaSequencia({ atual, playlist: [], estacoes: ESTACOES });
  assert.equal(prox.id, 'f1');
  assert.equal(prox.slot, 'foco', 'continua sendo a mesma estação');
  assert.equal(prox.nome, 'Foco');
});

test('a próxima entra sem o título da anterior grudado', () => {
  const atual = { ...ESTACOES[0], ...cand('f1'), tocando: 'Kimo Sound ~ Rise Slow' };
  assert.equal(proximaDaSequencia({ atual, playlist: [], estacoes: ESTACOES }).tocando, null);
});

test('estação escolhida continua mandando mesmo com playlist salva — clicar em Foco não é sequestrado', () => {
  const atual = { ...ESTACOES[0], ...cand('f1') };
  assert.equal(proximaDaSequencia({ atual, playlist: PL, estacoes: ESTACOES }).id, 'f2');
});

// ── 3. link avulso ───────────────────────────────────────────────────
test('link colado que acaba: cai na coleção dela, se existir', () => {
  assert.equal(proximaDaSequencia({ atual: m('zz'), playlist: PL, estacoes: ESTACOES }).id, 'a');
});

test('link colado sem coleção e sem fila: devolve null — quem chama repete a faixa', () => {
  assert.equal(proximaDaSequencia({ atual: m('zz'), playlist: [], estacoes: ESTACOES }), null);
  assert.equal(proximaDaSequencia({ atual: { ...ESTACOES[1], ...m('zz') }, playlist: [], estacoes: ESTACOES }), null);
});

test('entradas quebradas não derrubam nada', () => {
  assert.equal(proximaDaSequencia(), null);
  assert.equal(proximaDaSequencia({ atual: null, playlist: null, estacoes: null }), null);
  assert.equal(proximaDaSequencia({ atual: m('a'), playlist: [{ nome: 'sem id' }, m('b')] }).id, 'b');
});

test('cai pra estação quando o `atual` não tem id mas a estação tem', () => {
  const prox = proximaDaSequencia({ atual: null, estacao: { slot: 'foco', id: 'f2' }, playlist: [], estacoes: ESTACOES });
  assert.equal(prox.id, 'f3');
});

// ── a tela usa mesmo isso ────────────────────────────────────────────
test('o X-MUSIC escuta o fim da faixa e chama a sequência', () => {
  assert.match(XMUSIC, /YT\.PlayerState\?\.ENDED/);
  assert.match(XMUSIC, /onFim=\{aoTerminar\}/);
  assert.match(XMUSIC, /proximaDaSequencia\(\{ atual: alvo, playlist, estacao, estacoes \}\)/);
});

test('não tendo pra onde ir, o player repete em vez de emudecer', () => {
  assert.match(XMUSIC, /if \(!seguiu\) \{[\s\S]*?seekTo\?\.\(0\)[\s\S]*?playVideo/);
});

test('lista de um item só não trava: repete em vez de tentar trocar pra si mesma', () => {
  assert.match(XMUSIC, /prox\.id === \(alvo\?\.id \|\| estacao\?\.id\)\) return false/);
  assert.equal(proximaDaSequencia({ atual: m('a'), playlist: [m('a')] }).id, 'a');
});
