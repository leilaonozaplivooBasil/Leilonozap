// 💰 AS VENDAS DO CICLO — a mesma conta nos dois lugares (09/09/2026).
//
// Achado da auditoria noturna: "o ranking do time não vê as mesmas vendas que o
// painel pessoal". O painel passava `vendasReais` pro `tokenDoCiclo`; a Visão
// Executiva não — e sem esse dado o `tokenDoCiclo` cai numa fonte DIFERENTE
// (`soma('vendas_feitas')`, as tarefas [VENDA] anotadas no dia).
//
// 🔴 NÃO ERA COSMÉTICO: o Human Token decide liga e status de Platina. Quem
// vendeu de verdade e não anotou a tarefa aparecia MENOR no ranking do que no
// próprio painel; quem anotou sem a venda ter caído, MAIOR. A mesma pessoa
// tinha dois lugares no mesmo jogo, dependendo de quem estava olhando.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { donosDaVenda, vendasDaPessoa, vendasPorPessoa, DONOS_DA_VENDA } from '../src/lib/vendasDoCiclo.js';
import { TICKET_MEDIO_VENDA } from '../src/lib/xgame.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const METODO = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));
const RANKING = semComentarios(ler('../src/components/licensing/CentralVendas/XGameVisaoExecutiva.jsx'));

const paga = (extra = {}) => ({ id: 'v1', status: 'paid', kind: null, total_amount: 100, ...extra });

test('🔴 os dois lados chamam a MESMA peça — fórmula duplicada foi o que os separou', () => {
  assert.match(METODO, /vendasDaPessoa\(\{ sales, oportunidades \}\)/, 'o painel pessoal saiu da peça compartilhada');
  assert.match(RANKING, /vendasPorPessoa\(\{ sales: vendas, oportunidades \}\)/, 'o ranking saiu da peça compartilhada');
  // e o ranking precisa REALMENTE entregar o número pro tokenDoCiclo
  assert.match(RANKING, /vendasReais: vendasPor\[r\.user_id\] \?\? 0/);
});

test('🔴 ausência de venda é ZERO, nunca `undefined`', () => {
  // `undefined` reativa, lá dentro do tokenDoCiclo, o fallback das tarefas —
  // a divergência inteira de volta, e calada.
  assert.ok(!/vendasReais: vendasPor\[r\.user_id\],/.test(RANKING),
    'sem o `?? 0`, quem não vendeu volta a ser julgado pelas tarefas anotadas');
});

test('a venda pertence a QUEM ESTIVER em qualquer uma das 4 colunas', () => {
  // A consulta do painel pessoal usa `or(seller_id.eq.X, licensee_id.eq.X, ...)`.
  // Se aqui a venda fosse de um dono só, o ranking mostraria MENOS do que a
  // pessoa vê — o mesmo bug, do outro lado.
  assert.deepEqual(DONOS_DA_VENDA, ['seller_id', 'licensee_id', 'anchor_id', 'owner_id']);
  assert.deepEqual(donosDaVenda({ seller_id: 'a', licensee_id: 'b' }), ['a', 'b']);
  assert.deepEqual(donosDaVenda({ seller_id: 'a', owner_id: 'a' }), ['a'], 'o mesmo id nas duas colunas conta uma vez');
  assert.deepEqual(donosDaVenda({}), []);
  assert.deepEqual(donosDaVenda(), []);
});

test('a mesma venda conta pros DOIS donos — e é assim que bate com o painel', () => {
  const mapa = vendasPorPessoa({ sales: [paga({ seller_id: 'ana', licensee_id: 'bia' })] });
  assert.equal(mapa.ana, 1);
  assert.equal(mapa.bia, 1);
});

test('o aporte externo vira venda pelo ticket médio', () => {
  // ⚠️ o aporte só conta com estágio `fechado_100` E banco da lista (DIR-40:
  // transferência carimbada). Errei o dado na primeira versão deste teste e o
  // código recusou — ele é mais rigoroso que a minha suposição, e ainda bem.
  const oport = [{ responsavel_id: 'ana', estagio: 'fechado_100', fechado_em: '2026-09-01', aporte_externo: { banco: 'itau', valor: TICKET_MEDIO_VENDA * 2 } }];
  const mapa = vendasPorPessoa({ sales: [], oportunidades: oport });
  assert.equal(Math.round(mapa.ana * 100) / 100, 2, `${TICKET_MEDIO_VENDA * 2} em aporte = 2 vendas`);
});

test('🔴 aporte sem banco carimbado NÃO vira venda', () => {
  // DIR-40: o 100% só se prova com transferência auditável. Sem banco da lista,
  // é "declarado sem dinheiro na conta" — e não pode pontuar no Token.
  const semBanco = [{ responsavel_id: 'ana', estagio: 'fechado_100', fechado_em: '2026-09-01', aporte_externo: { valor: 9999 } }];
  assert.deepEqual(vendasPorPessoa({ oportunidades: semBanco }), { ana: 0 });
  const naoFechada = [{ responsavel_id: 'ana', estagio: 'negociacao', aporte_externo: { banco: 'itau', valor: 9999 } }];
  assert.deepEqual(vendasPorPessoa({ oportunidades: naoFechada }), { ana: 0 });
});

test('entrada vazia não quebra e não inventa venda', () => {
  assert.equal(vendasDaPessoa(), 0);
  assert.equal(vendasDaPessoa({ sales: null, oportunidades: null }), 0);
  assert.deepEqual(vendasPorPessoa(), {});
  assert.deepEqual(vendasPorPessoa({ sales: [paga({})] }), {}, 'venda sem dono nenhum não vira ponto de ninguém');
});

test('a consulta do ranking traz as colunas de dono — senão o agrupamento fica cego', () => {
  // Esquecer uma coluna no select faz `donosDaVenda` devolver menos gente, e o
  // ranking volta a divergir — sem erro nenhum aparecendo.
  const q = RANKING.slice(RANKING.indexOf("from('catalog_sales')"), RANKING.indexOf("from('catalog_sales')") + 260);
  for (const col of DONOS_DA_VENDA) assert.match(q, new RegExp(col), `faltou ${col} no select em lote`);
});

// ── 🏷️ o crédito da decisão (achado da mesma auditoria) ──────────────────────
test('🏷️ a reprovação automática por ambiente NÃO se passa por decisão de gestor', () => {
  // `motivo_gestor` é lido na tela com a etiqueta "gestor:" (XGameAdmin) e "↩"
  // (Comprovacoes). No ritual, quem reprova o ambiente é a IA sozinha
  // (DIR-125) — nenhum humano olhou. O histórico dizia que uma pessoa julgou o
  // ambiente de outra quando ninguém julgou.
  //
  // Nada se perde: o texto da IA já viaja em `veredito_ia` e a tela já o mostra
  // rotulado como "IA:". Antes aparecia duas vezes, uma com o crédito trocado.
  const bloco = METODO.slice(METODO.indexOf('const comprovacaoReprovada'), METODO.indexOf('const comprovacaoReprovada') + 700);
  assert.ok(!/motivo_gestor/.test(bloco), 'a IA voltou a assinar como se fosse o gestor');
  assert.match(bloco, /veredito_ia: vereditoAmbiente/, 'o motivo da IA precisa continuar registrado — só com o nome certo');
});

test('quem escreve motivo_gestor de verdade continua sendo gente', () => {
  const ADMIN = semComentarios(ler('../src/components/licensing/XGameAdmin.jsx'));
  const COMPS = semComentarios(ler('../src/components/licensing/CentralVendas/Comprovacoes.jsx'));
  for (const [nome, src] of [['XGameAdmin', ADMIN], ['Comprovacoes', COMPS]]) {
    assert.match(src, /motivo_gestor: .*reprovada pelo gestor na segunda análise/,
      `${nome}: sumiu a reprovação MANUAL — essa é a que pode assinar como gestor`);
  }
});
