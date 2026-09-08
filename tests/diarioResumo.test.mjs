// 📔 O RESUMO NARRADO DA SEMANA (terreno da Fase 3, 08/09/2026) — só o
// prompt, sem tocar em rede nem em IA nenhuma.
import test from 'node:test';
import assert from 'node:assert/strict';
import { diarioAgrupado } from '../src/lib/diarioDeBolso.js';
import { promptDoResumoSemanal, sistemaDoResumoSemanal, RESUMO_SEMANAL_MAX_ENTRADAS, SCHEMA_RESUMO_SEMANAL } from '../src/lib/diarioResumo.js';

test('promptDoResumoSemanal: sem tarefa nenhuma, devolve null — nunca chama a IA com prompt vazio', () => {
  assert.equal(promptDoResumoSemanal([]), null);
  assert.equal(promptDoResumoSemanal(), null);
});

test('promptDoResumoSemanal: cada dia vira um bloco, cada tarefa vira uma linha, o texto e a nota entram quando existem', () => {
  const dias = diarioAgrupado([
    { id: 'a', data: '2026-09-08', hora: '09:00', titulo: 'Leitura do dia', detalhe: 'sobre follow-up' },
    { id: 'b', data: '2026-09-07', hora: '13:00', titulo: 'Reunião 1' },
  ], { a: 'me ajudou a fechar uma venda' });
  const prompt = promptDoResumoSemanal(dias);
  assert.match(prompt, /2026-09-08:/);
  assert.match(prompt, /2026-09-07:/);
  assert.match(prompt, /Leitura do dia/);
  assert.match(prompt, /sobre follow-up/);
  assert.match(prompt, /nota da pessoa: me ajudou a fechar uma venda/);
  // dias em ordem crescente no prompt (a narrativa lê como a semana aconteceu, não do fim pro começo)
  assert.ok(prompt.indexOf('2026-09-07') < prompt.indexOf('2026-09-08'));
});

test('promptDoResumoSemanal: respeita o teto de entradas — nunca manda a lista inteira sem limite pro custo', () => {
  const tarefas = Array.from({ length: RESUMO_SEMANAL_MAX_ENTRADAS + 50 }, (_, i) => ({
    id: `t${i}`, data: '2026-09-08', hora: String(i % 24).padStart(2, '0') + ':00', titulo: `Tarefa ${i}`,
  }));
  const dias = diarioAgrupado(tarefas);
  const prompt = promptDoResumoSemanal(dias);
  const linhas = prompt.split('\n').filter((l) => l.startsWith('- '));
  assert.equal(linhas.length, RESUMO_SEMANAL_MAX_ENTRADAS);
});

test('sistemaDoResumoSemanal: existe, é texto, e não é genérico (fala de narrativa, não de relatório de números)', () => {
  const s = sistemaDoResumoSemanal();
  assert.equal(typeof s, 'string');
  assert.ok(s.length > 100);
  assert.match(s, /narrativa/i);
});

test('SCHEMA_RESUMO_SEMANAL: pede exatamente o campo resumo, como string', () => {
  assert.deepEqual(SCHEMA_RESUMO_SEMANAL.required, ['resumo']);
  assert.equal(SCHEMA_RESUMO_SEMANAL.properties.resumo.type, 'string');
});
