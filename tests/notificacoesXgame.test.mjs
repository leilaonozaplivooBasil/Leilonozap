// 🔔 DIR-130 (09/09/2026) — o sino de notificação persistente. Dono: "não
// pode ter certeza que ela viu, e ficar no sininho pra ela ler."
import test from 'node:test';
import assert from 'node:assert/strict';
import { proximaParaBanner, SEGUNDOS_ANTES_DE_FECHAR } from '../src/lib/notificacoesXgame.js';

const msg = (id, { lida = false, created_at = '2026-09-09T10:00:00.000Z' } = {}) => ({ id, lida, created_at, texto: `msg ${id}`, remetente_nome: 'x', tipo: 'demanda' });

test('proximaParaBanner: sem mensagens recebidas, não tem banner', () => {
  assert.equal(proximaParaBanner([], new Set()), null);
});

test('proximaParaBanner: ignora as já lidas', () => {
  assert.equal(proximaParaBanner([msg('a', { lida: true })], new Set()), null);
});

test('proximaParaBanner: ignora as já dispensadas nesta sessão (mas não marca como lida)', () => {
  assert.equal(proximaParaBanner([msg('a')], new Set(['a'])), null);
});

test('proximaParaBanner: entre duas não lidas, escolhe a MAIS ANTIGA (quem espera há mais tempo)', () => {
  const nova = msg('nova', { created_at: '2026-09-09T12:00:00.000Z' });
  const antiga = msg('antiga', { created_at: '2026-09-09T08:00:00.000Z' });
  const escolhida = proximaParaBanner([nova, antiga], new Set());
  assert.equal(escolhida.id, 'antiga');
});

test('proximaParaBanner: pula a dispensada e escolhe a próxima mais antiga ainda pendente', () => {
  const a = msg('a', { created_at: '2026-09-09T08:00:00.000Z' });
  const b = msg('b', { created_at: '2026-09-09T09:00:00.000Z' });
  const escolhida = proximaParaBanner([a, b], new Set(['a']));
  assert.equal(escolhida.id, 'b');
});

test('SEGUNDOS_ANTES_DE_FECHAR: dez segundos, o pedido exato do dono', () => {
  assert.equal(SEGUNDOS_ANTES_DE_FECHAR, 10);
});
