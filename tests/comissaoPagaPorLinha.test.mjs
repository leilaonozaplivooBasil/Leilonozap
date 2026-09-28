// ✅ PAGAR COMISSÃO POR LINHA (28/09/2026) — áudio da Beatriz:
//   "a caixinha que está como 'gerada' não teria a possibilidade de a gente
//    marcar pago em cada valor, pra ir diminuindo o valor da comissão?"
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  linhaPagavel, somaDasSelecionadas, podeMarcarPagas, jaPagoDaPessoa, MOTIVOS_LINHAS,
} from '../src/lib/pagamentoManualDeComissao.js';

const LINHAS = [
  { id: 'a', amount: 1.0, status: 'confirmed' },
  { id: 'b', amount: 7.5, status: 'confirmed' },
  { id: 'c', amount: 6.65, status: 'pending' },
  { id: 'd', amount: 3.1, status: 'paid' },
  { id: 'e', amount: 9, status: 'reversed' },
];

test('só "Gerada" (pending/confirmed) pode ser marcada', () => {
  assert.deepEqual(LINHAS.filter(linhaPagavel).map((c) => c.id), ['a', 'b', 'c']);
});

test('o total soma só as pagáveis marcadas, sem erro de centavo', () => {
  assert.equal(somaDasSelecionadas(LINHAS, ['a', 'b', 'c']), 15.15);
  assert.equal(somaDasSelecionadas(LINHAS, ['a', 'd', 'e']), 1, 'paga e estornada não entram');
  assert.equal(somaDasSelecionadas(LINHAS, []), 0);
});

test('🔴 nunca passa do saldo — é o caso de quem tem saque em andamento', () => {
  const r = podeMarcarPagas({ comissoes: LINHAS, ids: ['a', 'b', 'c'], saldo: 10 });
  assert.equal(r.ok, false); assert.equal(r.motivo, MOTIVOS_LINHAS.SALDO); assert.equal(r.total, 15.15);
  assert.equal(podeMarcarPagas({ comissoes: LINHAS, ids: ['a', 'b', 'c'], saldo: 15.15 }).ok, true, 'o saldo inteiro pode');
  assert.equal(podeMarcarPagas({ comissoes: LINHAS, ids: [], saldo: 99 }).motivo, MOTIVOS_LINHAS.NENHUMA);
});

test('"Já pago" não conta duas vezes a linha paga por um pagamento manual', () => {
  const comissoes = [{ id: 'x', amount: 5, status: 'paid' }, { id: 'y', amount: 2, status: 'paid' }];
  const manuais = [{ valor: 5, commission_ids: ['x'] }, { valor: 10 }];
  assert.equal(jaPagoDaPessoa(comissoes, manuais), 17, '5 (x, pelo manual) + 10 (valor livre) + 2 (y, solta)');
});

// ── a rota, com um banco em memória ─────────────────────────────────────────
process.env.SUPABASE_URL = 'https://banco.teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
const { default: rota } = await import('../api/functions/payCommissionManually.js');

function bancoFalso({ saldo = 20, linhas = LINHAS, roubarNaReserva = null } = {}) {
  const db = {
    app_users: [{ id: 'adm', full_name: 'Beatriz', role: 'admin' }, { id: 'u1', full_name: 'Luiz', commission_balance: saldo }],
    commission_records: linhas.map((l) => ({ ...l, user_id: l.user_id || 'u1' })),
    comissao_pagamentos_manuais: [], emails: [],
  };
  const ids = (q) => (q.match(/id=in\.\(([^)]*)\)/)?.[1] || '').split(',').map((s) => s.replace(/"/g, '')).filter(Boolean);
  globalThis.fetch = async (url, opts = {}) => {
    const u = decodeURIComponent(String(url));
    const metodo = opts.method || 'GET';
    const json = (b) => new Response(JSON.stringify(b), { status: 200 });
    if (u.includes('/app_users?')) {
      const id = u.match(/id=eq\.([^&]+)/)[1];
      const p = db.app_users.find((x) => x.id === id);
      if (metodo === 'PATCH') {
        const antes = Number(u.match(/commission_balance\.eq\.([\d.]+)/)?.[1]);
        if (!p || Number(p.commission_balance) !== antes) return json([]);
        Object.assign(p, JSON.parse(opts.body));
        return json([p]);
      }
      return json(p ? [p] : []);
    }
    if (u.includes('/commission_records?')) {
      const alvo = db.commission_records.filter((r) => ids(u).includes(r.id));
      if (metodo === 'GET') return json(alvo.map((r) => ({ ...r })));
      const novo = JSON.parse(opts.body);
      if (roubarNaReserva && novo.status === 'paid') { db.commission_records.find((r) => r.id === roubarNaReserva).status = 'paid'; roubarNaReserva = null; }
      const deStatus = u.match(/status=in\.\(([^)]*)\)/)?.[1]?.split(',') || [u.match(/status=eq\.(\w+)/)?.[1]];
      const mudou = alvo.filter((r) => deStatus.includes(r.status) && (!u.includes('user_id=eq.') || r.user_id === u.match(/user_id=eq\.([^&]+)/)[1]));
      mudou.forEach((r) => Object.assign(r, novo));
      return json(mudou);
    }
    if (u.includes('/comissao_pagamentos_manuais')) { db.comissao_pagamentos_manuais.push(JSON.parse(opts.body)); return new Response('', { status: 201 }); }
    db.emails.push(u); return json([]);
  };
  return db;
}

async function pagar(corpo) {
  const res = { code: 200, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await rota({ method: 'POST', headers: {}, body: { actor_id: 'adm', user_id: 'u1', pix_key_usada: '11999999999', ...corpo } }, res);
  return res;
}
const status = (db) => Object.fromEntries(db.commission_records.map((r) => [r.id, r.status]));

test('✅ marca AQUELAS linhas como pagas e desconta a SOMA delas do saldo', async () => {
  const db = bancoFalso({ saldo: 20 });
  const r = await pagar({ commission_ids: ['a', 'b'], valor: 8.5 });
  assert.equal(r.body.success, true, r.body.error);
  assert.equal(db.app_users[1].commission_balance, 11.5);
  assert.deepEqual(status(db), { a: 'paid', b: 'paid', c: 'pending', d: 'paid', e: 'reversed' });
  assert.deepEqual(db.comissao_pagamentos_manuais[0].commission_ids, ['a', 'b']);
  assert.equal(db.comissao_pagamentos_manuais[0].valor, 8.5);
});

test('🔴 o valor vem do BANCO, nunca do navegador', async () => {
  const db = bancoFalso({ saldo: 20 });
  const r = await pagar({ commission_ids: ['a', 'b'], valor: 1 });
  assert.equal(r.body.success, false);
  assert.match(r.body.error, /total mudou/);
  assert.equal(db.app_users[1].commission_balance, 20);
  assert.equal(status(db).a, 'confirmed');
});

test('🔴 saldo menor que a soma: nada é descontado e as linhas VOLTAM a "Gerada"', async () => {
  const db = bancoFalso({ saldo: 5 });
  const r = await pagar({ commission_ids: ['a', 'b', 'c'] });
  assert.equal(r.body.success, false);
  assert.match(r.body.error, /Saldo insuficiente/);
  assert.equal(db.app_users[1].commission_balance, 5);
  assert.deepEqual(status(db), { a: 'confirmed', b: 'confirmed', c: 'pending', d: 'paid', e: 'reversed' });
  assert.equal(db.comissao_pagamentos_manuais.length, 0);
});

test('🔴 linha já paga, estornada ou de outra pessoa não passa', async () => {
  const db = bancoFalso({ saldo: 20 });
  assert.match((await pagar({ commission_ids: ['a', 'd'] })).body.error, /já foi paga ou estornada/);
  assert.equal(db.app_users[1].commission_balance, 20);
  assert.equal(status(db).a, 'confirmed');
  bancoFalso({ linhas: [...LINHAS, { id: 'z', amount: 1, status: 'confirmed', user_id: 'outra' }] });
  const r = await pagar({ commission_ids: ['a', 'z'] });
  assert.equal(r.code, 400);
});

test('🔴 corrida: outra pessoa pagou uma das linhas no meio — nada é descontado, as minhas voltam', async () => {
  const db = bancoFalso({ saldo: 20, roubarNaReserva: 'b' });
  const r = await pagar({ commission_ids: ['a', 'b'] });
  assert.equal(r.body.success, false);
  assert.equal(r.body.raced, true);
  assert.equal(db.app_users[1].commission_balance, 20);
  assert.equal(status(db).a, 'confirmed', 'a que eu reservei voltou');
  assert.equal(status(db).b, 'paid', 'a da outra pessoa ficou como ela deixou');
});

test('pagamento por VALOR LIVRE (o de antes) segue igual e não mexe em linha nenhuma', async () => {
  const db = bancoFalso({ saldo: 20 });
  const r = await pagar({ valor: 4 });
  assert.equal(r.body.success, true);
  assert.equal(db.app_users[1].commission_balance, 16);
  assert.equal(status(db).a, 'confirmed');
  assert.equal(db.comissao_pagamentos_manuais[0].commission_ids, undefined);
});

test('lista de ids malformada é recusada', async () => {
  bancoFalso();
  assert.equal((await pagar({ commission_ids: ['a', 'a'] })).code, 400, 'repetida');
  assert.equal((await pagar({ commission_ids: ['a)&x=1'] })).code, 400, 'caractere estranho');
});

test('o recálculo de saldo não devolve ao saldo o que já foi pago ou estornado', () => {
  const R = readFileSync(new URL('../api/functions/recalculateCommissionBalances.js', import.meta.url), 'utf8');
  assert.match(R, /status=not\.in\.\(canceled,reversed,paid\)/);
});

test('a migração guarda quais linhas cada pagamento pagou', () => {
  const M = readFileSync(new URL('../supabase/migrations/20260928060000_comissao_paga_por_linha.sql', import.meta.url), 'utf8');
  assert.match(M, /add column if not exists commission_ids text\[\]/);
});
