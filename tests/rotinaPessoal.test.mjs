import test from 'node:test';
import assert from 'node:assert/strict';
import {
  itemDaRotina, ordenarRotina, incluirNaRotina, editarNaRotina, excluirDaRotina,
  estadoDaRotina, deveGerarSozinha, rotinaEmVigor, valeAPartirDe, devePreAbrirAutomatico, jaGerouHoje,
} from '../src/lib/rotinaPessoal.js';

const CASA = [{ hora: '05:00', titulo: 'Acordar' }, { hora: '08:00', titulo: 'Caminho pra empresa' }];

// ─── editar, excluir, incluir: a rotina passa a ser DELA ─────────────────────

test('incluir entra na ordem do relógio, não no fim da lista', () => {
  const r = incluirNaRotina(CASA, { hora: '06:30', titulo: 'Treino' });
  assert.deepEqual(r.map((i) => i.hora), ['05:00', '06:30', '08:00']);
});

test('excluir tira do modelo — é isso que muda TODO dia', () => {
  const r = excluirDaRotina(CASA, 1);
  assert.equal(r.length, 1);
  assert.equal(r[0].titulo, 'Acordar');
});

test('quem não vai pra empresa tira "Caminho pra empresa" e a rotina é dela', () => {
  const r = excluirDaRotina(CASA, 1);
  assert.ok(!r.some((i) => /empresa/i.test(i.titulo)));
});

test('editar troca hora e título, e reordena se a hora mudou', () => {
  const r = editarNaRotina(CASA, 0, { hora: '09:00', titulo: 'Acordar tarde' });
  assert.deepEqual(r.map((i) => i.titulo), ['Caminho pra empresa', 'Acordar tarde']);
});

test('índice inválido não cria lixo nem quebra', () => {
  assert.deepEqual(editarNaRotina(CASA, 99, { titulo: 'x' }).length, 2);
  assert.deepEqual(excluirDaRotina(CASA, -1).length, 2);
  assert.deepEqual(excluirDaRotina(CASA, 1.5).length, 2);
});

test('esvaziar o título NÃO apaga o item — pra apagar existe a lixeira', () => {
  const r = editarNaRotina(CASA, 0, { titulo: '   ' });
  assert.equal(r.length, 2, 'salvar vazio não pode sumir com a linha sem a pessoa mandar');
});

test('incluir sem título não entra', () => {
  assert.equal(incluirNaRotina(CASA, { hora: '10:00', titulo: '  ' }).length, 2);
});

test('hora inválida vira "sem hora", e sem hora vai pro fim', () => {
  assert.equal(itemDaRotina({ hora: '25:99', titulo: 'x' }).hora, '');
  const r = incluirNaRotina(CASA, { titulo: 'Quando der' });
  assert.equal(r[r.length - 1].titulo, 'Quando der');
});

test('nada é mutado no lugar — a lista original continua intacta', () => {
  const original = [{ hora: '05:00', titulo: 'Acordar' }];
  const copia = JSON.parse(JSON.stringify(original));
  excluirDaRotina(original, 0);
  incluirNaRotina(original, { titulo: 'novo' });
  editarNaRotina(original, 0, { titulo: 'outro' });
  assert.deepEqual(original, copia);
});

// ─── a rotina em vigor ───────────────────────────────────────────────────────

test('sem rotina própria, vale a da casa', () => {
  assert.deepEqual(rotinaEmVigor({}, CASA).map((i) => i.titulo), CASA.map((i) => i.titulo));
  assert.deepEqual(rotinaEmVigor({ rotina: [] }, CASA).length, CASA.length);
});

test('com rotina própria, a da casa NÃO se mistura', () => {
  const minha = [{ hora: '07:00', titulo: 'Levar o filho na escola' }];
  const r = rotinaEmVigor({ rotina: minha }, CASA);
  assert.equal(r.length, 1);
  assert.ok(!r.some((i) => /empresa/i.test(i.titulo)));
});

// ─── a geração automática e as duas travas ───────────────────────────────────

const LIGADA = { rotina_automatica: true, rotina_automatica_desde: '2026-09-01' };

test('ligada e dia vazio: gera sozinha', () => {
  assert.equal(deveGerarSozinha({ perfil: LIGADA, dia: '2026-09-06', hojeISO: '2026-09-06', tarefasDoDia: [] }), true);
});

test('TRAVA 1 — dia com qualquer tarefa NÃO é tocado (abrir duas vezes não duplica)', () => {
  assert.equal(deveGerarSozinha({ perfil: LIGADA, dia: '2026-09-06', hojeISO: '2026-09-06', tarefasDoDia: [{ id: 1 }] }), false);
});

test('TRAVA 2 — nunca gera pra trás: dia passado não vira tarefa perdida que nunca existiu', () => {
  assert.equal(deveGerarSozinha({ perfil: LIGADA, dia: '2026-09-05', hojeISO: '2026-09-06', tarefasDoDia: [] }), false);
});

test('nunca antes do dia em que ela ligou — ligar hoje não enche a semana passada', () => {
  const perfil = { rotina_automatica: true, rotina_automatica_desde: '2026-09-06' };
  assert.equal(deveGerarSozinha({ perfil, dia: '2026-09-05', hojeISO: '2026-09-01', tarefasDoDia: [] }), false);
});

test('desligada não gera nada — "só se a pessoa pedir pra parar" tem que parar de verdade', () => {
  assert.equal(deveGerarSozinha({ perfil: { rotina_automatica: false }, dia: '2026-09-06', hojeISO: '2026-09-06', tarefasDoDia: [] }), false);
});

test('gera pra FRENTE: abrir amanhã já traz o dia montado', () => {
  assert.equal(deveGerarSozinha({ perfil: LIGADA, dia: '2026-09-07', hojeISO: '2026-09-06', tarefasDoDia: [] }), true);
});

test('sem dia ou sem hoje não age (nunca chuta a data)', () => {
  assert.equal(deveGerarSozinha({ perfil: LIGADA, dia: null, hojeISO: '2026-09-06' }), false);
  assert.equal(deveGerarSozinha({ perfil: LIGADA, dia: '2026-09-06', hojeISO: null }), false);
});

test('perfil ausente não quebra e não gera', () => {
  assert.equal(deveGerarSozinha({ perfil: null, dia: '2026-09-06', hojeISO: '2026-09-06', tarefasDoDia: [] }), false);
  assert.equal(estadoDaRotina(null).automatica, false);
  assert.equal(estadoDaRotina(undefined).propria, false);
});

// ─── DIR-81 — a casa liga sozinha quem nunca decidiu nada ────────────────────

test('quem nunca mexeu em nada: a casa pode ligar sozinha', () => {
  assert.equal(devePreAbrirAutomatico({}), true);
  assert.equal(devePreAbrirAutomatico(null), true);
});

test('quem já ligou por conta própria: a casa não mexe de novo', () => {
  assert.equal(devePreAbrirAutomatico(LIGADA), false);
});

test('quem já PEDIU pra parar: a casa nunca religa sozinha, mesmo com automatica false', () => {
  assert.equal(devePreAbrirAutomatico({ rotina_automatica: false, rotina_automatica_recusada: true }), false);
  assert.equal(estadoDaRotina({ rotina_automatica_recusada: true }).recusada, true);
});

// ─── DIR-81.1 — a idempotência do cron não pode depender de metodo_tarefas ──
// Um compromisso avulso (reunião sincronizada, demanda) não é a Rotina
// Perfeita — não pode travar ela de nascer.

test('rotina_gerada_em de hoje: já gerou hoje', () => {
  assert.equal(jaGerouHoje({ rotina_gerada_em: '2026-09-07' }, '2026-09-07'), true);
});

test('rotina_gerada_em de outro dia: não conta como hoje', () => {
  assert.equal(jaGerouHoje({ rotina_gerada_em: '2026-09-06' }, '2026-09-07'), false);
});

test('sem rotina_gerada_em nenhuma: nunca gerou', () => {
  assert.equal(jaGerouHoje({}, '2026-09-07'), false);
  assert.equal(jaGerouHoje(null, '2026-09-07'), false);
});

test('um compromisso avulso em metodo_tarefas não é rotina_gerada_em — a régua é só o perfil', () => {
  // o cenário real: o perfil nunca gerou nada, mas o dia já tem uma reunião
  // sincronizada do Contato & Convite — jaGerouHoje nem olha pra isso.
  assert.equal(jaGerouHoje({ rotina_automatica: true }, '2026-09-07'), false);
});

test('editar a rotina vale a partir de AMANHÃ — o dia de hoje fica como está', () => {
  assert.equal(valeAPartirDe('2026-09-06'), '2026-09-07');
  assert.equal(valeAPartirDe('2026-09-30'), '2026-10-01');   // vira o mês
  assert.equal(valeAPartirDe('2026-12-31'), '2027-01-01');   // vira o ano
  assert.equal(valeAPartirDe('banana'), null);
});
