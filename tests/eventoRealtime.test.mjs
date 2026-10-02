// 📡 O evento de tempo real num formato só (01/10/2026) — ver src/lib/eventoRealtime.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarEventoRealtime, filtroPorId } from '../src/lib/eventoRealtime.js';

test('INSERT/UPDATE/DELETE do Supabase viram create/update/delete, com data e id', () => {
  const ins = normalizarEventoRealtime({ eventType: 'INSERT', new: { id: 'm1', auction_id: 'a1', message_type: 'bid' }, old: {} });
  assert.equal(ins.type, 'create'); assert.equal(ins.id, 'm1'); assert.equal(ins.data.auction_id, 'a1');
  assert.equal(ins.new.id, 'm1', 'o formato do Supabase continua lá para quem lê payload.new');

  const upd = normalizarEventoRealtime({ eventType: 'UPDATE', new: { id: 'a1', status: 'ended', winner_name: 'Ana' }, old: { id: 'a1' } });
  assert.equal(upd.type, 'update'); assert.equal(upd.data.status, 'ended'); assert.equal(upd.id, 'a1');

  const del = normalizarEventoRealtime({ eventType: 'DELETE', new: {}, old: { id: 'a9' } });
  assert.equal(del.type, 'delete'); assert.equal(del.id, 'a9'); assert.equal(del.data.id, 'a9');
});

test('a linha passa pelo mapeador da entidade (mapFromDB)', () => {
  const ev = normalizarEventoRealtime({ eventType: 'UPDATE', new: { id: 'a1', current_price: null } }, (l) => ({ ...l, current_price: l.current_price ?? 0 }));
  assert.equal(ev.data.current_price, 0);
  assert.equal(ev.new.current_price, null, '`new` fica cru');
});

test('evento já no formato antigo passa sem estrago; lixo não quebra', () => {
  const ev = normalizarEventoRealtime({ type: 'create', data: { id: 'x' } });
  assert.equal(ev.type, 'create'); assert.equal(ev.data.id, 'x'); assert.equal(ev.id, 'x');
  const vazio = normalizarEventoRealtime(null);
  assert.equal(vazio.type, null); assert.equal(vazio.data, null); assert.equal(vazio.id, null);
});

test('filtroPorId', () => {
  assert.equal(filtroPorId('abc-123'), 'id=eq.abc-123');
  assert.equal(filtroPorId(''), undefined);
  assert.equal(filtroPorId(null), undefined);
});
