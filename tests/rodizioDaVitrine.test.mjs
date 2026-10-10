import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAVE_SEMENTE, JANELA_DO_ACESSO_MS, sementeDoAcesso, rodar, diaDeBrasilia, faltamDoisDias, ordemDaGrade, rodarProdutos,
} from '../src/lib/rodizioDaVitrine.js';

const T = (iso) => new Date(iso).getTime();
const armazemFalso = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const itens = (n) => Array.from({ length: n }, (_, i) => ({ id: `a${i}`, status: 'active' }));

test('semente: mesmo acesso mantém a ordem; parado além da janela vira acesso novo', () => {
  const z = armazemFalso();
  const t0 = T('2026-10-10T15:00:00Z');
  const s1 = sementeDoAcesso({ armazem: z, agora: t0 });
  assert.equal(sementeDoAcesso({ armazem: z, agora: t0 + 60_000 }), s1, 'trocar de página não muda');
  assert.equal(sementeDoAcesso({ armazem: z, agora: t0 + 60_000 + JANELA_DO_ACESSO_MS - 1 }), s1, 'a atividade renova a janela');
  const longe = t0 + 60_000 + JANELA_DO_ACESSO_MS - 1 + JANELA_DO_ACESSO_MS + 1;
  const guardado = JSON.parse(z.getItem(CHAVE_SEMENTE));
  assert.ok(longe - guardado.ts > JANELA_DO_ACESSO_MS);
  let diferente = false;
  for (let i = 0; i < 20 && !diferente; i += 1) { z.setItem(CHAVE_SEMENTE, JSON.stringify(guardado)); diferente = sementeDoAcesso({ armazem: z, agora: longe }) !== s1; }
  assert.ok(diferente, 'acesso novo sorteia semente nova');
});

test('semente: armazém ausente, quebrado ou com lixo nunca derruba', () => {
  assert.ok(Number.isFinite(sementeDoAcesso({})));
  assert.ok(Number.isFinite(sementeDoAcesso({ armazem: { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('y'); } } })));
  const z = armazemFalso(); z.setItem(CHAVE_SEMENTE, '{lixo');
  assert.ok(Number.isFinite(sementeDoAcesso({ armazem: z })));
  z.setItem(CHAVE_SEMENTE, JSON.stringify({ semente: 'x', ts: 'y' }));
  assert.ok(Number.isFinite(sementeDoAcesso({ armazem: z })));
});

test('rodar: determinístico por semente, muda entre sementes e é uma permutação', () => {
  const l = itens(30);
  const a = rodar(l, 111).map((x) => x.id);
  assert.deepEqual(a, rodar(l, 111).map((x) => x.id));
  assert.notDeepEqual(a, rodar(l, 222).map((x) => x.id));
  assert.deepEqual([...a].sort(), l.map((x) => x.id).sort());
  assert.deepEqual(rodar(null, 1), []);
});

test('rodar: entrar/sair um item NÃO embaralha os outros (ordem relativa se mantém)', () => {
  const l = itens(30);
  const base = rodar(l, 777).map((x) => x.id);
  const sem = rodar(l.filter((x) => x.id !== 'a7'), 777).map((x) => x.id);
  assert.deepEqual(sem, base.filter((id) => id !== 'a7'));
  const com = rodar([...l, { id: 'novo', status: 'active' }], 777).map((x) => x.id);
  assert.deepEqual(com.filter((id) => id !== 'novo'), base);
});

test('rodar: o rodízio é de verdade — o primeiro item varia entre sementes', () => {
  const l = itens(40);
  const primeiros = new Set(Array.from({ length: 60 }, (_, s) => rodar(l, s + 1)[0].id));
  assert.ok(primeiros.size >= 15, `só ${primeiros.size} primeiros distintos`);
});

test('dia de Brasília: 23h de ontem em BRT ainda é ontem; 00:00 BRT já é hoje', () => {
  assert.equal(diaDeBrasilia(T('2026-10-10T02:59:59Z')), diaDeBrasilia(T('2026-10-09T12:00:00Z')));
  assert.equal(diaDeBrasilia(T('2026-10-10T03:00:00Z')), diaDeBrasilia(T('2026-10-09T12:00:00Z')) + 1);
});

test('faltam 2 dias: só ativos que encerram no dia de depois de amanhã (Brasília), em ordem', () => {
  const agora = T('2026-10-10T15:00:00Z'); // sábado 12h BRT → alvo: terça 12/10
  const L = [
    { id: 'hoje', status: 'active', end_time: '2026-10-10T21:01:00Z' },
    { id: 'amanha', status: 'active', end_time: '2026-10-11T21:00:00Z' },
    { id: 'd2b', status: 'active', end_time: '2026-10-12T20:00:00Z' },
    { id: 'd2a', status: 'active', end_time: '2026-10-12T03:00:00Z' }, // 00:00 BRT de 12/10
    { id: 'borda', status: 'active', end_time: '2026-10-13T02:59:00Z' }, // 23:59 BRT de 12/10
    { id: 'd3', status: 'active', end_time: '2026-10-13T03:00:00Z' },   // 00:00 BRT de 13/10
    { id: 'agendado', status: 'scheduled', end_time: '2026-10-12T15:00:00Z' },
    { id: 'sem', status: 'active' },
  ];
  assert.deepEqual(faltamDoisDias(L, agora).map((x) => x.id), ['d2a', 'd2b', 'borda']);
  assert.deepEqual(faltamDoisDias([], agora), []);
  assert.deepEqual(faltamDoisDias(null, agora), []);
});

test('grade: ativos em rodízio, o resto depois na ordem original; "fora" não repete', () => {
  const L = [...itens(10), { id: 'ag1', status: 'scheduled' }, { id: 'ag2', status: 'scheduled' }];
  const g = ordemDaGrade(L, { semente: 5, fora: ['a3', 'a4'] }).map((x) => x.id);
  assert.equal(g.length, 10);
  assert.ok(!g.includes('a3') && !g.includes('a4'));
  assert.deepEqual(g.slice(-2), ['ag1', 'ag2']);
  assert.deepEqual(g, ordemDaGrade(L, { semente: 5, fora: ['a3', 'a4'] }).map((x) => x.id), 'estável');
});

test('loja: com estoque em rodízio, esgotados no fim na ordem original', () => {
  const P = [{ id: 'e1', quantity: 0 }, ...Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, quantity: 3 })), { id: 'e2', quantity: 0 }];
  const r = rodarProdutos(P, 9).map((x) => x.id);
  assert.deepEqual(r.slice(-2), ['e1', 'e2']);
  assert.equal(r.length, 14);
  assert.notDeepEqual(r.slice(0, 12), P.filter((p) => p.quantity > 0).map((x) => x.id));
});
