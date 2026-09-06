// O pronto com prazo e o enviar-e-voltar (06/09/2026): "começar tal hora e
// entregar até tal hora; aparece pra ele dar o pronto até; a gente cobra".
import test from 'node:test';
import assert from 'node:assert/strict';
import { prazoDe, rotuloDoPrazo, estadoDoPronto, carimboDoPronto, carimboDaDevolucao, filaDoPronto } from '../src/lib/pronto.js';

test('prazoDe: dia + hora viram o "pronto até" no fuso local; sem hora, 18:00', () => {
  const p = new Date(prazoDe('2026-09-08', '17:30'));
  assert.deepEqual([p.getFullYear(), p.getMonth() + 1, p.getDate(), p.getHours(), p.getMinutes()], [2026, 9, 8, 17, 30]);
  assert.equal(new Date(prazoDe('2026-09-08')).getHours(), 18);
  assert.equal(prazoDe(''), null);
  assert.equal(prazoDe('xx'), null);
});

test('rotuloDoPrazo: só a hora quando é hoje; dia e hora quando não é', () => {
  assert.equal(rotuloDoPrazo(prazoDe('2026-09-08', '18:00'), '2026-09-08'), 'pronto até 18:00');
  assert.equal(rotuloDoPrazo(prazoDe('2026-09-09', '09:15'), '2026-09-08'), 'pronto até 09/09 09:15');
  assert.equal(rotuloDoPrazo(null), null);
});

test('estadoDoPronto: aguardando → atrasada → pronto (no prazo ou atrasado) → conferida; devolvida espera a pessoa', () => {
  const prazo = prazoDe('2026-09-08', '18:00');
  const antes = new Date('2026-09-08T15:00:00');
  const depois = new Date('2026-09-08T19:00:00');
  assert.equal(estadoDoPronto({ prazo_em: prazo }, antes).id, 'aguardando');
  assert.equal(estadoDoPronto({ prazo_em: prazo }, depois).id, 'atrasada');
  assert.deepEqual(estadoDoPronto({ prazo_em: prazo, feito: true, pronto_em: antes.toISOString() }, depois), { id: 'pronto', rotulo: 'pronto', atrasou: false });
  assert.deepEqual(estadoDoPronto({ prazo_em: prazo, feito: true, pronto_em: depois.toISOString() }, depois), { id: 'pronto', rotulo: 'pronto (atrasado)', atrasou: true });
  assert.equal(estadoDoPronto({ prazo_em: prazo, feito: true, conferido: true, pronto_em: antes.toISOString() }, depois).id, 'conferida');
  assert.equal(estadoDoPronto({ prazo_em: prazo, devolvida_motivo: 'faltou o print' }, antes).id, 'devolvida');
  assert.equal(estadoDoPronto({}, antes).id, 'aguardando', 'sem prazo nunca atrasa');
});

test('os carimbos: dar o pronto limpa a devolução; devolver desfaz o pronto e o SIM, com o recado', () => {
  const agora = new Date('2026-09-08T16:00:00');
  assert.deepEqual(carimboDoPronto(true, agora), { feito: true, pronto_em: agora.toISOString(), devolvida_motivo: null, devolvida_em: null });
  assert.deepEqual(carimboDoPronto(false, agora), { feito: false, pronto_em: null });
  assert.deepEqual(carimboDaDevolucao('  faltou o print ', agora), { feito: false, pronto_em: null, conferido: null, devolvida_motivo: 'faltou o print', devolvida_em: agora.toISOString() });
  assert.equal(carimboDaDevolucao('', agora).devolvida_motivo, 'refazer');
});

test('filaDoPronto: só as distribuídas, atrasadas primeiro, depois os prontos a conferir; conferidas por último', () => {
  const agora = new Date('2026-09-08T19:00:00');
  const prazo = prazoDe('2026-09-08', '18:00');
  const fila = filaDoPronto([
    { id: 'rotina', titulo: 'Gratidão' },
    { id: 'c', origem: 'xperf', prazo_em: prazo, feito: true, conferido: true, pronto_em: '2026-09-08T10:00:00Z' },
    { id: 'p', origem: 'xperf', prazo_em: prazo, feito: true, pronto_em: '2026-09-08T10:00:00Z' },
    { id: 'a', origem: 'xperf', prazo_em: prazo },
    { id: 'd', origem: 'xperf', prazo_em: prazo, devolvida_motivo: 'x' },
    { id: 'g', origem: 'xperf', prazo_em: prazoDe('2026-09-09', '18:00') },
  ], agora);
  assert.deepEqual(fila.map((f) => [f.tarefa.id, f.estado.id]), [['a', 'atrasada'], ['p', 'pronto'], ['d', 'devolvida'], ['g', 'aguardando'], ['c', 'conferida']]);
});
