// O Documento Oficial de Operação (set/2026–fev/2027) transferido pro painel (06/09/2026):
// cargos com missão e metas, as cinco camadas econômicas, o Score Executivo e a escada.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CICLO, faseDoMes, CARGOS_OFICIAIS, cargoOficialDe, cargoOficialDoNome, CAPTACAO, METAS_CENTRAIS,
  CAMADAS, rendaDaCarteira, poolDiretoriaOperacional, valorDoEquity, VALUATION_ATUAL,
  SCORE_EXECUTIVO, LINHA_SCORE, scoreExecutivo, ESCADA_ASCENSAO, degrauDaEscada, posicoesDaPessoa, RITUAIS, rituaisDoDia, DASHBOARD_DIRETORIA,
  PARTICIPACAO_TOPO, TOTAL_TOPO_PCT, regraDaParticipacao,
} from '../src/lib/documentoOficial.js';

test('o ciclo: seis meses de set/2026 a fev/2027, cada um com a fase do roadmap (p. 3 e 39)', () => {
  assert.deepEqual(CICLO.meses.map((m) => m.mes), ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']);
  assert.deepEqual(CICLO.meses.map((m) => m.fase), ['Estruturação', '1.000 entradas/dia', 'Escala', 'Aceleração', 'Consolidação', 'Fechamento do ciclo e avaliação']);
  assert.equal(faseDoMes('2027-03'), null, 'março não é do ciclo oficial');
});

test('os cargos C-level do documento (p. 5), com titular, missão, meta de captação e entregáveis', () => {
  assert.deepEqual(CARGOS_OFICIAIS.map((c) => c.sigla), ['CEO', 'CCO', 'COO', 'CRO', 'CMO', 'CBDO', 'CAO', 'CXO', 'CFO', 'CTO']);
  const coo = cargoOficialDe('coo');
  assert.deepEqual([coo.titular, coo.missao, coo.captacaoMes, coo.fixoBudget, coo.dono], ['Emanuel Alves', 'Transformar estratégia em execução.', 150000, 7000, 'dono da execução']);
  assert.deepEqual(coo.metas.map((m) => [m.chave, m.alvo]), [['captacao', 150000], ['reunioes_investimento', 44], ['pontos_retirada', 1], ['lojas', 1]]);
  const cro = cargoOficialDe('cro');
  assert.deepEqual(cro.metas.filter((m) => m.oficial).map((m) => `${m.chave}:${m.alvo}`), ['captacao:150000', 'reunioes_investimento:44', 'vendedores:20', 'licenciados:5', 'influenciadores:30', 'treinamentos:22']);
  // o que o documento não dá vem marcado como sugestão
  assert.ok(cargoOficialDe('cfo').metas.every((m) => m.oficial === false));
  assert.ok(cargoOficialDe('ceo').metas.every((m) => m.oficial === false));
  assert.equal(cargoOficialDe('cfo').titular, null, 'o CFO não tem titular em documento nenhum');
  for (const c of CARGOS_OFICIAIS) assert.ok(c.missao && c.entregaveis.length >= 2 && c.paginas, c.sigla);
  // a captação do time fecha em R$ 1 milhão por mês (p. 14)
  assert.equal(CAPTACAO.time.reduce((s, t) => s + t.metaMes, 0), METAS_CENTRAIS.captacaoMes);
  assert.equal(CARGOS_OFICIAIS.reduce((s, c) => s + (c.captacaoMes || 0), 0), 1000000);
});

test('o cargo pelo nome da pessoa: Emanuel → COO, Jean → CMO, José Amâncio → CXO; desconhecido → null', () => {
  assert.equal(cargoOficialDoNome('Emanuel Silva').sigla, 'COO');
  assert.equal(cargoOficialDoNome('jean aranha').sigla, 'CMO');
  assert.equal(cargoOficialDoNome('José Amâncio').sigla, 'CXO');
  assert.equal(cargoOficialDoNome('Luiz Santanna').sigla, 'CEO');
  assert.equal(cargoOficialDoNome('Carla Souza'), null);
  assert.equal(cargoOficialDoNome(''), null);
});

test('as cinco camadas (p. 11/44): 1% a.m. da carteira, pool de 0,5% ÷ 7, equity 0,5% por valuation', () => {
  assert.deepEqual(CAMADAS.map((c) => c.resumo), ['RENDA', 'RECORRÊNCIA', 'PARTICIPAÇÃO', 'PATRIMÔNIO', 'PODER DE CONSTRUÇÃO']);
  assert.equal(rendaDaCarteira(2100000), 21000, 'Luciano ao fim do ciclo: R$ 21 mil/mês (p. 15)');
  assert.equal(rendaDaCarteira(-5), 0);
  const p = poolDiretoriaOperacional(5000000);
  assert.deepEqual([p.pool, Math.round(p.porIntegrante), p.integrantes], [25000, 3571, 7], 'R$ 5 mi → R$ 25 mil ÷ 7 ≈ R$ 3.571 (p. 7)');
  assert.equal(poolDiretoriaOperacional(1000000).pool, 5000);
  assert.equal(valorDoEquity(VALUATION_ATUAL), 125000, '0,5% a R$ 25 mi = R$ 125 mil (p. 12)');
  assert.equal(valorDoEquity(100000000), 500000);
});

test('o Score Executivo (p. 42): 40/25/15/10/10, linha 80; sem dado conta zero e fica marcado', () => {
  assert.deepEqual(SCORE_EXECUTIVO.map((c) => c.peso), [40, 25, 15, 10, 10]);
  assert.equal(LINHA_SCORE, 80);
  const cheio = scoreExecutivo({ resultado: 1, entregaveis: 1, equipe: 1, cultura: 1, organizacao: 1 });
  assert.deepEqual([cheio.total, cheio.liberado, cheio.faltam], [100, true, 0]);
  const meio = scoreExecutivo({ resultado: 0.5, entregaveis: 1, equipe: 0.5, cultura: null, organizacao: 1 });
  assert.deepEqual([meio.total, meio.liberado, meio.faltam], [62.5, false, 17.5]);
  assert.equal(meio.partes.find((p) => p.id === 'cultura').semDado, true);
  assert.equal(scoreExecutivo({ resultado: 7 }).total, 40, 'fração acima de 1 vira 1');
});

test('a escada de ascensão (p. 43): seis degraus; a posição do painel e o score dizem onde a pessoa está', () => {
  assert.equal(ESCADA_ASCENSAO.length, 6);
  assert.equal(degrauDaEscada({}).n, 2, 'em formação, com a trilha rodando');
  assert.equal(degrauDaEscada({ emFormacao: false }).n, 1);
  assert.equal(degrauDaEscada({ niveis: ['diretoria_operacao'] }).n, 3);
  assert.equal(degrauDaEscada({ niveis: ['diretoria_operacao'], portoesAbertos: 1 }).n, 4);
  assert.equal(degrauDaEscada({ niveis: ['diretoria_operacao'], score: scoreExecutivo({ resultado: 1, entregaveis: 1, equipe: 1, cultura: 1, organizacao: 1 }) }).n, 5);
  const c = degrauDaEscada({ niveis: ['ceo', 'fundador'] });
  assert.equal(c.n, 6, 'quem já foi convidado está no topo');
  assert.equal(c.proximo, null);
  assert.deepEqual(posicoesDaPessoa(['ceo', 'fundador', 'diretoria_operacao']).map((p) => p.id), ['ceo', 'fundador', 'diretoria_operacao']);
  assert.equal(degrauDaEscada({ niveis: ['executivo_conta'] }).n, 2, 'Sócio Executivo não é convite');
});

test('os 10% do topo: a divisão oficial do negócio (dono, 06/09/2026) — a mesma que o motor paga', () => {
  assert.equal(TOTAL_TOPO_PCT, 10);
  assert.deepEqual(PARTICIPACAO_TOPO.map((p) => [p.id, p.pct]), [
    ['ceo', 3], ['livoo_live', 2], ['embaixador', 1], ['conselheiro', 1], ['fundador', 1], ['diretoria_executiva', 0.5], ['diretoria_operacao', 0.5], ['executivo_conta', 1],
  ]);
  assert.equal(regraDaParticipacao(PARTICIPACAO_TOPO[0]), '3% individual sobre todas as vendas do ecossistema');
  assert.equal(regraDaParticipacao(PARTICIPACAO_TOPO[4]), '1% em pool, dividido entre quem tem a posição, sobre todas as vendas');
  assert.equal(regraDaParticipacao(PARTICIPACAO_TOPO[7]), '1% sobre a própria estrutura de negócio (não é pool)');
  assert.deepEqual(posicoesDaPessoa(['executivo_conta']).map((p) => p.pool), ['1% sobre a própria estrutura de negócio (não é pool)']);
});

test('os rituais (p. 16, 23, 33–35) e os 12 números do dashboard (Resumo p. 38)', () => {
  assert.deepEqual(rituaisDoDia(1).map((r) => r.id), ['segunda_formacao', 'segunda_organizacao', 'reunioes_investimento', 'lives']);
  assert.deepEqual(rituaisDoDia(5).map((r) => r.id), ['reunioes_investimento', 'conexao_sexta']);
  assert.ok(rituaisDoDia(6).some((r) => r.id === 'lives'), 'sábado tem live');
  assert.equal(RITUAIS.find((r) => r.id === 'segunda_formacao').hora, '09:00');
  assert.equal(DASHBOARD_DIRETORIA.length, 12);
});
