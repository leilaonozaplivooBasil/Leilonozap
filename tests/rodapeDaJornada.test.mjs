// 🦉 O rodapé da Jornada, estilo Duolingo — 23/09/2026
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { PERIODOS_DO_RODAPE, ID_MOMENTO, estadoDoPeriodo, itensDoRodape, podeIr } from '../src/lib/rodapeDaJornada.js';

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
  assert.ok(J.includes("if (id === ID_MOMENTO) { setExpandida(false);"));
  assert.ok(J.includes("if (!expandida) { alvoRef.current = id; setExpandida(true); return; }"));
  assert.ok(R.includes("document.body.classList.add('nz-rodape-jornada')"));
  assert.ok(R.includes('.nz-rodape-jornada .nz-dock-bottom { bottom: calc(var(--nz-dock-b) + 4.5rem) !important; }'));
  assert.ok(R.includes('disabled={!clicavel}'));
});
