// 📚 SEM TETO DE MIL — 30/09/2026
// O Supabase corta em 1.000 linhas por chamada. Ontem a base passou de 1.000 e o
// Sistema de Alavancagem travou em "1000 no sistema", com 34 pessoas fora da
// árvore. Aqui: (1) a paginação pura, (2) o adaptador pagina, (3) nenhuma tela
// de base inteira pede "1000" de novo, (4) métricas usam a data real.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { tudoEmPaginas, precisaPaginar, TAMANHO_PAGINA } from '../src/lib/paginacao.js';
import { dataDeCriacao, criadoNosUltimosDias } from '../src/lib/dataDeCriacao.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('tudoEmPaginas: busca página a página até vir uma página curta, sem repetir nem pular', async () => {
  const base = Array.from({ length: 2345 }, (_, i) => ({ id: i + 1 }));
  const chamadas = [];
  const buscar = async (offset, tamanho) => { chamadas.push([offset, tamanho]); return base.slice(offset, offset + tamanho); };
  const tudo = await tudoEmPaginas(buscar);
  assert.equal(tudo.length, 2345);
  assert.deepEqual(chamadas, [[0, 1000], [1000, 1000], [2000, 1000]]);
  assert.equal(new Set(tudo.map((r) => r.id)).size, 2345, 'nenhuma linha repetida');
});

test('tudoEmPaginas: exatamente 1000 linhas faz UMA chamada a mais (vazia) e para; 0 linhas para na primeira', async () => {
  const base = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
  let n = 0;
  const tudo = await tudoEmPaginas(async (o, t) => { n++; return base.slice(o, o + t); });
  assert.equal(tudo.length, 1000);
  assert.equal(n, 2);
  n = 0;
  const nada = await tudoEmPaginas(async () => { n++; return []; });
  assert.deepEqual(nada, []);
  assert.equal(n, 1);
});

test('tudoEmPaginas: respeita um limite explícito acima de 1000 (ex.: 5000 numa base de 1573)', async () => {
  const base = Array.from({ length: 1573 }, (_, i) => ({ id: i }));
  const tudo = await tudoEmPaginas(async (o, t) => base.slice(o, o + t), { limite: 5000 });
  assert.equal(tudo.length, 1573);
  const corte = await tudoEmPaginas(async (o, t) => base.slice(o, o + t), { limite: 1200 });
  assert.equal(corte.length, 1200);
});

test('tudoEmPaginas: trava de segurança — página que nunca encurta não vira loop infinito', async () => {
  const tudo = await tudoEmPaginas(async (o, t) => Array.from({ length: t }, (_, i) => ({ id: o + i })), { maxPaginas: 3 });
  assert.equal(tudo.length, 3000);
});

test('precisaPaginar: só quando a tela pediu, explicitamente, mais que uma chamada devolve', () => {
  assert.equal(TAMANHO_PAGINA, 1000);
  assert.equal(precisaPaginar(undefined), false, 'sem limite continua UMA chamada, como sempre');
  assert.equal(precisaPaginar(1000), false);
  assert.equal(precisaPaginar(1001), true);
  assert.equal(precisaPaginar(5000), true);
});

test('o adaptador pagina: list/filter com limite > 1000 usam tudoEmPaginas, e listAll/filterAll existem', () => {
  const A = ler('../src/api/plataformaAdapter.js');
  assert.ok(A.includes("import { tudoEmPaginas, precisaPaginar } from '@/lib/paginacao';"));
  assert.ok(A.includes('async listAll(orderBy) {'));
  assert.ok(A.includes('async filterAll(filters, orderBy) {'));
  assert.ok(A.includes('if (precisaPaginar(limit)) return _tudo(null, orderBy, limit);'));
  assert.ok(A.includes('async list(orderBy, limit) {\n      let q = supabase.from(table).select(colunasDe(table));'), 'a trava de colunas públicas continua na primeira linha');
  assert.ok(A.includes('if (offset == null && precisaPaginar(limit)) return _tudo(filters, orderBy, limit);'));
  assert.ok(A.includes('q = q.range(offset, offset + tamanho - 1);'));
});

test('nenhuma tela de base inteira pede "1000" (ou 500) de usuários, leilões ou vendas — todas usam listAll', () => {
  const telas = [
    '../src/pages/NetworkOverview.jsx', '../src/pages/UserManagement.jsx', '../src/pages/AdminUsers.jsx',
    '../src/pages/CareerLevelsReport.jsx', '../src/components/painel/MinhaArvoreRede.jsx', '../src/pages/Licensing.jsx',
    '../src/pages/ProtecaoCriacao.jsx', '../src/pages/RegisterLicensee.jsx', '../src/pages/LicenseeOrders.jsx',
    '../src/pages/LojistaDashboard.jsx', '../src/pages/SuperAdminPanels.jsx', '../src/pages/ActivePartners.jsx',
  ];
  const proibido = /(AppUser|Auction|CatalogSale|CatalogSaleEntity)\.list\((['"])-?[a-z_]+\2,\s*(1000|500)\)/;
  for (const t of telas) {
    const S = ler(t);
    assert.ok(!proibido.test(S), `${t} ainda pede uma lista com teto`);
  }
  const N = ler('../src/pages/NetworkOverview.jsx');
  assert.ok(N.includes('const users = await AppUser.listAll("-created_date");'));
  assert.ok(N.includes('const auctions = await Auction.listAll("-created_date");'));
  assert.ok(N.includes("const sales = await plataforma.entities.CatalogSale.listAll('-created_date');"));
});

test('dataDeCriacao: created_date quando existe, senão created_at; nunca 1970', () => {
  assert.equal(dataDeCriacao({ created_date: '2026-09-01T00:00:00Z', created_at: '2026-09-02T00:00:00Z' }), '2026-09-01T00:00:00Z');
  assert.equal(dataDeCriacao({ created_date: null, created_at: '2026-09-02T00:00:00Z' }), '2026-09-02T00:00:00Z');
  assert.equal(dataDeCriacao({}), null);
  assert.equal(dataDeCriacao({ created_date: 'lixo' }), null);
  const agora = Date.parse('2026-09-30T12:00:00Z');
  assert.equal(criadoNosUltimosDias({ created_at: '2026-09-20T00:00:00Z' }, 30, agora), true);
  assert.equal(criadoNosUltimosDias({ created_at: '2026-08-20T00:00:00Z' }, 30, agora), false);
  assert.equal(criadoNosUltimosDias({ created_date: null }, 30, agora), false, 'sem data não conta como novo');
});

test('a árvore: "Novos (30 dias)" usa a data real, o lápis vale o papel do BANCO, e os moldes da árvore ficam como eram', () => {
  const N = ler('../src/pages/NetworkOverview.jsx');
  assert.ok(N.includes('const recentJoinersCount = allUsers.filter(u => criadoNosUltimosDias(u, CONVERSAO_JANELA_DIAS)).length;'));
  assert.ok(N.includes("const [papelNoBanco, setPapelNoBanco] = useState(null);"));
  assert.ok(N.includes("if (eu?.role) setPapelNoBanco(eu.role);"));
  assert.ok(N.includes("papelNoBanco === 'super_admin'"));
  // 🔒 dono (30/09): "não mexe nos moldes, está perfeito — só o lápis precisa reaparecer".
  // O lápis já era renderizado sempre que canEdit; o que faltava era canEdit vir verdadeiro.
  const T = ler('../src/components/network/TreeHierarchy.jsx');
  assert.ok(T.includes('{canEdit && !n.data.isGroup && ('), 'lápis do modo lista depende só de canEdit');
  assert.ok(!T.includes('mover-para-escolha'), 'nenhum molde novo na árvore');
  const N2 = ler('../src/pages/NetworkOverview.jsx');
  assert.ok(N2.includes('canEdit={isSuperAdmin}'));
  const U = ler('../api/functions/adminUpdateUser.js');
  assert.ok(U.includes('campos_recebidos: recebidos'), 'a recusa 400 diz quais campos chegaram');
});
