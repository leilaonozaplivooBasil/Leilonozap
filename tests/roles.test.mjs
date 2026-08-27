// roles.js — prova o PONTO 122: fonte única do que conta como "administrador",
// depois de achar dezenas de telas checando `role === 'admin'` sem incluir
// `super_admin` (o cargo mais alto, o do próprio dono) — /Financial era o
// caso reportado ao vivo: o dono, logado como super_admin, ficava bloqueado.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_ROLES, isAdminRole } from '../src/lib/roles.js';

describe('isAdminRole', () => {
  test('aceita "admin"', () => {
    assert.equal(isAdminRole('admin'), true);
  });

  test('aceita "super_admin" — o caso que ficava de fora', () => {
    assert.equal(isAdminRole('super_admin'), true);
  });

  test('rejeita papel comum', () => {
    assert.equal(isAdminRole('user'), false);
  });

  test('rejeita undefined/null sem lançar erro', () => {
    assert.equal(isAdminRole(undefined), false);
    assert.equal(isAdminRole(null), false);
  });

  test('ADMIN_ROLES contém exatamente os dois papéis administrativos', () => {
    assert.deepEqual([...ADMIN_ROLES].sort(), ['admin', 'super_admin']);
  });
});
