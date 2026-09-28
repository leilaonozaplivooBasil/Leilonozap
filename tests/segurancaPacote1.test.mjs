// 🔐 Segurança, pacote 1 (27/09/2026 01:15): CPF/PIX fora da leitura pública; cron com chave.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { preservarDadosSensiveis, CAMPOS_SENSIVEIS } from '../src/lib/dadosSensiveisDoUsuario.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('🙈 o navegador não pede mais cpf, pix_key e pix_key_type de app_users', () => {
  const A = ler('../src/api/plataformaAdapter.js');
  const m = A.match(/const COLUNAS_PUBLICAS_APP_USERS = '([^']+)'/);
  assert.ok(m);
  const cols = m[1].split(',');
  for (const c of CAMPOS_SENSIVEIS) assert.ok(!cols.includes(c), `${c} ainda está na lista pública`);
  assert.ok(cols.includes('full_name') && cols.includes('referral_code') && cols.includes('saldo_disponivel'), 'as colunas de uso normal continuam');
});

test('🔁 o próprio usuário não perde cpf/pix quando o cadastro é atualizado pelo banco', () => {
  const doLogin = { id: 'u1', full_name: 'Ana', cpf: '12345678901', pix_key: 'ana@x.com', pix_key_type: 'email' };
  const doBanco = { id: 'u1', full_name: 'Ana Maria', saldo_disponivel: 10 };
  const r = preservarDadosSensiveis(doBanco, doLogin);
  assert.equal(r.full_name, 'Ana Maria', 'o que veio do banco manda');
  assert.equal(r.cpf, '12345678901');
  assert.equal(r.pix_key, 'ana@x.com');
  assert.equal(r.pix_key_type, 'email');
  // outro usuário guardado: não mistura
  assert.equal(preservarDadosSensiveis(doBanco, { ...doLogin, id: 'u2' }).cpf, undefined);
  // sem anterior: passa direto
  assert.deepEqual(preservarDadosSensiveis(doBanco, null), doBanco);
});

test('🧷 os três pontos que reescrevem o usuário guardado usam o helper', () => {
  for (const f of ['../src/Layout.jsx', '../src/components/hooks/useSecureRole.jsx', '../src/pages/InvestorDashboard.jsx']) {
    const S = ler(f);
    assert.match(S, /import \{ preservarDadosSensiveis \} from '@\/lib\/dadosSensiveisDoUsuario';/, f);
    assert.match(S, /preservarDadosSensiveis\(/, f);
  }
});

test('🔑 toda rota de cron do vercel.json exige CRON_SECRET quando configurado', () => {
  const V = JSON.parse(ler('../vercel.json'));
  for (const c of V.crons) {
    const nome = c.path.replace('/api/functions/', '');
    const S = ler(`../api/functions/${nome}.js`);
    assert.match(S, /process\.env\.CRON_SECRET/, `${nome} sem guarda de CRON_SECRET`);
  }
});

// 🚨 28/09/2026 — "Erro ao criar conta: permission denied for table app_users".
// Telas de cadastro conferiam CPF duplicado com AppUser.filter({ cpf }); desde
// o pacote 1 o banco recusa até COMPARAR cpf — e o cadastro inteiro caía. O
// adaptador responde "não achei" e o servidor (publicRegister) garante o único.
test('filtro de usuário por cpf/pix nunca vai ao banco (responde vazio)', () => {
  const A = readFileSync(new URL('../src/api/plataformaAdapter.js', import.meta.url), 'utf8');
  assert.match(A, /table === 'app_users'[\s\S]{0,200}CAMPOS_SENSIVEIS_USUARIO\.includes\(k\)\)\) \{\s*return \[\];/);
  const R = readFileSync(new URL('../api/functions/publicRegister.js', import.meta.url), 'utf8');
  assert.match(R, /cpf\.eq\./, 'o servidor continua conferindo CPF duplicado');
});
