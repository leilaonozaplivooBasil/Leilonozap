// 🔗 Os três destinos — dia, Jornada e quadro — e as frases que a tela fala (dono, 06/09/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ondeEsta, pilulasOndeEsta, fraseVaiEntrar, planoDeEntrada, ligarCartaoATarefa, fraseEntrou } from '../src/lib/destinos.js';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

test('onde está: card solto = só quadro; card ligado sem hora = dia mas fora da Jornada; com hora = Jornada', () => {
  assert.deepEqual(ondeEsta({ cartao: { id: 'c' } }), { quadro: true, dia: false, jornada: false, hora: null });
  assert.deepEqual(ondeEsta({ cartao: { id: 'c', virou_tarefa_id: 't' } }), { quadro: true, dia: true, jornada: false, hora: null });
  assert.deepEqual(ondeEsta({ cartao: { id: 'c', virou_tarefa_id: 't', hora: '18:00' } }), { quadro: true, dia: true, jornada: true, hora: '18:00' });
  assert.deepEqual(ondeEsta({ tarefa: { id: 't', hora: '09:30' } }), { quadro: false, dia: true, jornada: true, hora: '09:30' });
  assert.deepEqual(ondeEsta({ tarefa: { id: 't', hora: 'xx' } }).jornada, false, 'hora inválida não põe na Jornada');
});

test('as pílulas: o caso confuso (no dia sem horário) vira alerta escrito', () => {
  const p = pilulasOndeEsta(ondeEsta({ cartao: { id: 'c', virou_tarefa_id: 't' } }), { listaNome: 'Academia' });
  assert.deepEqual(p.map((x) => [x.id, x.acesa, x.texto, !!x.alerta]), [
    ['quadro', true, 'no quadro · Academia', false],
    ['dia', true, 'no seu dia', false],
    ['jornada', false, 'sem horário · fora da Jornada', true],
  ]);
  const q = pilulasOndeEsta(ondeEsta({ cartao: { id: 'c' } }));
  assert.deepEqual(q.map((x) => x.texto), ['no quadro', 'fora do dia', 'fora da Jornada']);
  const r = pilulasOndeEsta(ondeEsta({ cartao: { id: 'c', virou_tarefa_id: 't', hora: '07:00' } }));
  assert.equal(r[2].texto, 'na Jornada às 07:00');
});

test('a frase enquanto escreve — da lista: dia certo, Jornada se tiver hora, quadro se pedir', () => {
  assert.deepEqual(fraseVaiEntrar({ origem: 'lista' }), { texto: 'Vai entrar: no seu dia, sem horário', aviso: 'sem horário fica fora da Jornada — dê uma hora pra entrar na linha do tempo', destinos: { dia: true, quadro: false, jornada: false } });
  const f = fraseVaiEntrar({ origem: 'lista', hora: '09:00', noQuadro: true, listaNome: 'Pessoal' });
  assert.deepEqual([f.texto, f.aviso], ['Vai entrar: no seu dia, na Jornada às 09:00 · no quadro (Pessoal)', null]);
});

test('a frase enquanto escreve — do quadro: quadro certo, dia e Jornada se pedir', () => {
  const so = fraseVaiEntrar({ origem: 'quadro', listaNome: 'Academia' });
  assert.deepEqual([so.texto, so.aviso], ['Vai entrar: no quadro (Academia)', 'fica só no quadro, fora do seu dia']);
  const com = fraseVaiEntrar({ origem: 'quadro', listaNome: 'Academia', noDia: true, hora: '18:00' });
  assert.deepEqual([com.texto, com.aviso, com.destinos], ['Vai entrar: no quadro (Academia) · no seu dia, na Jornada às 18:00', null, { dia: true, quadro: true, jornada: true }]);
  assert.match(fraseVaiEntrar({ origem: 'quadro', noDia: true }).aviso, /sem horário fica fora da Jornada/);
});

test('o plano de entrada monta as linhas certas e nada mais', () => {
  const base = { userId: 'u1', dataISO: '2026-09-07', listaId: 'l1', ordemTarefa: 3, ordemCard: 5 };
  // da lista, só o dia
  const a = planoDeEntrada({ ...base, origem: 'lista', titulo: '  Ligar pro fornecedor ' });
  assert.deepEqual(a.tarefa, { user_id: 'u1', data: '2026-09-07', hora: null, hora_fim: null, titulo: 'Ligar pro fornecedor', detalhe: '', feito: false, ordem: 3, habito: null });
  assert.equal(a.cartao, null);
  // da lista, com hora e também no quadro
  const b = planoDeEntrada({ ...base, origem: 'lista', titulo: 'Treino', hora: '18:00', horaFim: '19:00', noQuadro: true, habito: 2 });
  assert.deepEqual([b.tarefa.hora, b.tarefa.hora_fim, b.cartao.lista_id, b.cartao.hora, b.cartao.coluna, b.cartao.ordem, b.cartao.habito], ['18:00', '19:00', 'l1', '18:00', 'aberto', 5, 2]);
  // hora_fim antes da hora é descartada
  assert.equal(planoDeEntrada({ ...base, origem: 'lista', titulo: 'x', hora: '18:00', horaFim: '17:00' }).tarefa.hora_fim, null);
  // do quadro, só o quadro
  const c = planoDeEntrada({ ...base, origem: 'quadro', titulo: 'Segunda — Empurrar A' });
  assert.deepEqual([c.tarefa, c.cartao.titulo, c.cartao.hora], [null, 'Segunda — Empurrar A', null]);
  // do quadro, também no dia às 07:00
  const d = planoDeEntrada({ ...base, origem: 'quadro', titulo: 'Segunda — Empurrar A', noDia: true, hora: '07:00' });
  assert.deepEqual([d.tarefa.data, d.tarefa.hora, d.cartao.hora], ['2026-09-07', '07:00', '07:00']);
  // sem título / sem lista
  assert.equal(planoDeEntrada({ ...base, titulo: '   ' }).erro, 'sem título');
  assert.deepEqual(planoDeEntrada({ ...base, origem: 'quadro', titulo: 'x', listaId: null }), { tarefa: null, cartao: null, erro: 'sem lista no quadro' });
});

test('ligar o card à tarefa e a frase do "entrou"', () => {
  const c = ligarCartaoATarefa({ id: 'c1', titulo: 'x' }, 't9', '2026-09-07T10:00:00.000Z');
  assert.deepEqual([c.virou_tarefa_id, c.virou_tarefa_em], ['t9', '2026-09-07T10:00:00.000Z']);
  assert.equal(ligarCartaoATarefa({ id: 'c1' }, null).virou_tarefa_id, undefined);
  assert.equal(fraseEntrou({ tarefa: { hora: '18:00' }, cartao: { id: 'c' } }, { listaNome: 'Academia' }), 'Entrou no quadro (Academia) e no seu dia, na Jornada às 18:00.');
  assert.equal(fraseEntrou({ tarefa: { hora: null }, cartao: null }), 'Entrou no seu dia (sem horário).');
  assert.equal(fraseEntrou({ tarefa: null, cartao: { id: 'c' } }), 'Entrou no quadro.');
});

// ── 🌑 09/09/2026 — "fundo branco em mais um campo descoberto" (dono, com print) ──
test('🌑 o campo de nova tarefa da Jornada é ESCURO — a Jornada deixou de ser branca', () => {
  // Ele nasceu quando a Jornada ainda era painel claro. O painel virou escuro e
  // o campo ficou pra trás: caixa branca no meio do preto, com a hora sumindo de
  // tão clara. O componente sabe ser escuro desde a DIR-90; faltava avisar aqui.
  const METODO = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8'));
  const linha = METODO.split('\n').find((l) => l.includes('testeCampo="campo-nova-tarefa"'));
  assert.ok(linha, 'sumiu o campo de nova tarefa da Jornada');
  assert.match(linha, /\bescuro\b/, 'sem `escuro` ele volta a ser uma caixa branca no meio do painel preto');
});

test('🌑 o componente é escuro de ponta a ponta — nada de meio-termo ilegível', () => {
  // Um pedaço claro no meio do escuro é pior que tudo claro: o campo da hora
  // fica branco no branco e a pessoa não vê o que digitou.
  const PECA = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/EntradaComDestinos.jsx', import.meta.url), 'utf8'));
  // os três lugares que pintam fundo: o campo do título, a caixa de destinos e
  // os campinhos (hora/lista). Todos têm que perguntar pelo `escuro`.
  assert.equal((PECA.match(/escuro\s*\n?\s*\?/g) || []).length + (PECA.match(/escuro \?/g) || []).length >= 3, true,
    'algum fundo deixou de perguntar se a tela é escura');
  assert.match(PECA, /campoEscuro/, 'sumiu o estilo escuro dos campinhos (hora/lista)');
  assert.match(PECA, /\[color-scheme:dark\]/, 'sem color-scheme:dark o seletor de hora do navegador volta branco');
});
