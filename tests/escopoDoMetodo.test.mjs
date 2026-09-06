// 🔒 A lista, o contato e o agendamento do Método são individuais (dono, 06/09/2026):
// "cada um só vê a sua lista; só o super admin vê tudo".
import test from 'node:test';
import assert from 'node:assert/strict';
import { escopoDoMetodo } from '../src/lib/escopoDoMetodo.js';

const CLIENTES = [
  { id: 'c1', created_by_id: 'emanuel' },
  { id: 'c2', created_by_id: 'jean' },
  { id: 'c3', created_by_id: null }, // legado sem dono
  { id: 'c4', created_by_id: 'emanuel' },
];
const OPORTUNIDADES = [
  { id: 'o1', responsavel_id: 'emanuel', criado_por_id: 'dono' },
  { id: 'o2', responsavel_id: 'jean', criado_por_id: 'emanuel' },
  { id: 'o3', responsavel_id: 'jean', criado_por_id: 'jean' },
];

test('quem não é super admin vê só o que ELE cadastrou — nem a rede, nem a diretoria, nem o legado sem dono', () => {
  const r = escopoDoMetodo({ clientes: CLIENTES, oportunidades: OPORTUNIDADES, uid: 'emanuel', superAdmin: false });
  assert.deepEqual(r.clientes.map((c) => c.id), ['c1', 'c4']);
  assert.deepEqual(r.oportunidades.map((o) => o.id), ['o1', 'o2'], 'responde por ela ou a criou');
  assert.equal(r.total, false);
});

test('o super admin vê tudo, inclusive o legado sem carimbo', () => {
  const r = escopoDoMetodo({ clientes: CLIENTES, oportunidades: OPORTUNIDADES, uid: 'dono', superAdmin: true });
  assert.equal(r.clientes.length, 4);
  assert.equal(r.oportunidades.length, 3);
  assert.equal(r.total, true);
});

test('um diretor (visão total no resto do CRM) continua vendo só a própria lista aqui', () => {
  const r = escopoDoMetodo({ clientes: CLIENTES, oportunidades: OPORTUNIDADES, uid: 'jean', superAdmin: false });
  assert.deepEqual(r.clientes.map((c) => c.id), ['c2']);
  assert.deepEqual(r.oportunidades.map((o) => o.id), ['o2', 'o3']);
});

test('sem usuário identificado, nada aparece', () => {
  assert.deepEqual(escopoDoMetodo({ clientes: CLIENTES, oportunidades: OPORTUNIDADES, uid: null }), { clientes: [], oportunidades: [], total: false });
});
