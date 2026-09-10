// 📄 A MvM PRECISA DE TODOS OS VOTOS (09/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// O CASO
// ═══════════════════════════════════════════════════════════════════════════
// O Supabase corta QUALQUER resposta em 1.000 linhas por padrão, sem avisar:
// HTTP 200, sem erro, com menos linhas do que existe.
//
// Medido no banco em 09/09:
//   • `xgame_votos_mvm` no ciclo (desde 07/09): 2.030 linhas
//   • só no dia 08/09:                          1.090 linhas
//
// Quatro consultas liam isso sem paginar — o ranking do time (CrmMetodo), a
// visão executiva, e as duas do raio-x do admin. Todas calculavam a média em
// cima de 1.000. Simulado com o corte real: os 110 votos de uma pessoa no
// ciclo viravam 60.
//
// 🔴 E NÃO É COSMÉTICO: MvM entra no Human Token, que decide liga, Platina e
// X-Pay. Número errado de remuneração, sem nenhum erro na tela.
//
// (Conferido também que as vizinhas NÃO estouram: catalog_sales tem 9 linhas
// no ciclo e xgame_diario 29 — o problema é só a tabela de votos.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerTudoDoSupabase } from '../src/lib/lerTudoDoSupabase.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

/** Uma tabela de mentira que se comporta como o cliente do supabase-js. */
function tabelaFalsa(linhas, { erro = null, erroNoBloco = 1, semId = false } = {}) {
  const chamadas = [];
  const montar = () => {
    const f = { limite: null, cursor: null, ordenou: false };
    const q = {
      order(coluna, opcoes) { f.ordenou = `${coluna}:${opcoes?.ascending}`; return q; },
      limit(n) { f.limite = n; return q; },
      gt(coluna, valor) { f.cursor = { coluna, valor }; return q; },
      then(resolve) {
        chamadas.push({ ...f });
        if (erro && chamadas.length >= erroNoBloco) { resolve({ data: null, error: erro }); return; }
        const filtradas = f.cursor ? linhas.filter((x) => x.id > f.cursor.valor) : linhas;
        const bloco = filtradas.slice(0, f.limite);
        resolve({ data: semId ? bloco.map(({ id: _id, ...r }) => r) : bloco, error: null });
      },
    };
    return q;
  };
  return { montar, chamadas };
}

const votos = (n) => Array.from({ length: n }, (_, i) => ({
  id: `v${String(i).padStart(6, '0')}`, votado_id: `p${i % 15}`, nota: (i % 10) + 1,
}));

test('📄 2.030 votos chegam inteiros, não 1.000', async () => {
  const { montar } = tabelaFalsa(votos(2030));
  const lidos = await lerTudoDoSupabase(montar, { pagina: 1000 });
  assert.equal(lidos.length, 2030, 'a MvM voltou a ser calculada em cima de um pedaço');
});

test('🔴 e nenhum voto de ninguém se perde no caminho', async () => {
  // O teste acima só conta. Este confere que a pessoa que caía no corte volta
  // com o total dela — foi assim que o defeito apareceu.
  const { montar } = tabelaFalsa(votos(2030));
  const lidos = await lerTudoDoSupabase(montar, { pagina: 1000 });
  const daPessoa = lidos.filter((v) => v.votado_id === 'p7').length;
  const esperado = votos(2030).filter((v) => v.votado_id === 'p7').length;
  assert.equal(daPessoa, esperado);
  assert.equal(new Set(lidos.map((v) => v.id)).size, 2030, 'linha repetida infla a média');
});

test('⚠️ pagina por CURSOR no id, nunca por offset', async () => {
  // Gente vota AO VIVO enquanto a tela carrega. Uma linha inserida no meio
  // desloca todo offset seguinte — a página 2 repetiria ou PULARIA linhas.
  const { montar, chamadas } = tabelaFalsa(votos(2030));
  await lerTudoDoSupabase(montar, { pagina: 1000 });
  assert.equal(chamadas.length, 3);
  assert.equal(chamadas[0].cursor, null, 'o primeiro bloco não tem cursor');
  assert.deepEqual(chamadas[1].cursor, { coluna: 'id', valor: 'v000999' }, 'o 2º bloco não continuou do último id lido');
  assert.deepEqual(chamadas[2].cursor, { coluna: 'id', valor: 'v001999' });
  // e ordenado por id — sem ordem estável o cursor não significa nada
  assert.ok(chamadas.every((c) => c.ordenou === 'id:true'), 'parou de ordenar por id');
});

test('⚠️ monta uma consulta NOVA a cada bloco', async () => {
  // Um objeto de consulta do supabase-js só executa uma vez. Reusar a mesma
  // instância devolveria o bloco 1 pra sempre — laço até o teto de blocos.
  let montagens = 0;
  const base = tabelaFalsa(votos(2030));
  await lerTudoDoSupabase(() => { montagens += 1; return base.montar(); }, { pagina: 1000 });
  assert.equal(montagens, 3);
});

test('🔴 erro NÃO devolve meia lista', async () => {
  // Meia lista passando por lista inteira é exatamente o defeito que isto
  // conserta. Quem chama tem que ver "não consegui", não "não tem nada mais".
  //
  // ⚠️ A PRIMEIRA VERSÃO DESTE TESTE MENTIA: ela falhava já no bloco 1, quando
  // nada tinha sido acumulado ainda — e aí `return []` e `return tudo` dão o
  // mesmo resultado. A mutação que trocava um pelo outro passava VERDE.
  // O caso que importa é o erro no bloco 2, com 1.000 linhas já na mão.
  const { montar, chamadas } = tabelaFalsa(votos(2030), { erro: { message: 'timeout' }, erroNoBloco: 2 });
  const lidos = await lerTudoDoSupabase(montar, { pagina: 1000 });
  assert.equal(chamadas.length, 2, 'o erro não chegou a acontecer no 2º bloco');
  assert.deepEqual(lidos, [], 'devolveu as 1.000 primeiras como se fossem a lista inteira');

  // e o erro logo de cara também devolve vazio
  const so1 = tabelaFalsa(votos(2030), { erro: { message: 'timeout' } });
  assert.deepEqual(await lerTudoDoSupabase(so1.montar, { pagina: 1000 }), []);
});

test('🔴 bloco cheio sem `id` para em vez de devolver lista incompleta calada', async () => {
  // Se alguém tirar o `id` do select, o cursor não tem âncora. Devolver o que
  // veio seria repetir o defeito com outro nome — e em silêncio.
  const { montar, chamadas } = tabelaFalsa(votos(2030), { semId: true });
  const lidos = await lerTudoDoSupabase(montar, { pagina: 1000 });
  assert.equal(chamadas.length, 1, 'ficou girando sem sair do lugar');
  assert.equal(lidos.length, 1000);
});

test('⚠️ o teto de blocos existe e não é alcançado no caso real', async () => {
  const { montar, chamadas } = tabelaFalsa(votos(500000));
  await lerTudoDoSupabase(montar, { pagina: 1000, maxBlocos: 4 });
  assert.equal(chamadas.length, 4, 'sem teto, uma tabela grande travaria a aba');
});

test('⚠️ lista que cabe num bloco só faz UMA consulta', async () => {
  const { montar, chamadas } = tabelaFalsa(votos(12));
  assert.equal((await lerTudoDoSupabase(montar, { pagina: 1000 })).length, 12);
  assert.equal(chamadas.length, 1, 'passou a cobrar uma consulta extra de todo mundo');
});

test('🔴 as QUATRO telas que leem o ciclo passaram a paginar — e pedem `id`', () => {
  const alvos = [
    ['../src/components/licensing/CentralVendas/CrmMetodo.jsx', 1],
    ['../src/components/licensing/CentralVendas/XGameVisaoExecutiva.jsx', 1],
    ['../src/components/licensing/XGameAdmin.jsx', 2],
  ];
  for (const [arquivo, quantas] of alvos) {
    const src = semComentarios(ler(arquivo));
    const paginadas = [...src.matchAll(/lerTudoDoSupabase\(\(\) => supabase\.from\('xgame_votos_mvm'\)\.select\('([^']+)'\)/g)];
    assert.equal(paginadas.length, quantas, `${arquivo}: consulta de voto do ciclo sem paginar`);
    for (const m of paginadas) {
      assert.ok(m[1].split(',').includes('id'), `${arquivo}: select sem \`id\` — o cursor não teria âncora`);
    }
  }
});

test('⚠️ as consultas de UMA pessoa seguem sem paginar, de propósito', () => {
  // `eq('votado_id', uid)` no ciclo dá ~110 linhas. Paginar ali só cobraria
  // uma consulta a mais de todo mundo, todo dia, sem mudar resultado nenhum.
  const crm = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));
  assert.match(crm, /supabase\.from\('xgame_votos_mvm'\)\.select\('virtude,nota'\)\.eq\('votado_id', uid\)/);
});
