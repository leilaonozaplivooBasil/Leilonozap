// 🦉 O rodapé da Jornada, estilo Duolingo — 23/09/2026
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { PERIODOS_DO_RODAPE, ID_MOMENTO, ID_DIA_INTEIRO, estadoDoPeriodo, itensDoRodape, podeIr, barraDaJornada } from '../src/lib/rodapeDaJornada.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const g = (rotulo, feitos) => ({ rotulo, itens: feitos.map((f, i) => ({ id: `${rotulo}${i}`, feito: f })) });

test('os quatro períodos da Jornada, na ordem do dia, com os mesmos rótulos que ela usa', () => {
  assert.deepEqual(PERIODOS_DO_RODAPE.map((p) => p.id), ['AMANHECER', 'MANHÃ', 'TARDE', 'NOITE']);
  assert.equal(ID_MOMENTO, 'momento');
});

test('estado do período: vazio sem parada, feito com tudo feito, atual onde a pessoa está, futuro no resto', () => {
  assert.equal(estadoDoPeriodo(undefined, 'MANHÃ'), 'vazio');
  assert.equal(estadoDoPeriodo({ rotulo: 'TARDE', itens: [] }, 'MANHÃ'), 'vazio');
  assert.equal(estadoDoPeriodo(g('AMANHECER', [true, true]), 'MANHÃ'), 'feito');
  assert.equal(estadoDoPeriodo(g('MANHÃ', [true, false]), 'MANHÃ'), 'atual');
  assert.equal(estadoDoPeriodo(g('TARDE', [false, false]), 'MANHÃ'), 'futuro');
  // período atual com tudo feito já é troféu, não "atual"
  assert.equal(estadoDoPeriodo(g('MANHÃ', [true]), 'MANHÃ'), 'feito');
});

test('a barra: AGORA primeiro (aceso quando recolhida), depois os períodos com o estado de cada um', () => {
  const grupos = [g('AMANHECER', [true, true]), g('MANHÃ', [true, false]), g('NOITE', [false])];
  const recolhida = itensDoRodape({ grupos, periodoAtual: 'MANHÃ', expandida: false });
  assert.deepEqual(recolhida.map((i) => [i.id, i.estado]), [
    ['momento', 'atual'], ['AMANHECER', 'feito'], ['MANHÃ', 'atual'], ['TARDE', 'vazio'], ['NOITE', 'futuro'],
  ]);
  assert.deepEqual(recolhida.map((i) => i.rotulo), ['Agora', 'Amanhecer', 'Manhã', 'Tarde', 'Noite']);
  const expandida = itensDoRodape({ grupos, periodoAtual: 'MANHÃ', expandida: true });
  assert.equal(expandida[0].estado, 'futuro', 'expandida: o AGORA deixa de ser o item aceso');
  assert.equal(itensDoRodape().length, 5, 'sem nada, a barra continua com 5 lugares');
  assert.ok(itensDoRodape().slice(1).every((i) => i.estado === 'vazio'));
});

test('período vazio não tem pra onde ir', () => {
  assert.equal(podeIr({ estado: 'vazio' }), false);
  assert.equal(podeIr({ estado: 'feito' }), true);
  assert.equal(podeIr({ estado: 'futuro' }), true);
  assert.equal(podeIr(null), false);
});

test('a Jornada monta o rodapé nos dois modos, com um ref por período, e o rodapé avisa os flutuantes', () => {
  const J = ler('../src/components/licensing/CentralVendas/XGameJornada.jsx');
  const R = ler('../src/components/licensing/CentralVendas/RodapeDaJornada.jsx');
  assert.equal((J.match(/\{rodape\}/g) || []).length, 2);
  assert.ok(J.includes("ref={(el) => { refsPeriodo.current[g.rotulo] = el; }}"));
  // DIR-180 — "voltar pro agora" agora devolve o FOCO, não só a rolagem
  assert.ok(J.includes('if (id === ID_MOMENTO) {'));
  assert.ok(J.includes('setFocoId(null);'));
  assert.ok(J.includes("if (!expandida) { alvoRef.current = id; setExpandida(true); return; }"));
  assert.ok(R.includes("document.body.classList.add('nz-rodape-jornada')"));
  assert.ok(R.includes('.nz-rodape-jornada .nz-dock-bottom { bottom: calc(var(--nz-dock-b) + 4.5rem) !important; }'));
  assert.ok(R.includes('disabled={!clicavel}'));
});

// ── DIR-180 — a barra muda com a tela ──
test('DIR-180 · no MOMENTO a barra é UM botão, e o rótulo é sempre a ação certa da hora', () => {
  const grupos = [g('AMANHECER', [true, true]), g('MANHÃ', [true, false]), g('NOITE', [false])];
  const base = { grupos, periodoAtual: 'MANHÃ', expandida: false, feitas: 4, total: 11 };

  // já no agora → o botão abre o dia inteiro
  const noAgora = barraDaJornada(base);
  assert.equal(noAgora.modo, 'abrir');
  assert.equal(noAgora.id, ID_DIA_INTEIRO);
  assert.equal(noAgora.rotulo, 'Ver o dia inteiro');
  assert.equal(noAgora.detalhe, '4 de 11 passos');
  assert.equal(noAgora.pct, 36);
  assert.equal(noAgora.completo, false);
  assert.equal(noAgora.itens, undefined, 'no momento a barra não tem azulejo nenhum');

  // espiando outro passo com as setas → o botão vira "voltar pro agora"
  const espiando = barraDaJornada({ ...base, foraDoAgora: true });
  assert.equal(espiando.modo, 'voltar');
  assert.equal(espiando.id, ID_MOMENTO);
  assert.equal(espiando.rotulo, 'Voltar pro agora');
  assert.equal(espiando.detalhe, 'você está espiando outro passo');
});

test('DIR-180 · na jornada EXPANDIDA os períodos voltam — lá eles navegam de verdade', () => {
  const grupos = [g('AMANHECER', [true, true]), g('MANHÃ', [true, false]), g('NOITE', [false])];
  const aberta = barraDaJornada({ grupos, periodoAtual: 'MANHÃ', expandida: true, feitas: 4, total: 11 });
  assert.equal(aberta.modo, 'mapa');
  assert.deepEqual(aberta.itens.map((i) => [i.id, i.estado]), [
    ['momento', 'futuro'], ['AMANHECER', 'feito'], ['MANHÃ', 'atual'], ['TARDE', 'vazio'], ['NOITE', 'futuro'],
  ]);
  assert.equal(aberta.rotulo, undefined, 'no mapa não existe botão único');
});

test('DIR-180 · dia perfeito e dia vazio não quebram a conta nem o texto', () => {
  const perfeito = barraDaJornada({ feitas: 9, total: 9 });
  assert.equal(perfeito.completo, true);
  assert.equal(perfeito.pct, 100);
  assert.equal(perfeito.detalhe, 'dia perfeito · 9 de 9 passos');

  const vazio = barraDaJornada({ feitas: 0, total: 0 });
  assert.equal(vazio.pct, 0, 'sem passo nenhum a barra não divide por zero');
  assert.equal(vazio.completo, false, 'dia sem passo NÃO é dia perfeito');
  assert.equal(vazio.detalhe, 'nenhum passo hoje');

  // lixo na entrada não vira NaN na tela
  assert.equal(barraDaJornada({ feitas: null, total: undefined }).pct, 0);
  assert.equal(barraDaJornada({ feitas: -3, total: 10 }).pct, 0);
  assert.equal(barraDaJornada({ feitas: 99, total: 10 }).pct, 100, 'nunca passa de 100%');
});

test('DIR-180 · a Jornada e o rodapé usam a barra nova, e o período vazio deixa de parecer castigo', () => {
  const J = ler('../src/components/licensing/CentralVendas/XGameJornada.jsx');
  const R = ler('../src/components/licensing/CentralVendas/RodapeDaJornada.jsx');
  assert.ok(J.includes('barraDaJornada('), 'a Jornada não monta a barra pela lib');
  assert.ok(J.includes('foraDoAgora'), 'a Jornada não diz se o foco saiu do agora');
  assert.ok(J.includes(`id === ID_DIA_INTEIRO`), 'a Jornada não trata o "ver o dia inteiro"');
  assert.ok(R.includes("barra.modo === 'mapa'"), 'o rodapé não separa os dois modos');
  // o cinza apagado lia como "bloqueado"; agora o vazio DIZ o que é
  assert.ok(R.includes('sem parada'), 'o período vazio não se explica');
});
