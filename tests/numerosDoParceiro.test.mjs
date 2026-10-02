/**
 * 📊 OS NÚMEROS E OS TEXTOS DO PARCEIRO DE COMPRA — depois de 02/10/2026.
 *
 * Decisão da diretoria na véspera de uma apresentação: a linha "Parceiros de
 * compra (5%)" sai de todos os quadros e tudo é recalculado; a participação
 * vira "até 2,15% (verificar consultor)"; cotas só a partir de R$ 30 mil; o
 * primeiro ciclo é de 30 dias; os repasses vão de 12 a 36 meses.
 *
 * A prova mais importante aqui é a ARITMÉTICA: cada quadro tem que fechar
 * linha a linha, porque ele é lido por quem faz conta.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PREMISSAS, POR_LOTE, HOJE, ESCALA_1M, ESCADA, VALUATION, MULTIPLOS } from '../src/lib/operacaoNumeros.js';
import { PLANOS_PARCEIRO, TAXA_PARCEIRO, PRAZO_PARCEIRO } from '../src/lib/planosParceiro.js';

const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('🧮 o lote fecha sem a linha dos 5%', () => {
  assert.equal(PREMISSAS.pctParceirosCompra, undefined, 'a premissa saiu');
  assert.equal(POR_LOTE.parceirosCompra, undefined);
  const soma = POR_LOTE.receita - POR_LOTE.aquisicao - POR_LOTE.comissaoRede - POR_LOTE.despesaOperacional - POR_LOTE.imposto;
  assert.equal(POR_LOTE.lucro, soma);
  assert.equal(POR_LOTE.lucro, 8952);
  assert.equal(POR_LOTE.roiPct, 35.8);
});

test('🧮 o cenário Hoje fecha linha a linha', () => {
  assert.equal(HOJE.parceirosCompra, undefined);
  assert.equal(HOJE.lucroBruto, HOJE.receita - HOJE.aquisicao);
  assert.equal(HOJE.ebitda, HOJE.lucroBruto - HOJE.comissaoRede - HOJE.despesaOperacional);
  assert.equal(HOJE.lucro, HOJE.ebitda - HOJE.imposto);
  assert.equal(HOJE.lucroAnual, HOJE.lucro * 12);
  assert.equal(Math.round((HOJE.lucro / HOJE.receita) * 1000) / 10, HOJE.margemPct);
});

test('🧮 a escala de R$ 1M fecha, com IRPJ na forma da lei', () => {
  assert.equal(ESCALA_1M.parceirosCompra, undefined);
  assert.equal(ESCALA_1M.lair, ESCALA_1M.lucroBruto - ESCALA_1M.comissaoRede - ESCALA_1M.despesaFixa);
  assert.equal(ESCALA_1M.irpj, Math.round(0.15 * ESCALA_1M.lair + 0.10 * (ESCALA_1M.lair - 20000)));
  assert.equal(ESCALA_1M.csll, Math.round(0.09 * ESCALA_1M.lair));
  assert.equal(ESCALA_1M.impostoTotal, ESCALA_1M.irpj + ESCALA_1M.csll + ESCALA_1M.pisCofins + ESCALA_1M.icms);
  assert.equal(ESCALA_1M.lucro, ESCALA_1M.lair - ESCALA_1M.impostoTotal);
  assert.equal(ESCALA_1M.lucroAnual, ESCALA_1M.lucro * 12);
});

test('🧮 a escada: lucro = LAIR − imposto, anual = ×12, e o degrau de 1M bate com ESCALA_1M', () => {
  for (const d of ESCADA.filter((x) => x.lair !== null)) {
    assert.equal(d.lucro, d.lair - d.imposto, d.rotulo);
    assert.equal(d.lucroAnual, d.lucro * 12, d.rotulo);
    assert.equal(d.roiPct, Math.round((d.lucro / d.capital) * 1000) / 10, d.rotulo);
  }
  const um = ESCADA.find((d) => d.receita === 1000000);
  assert.equal(um.lucro, ESCALA_1M.lucro);
  assert.equal(ESCADA[0].lucro, HOJE.lucro, 'o degrau "Hoje" é o cenário Hoje');
});

test('🧮 o valuation é múltiplo do resultado anual', () => {
  assert.equal(VALUATION.apuradoLucroAnual, HOJE.lucroAnual);
  assert.equal(VALUATION.apuradoMin, HOJE.lucroAnual * MULTIPLOS.min);
  assert.equal(VALUATION.apuradoMax, HOJE.lucroAnual * MULTIPLOS.max);
  assert.equal(VALUATION.projetadoLucroAnual, ESCALA_1M.lucroAnual);
  assert.equal(VALUATION.projetadoMin, ESCALA_1M.lucroAnual * MULTIPLOS.min);
  assert.equal(VALUATION.projetadoMax, ESCALA_1M.lucroAnual * MULTIPLOS.max);
});

test('💼 planos: só a partir de R$ 30 mil, taxa "até 2,15% (verificar consultor)", prazo de 12 a 36 meses', () => {
  assert.deepEqual(PLANOS_PARCEIRO.map((p) => p.name), ['Plano Elite', 'Plano Personalizado']);
  assert.ok(PLANOS_PARCEIRO.filter((p) => !p.isCustom).every((p) => p.minInvestment >= 30000));
  assert.equal(TAXA_PARCEIRO.pct, 2.15);
  assert.equal(TAXA_PARCEIRO.rotulo, 'até 2,15% (verificar consultor)');
  assert.equal(PRAZO_PARCEIRO.rotulo, 'de 12 a 36 meses');
});

// lastroOperacao.js importa pelo atalho `@/` (não roda no Node): a prova é no texto
test('🏛️ o lastro do dia: repasse pela taxa oficial, sem o orçamento de parceiros (3% + 2%)', () => {
  const L = ler('src/lib/lastroOperacao.js');
  assert.match(L, /export const PCT_REPASSE_PARCEIRO_CICLO = TAXA_PARCEIRO\.pct;/);
  assert.match(L, /export const ROTULO_REPASSE_PARCEIRO = TAXA_PARCEIRO\.rotulo;/);
  assert.doesNotMatch(L, /orcamentoParceiros|PCT_PARCEIRO_COMPRA_TOTAL|PCT_PARCEIRO_ESTRUTURA|parceiroRepasseFatia/);
  assert.match(L, /const lucro = receita - capital - comissaoRede - imposto;/);
});

test('📄 os textos: sem "Parceiros de compra" nos quadros, 30 dias no memorando, 12 a 36 meses no ciclo e no contrato', () => {
  const memo = ler('src/components/parceiro/painel/ParceiroMemorando.jsx');
  assert.doesNotMatch(memo, /rotulo="Parceiros de compra"/);
  assert.doesNotMatch(memo, /60 dias/);
  assert.match(memo, /valor="30 dias \(Cláusula 8\.2\)"/);
  const val = ler('src/components/parceiro/painel/ParceiroValuation.jsx');
  assert.doesNotMatch(val, /rotulo="Parceiros de compra"/);
  const memorial = ler('src/components/parceiro/painel/oportunidades/MemorialCalculoModal.jsx');
  assert.doesNotMatch(memorial, /Parceiros de compra|PCT_PARCEIRO_ESTRUTURA/);
  const ciclo = ler('src/components/parceiro/ParceiroCiclo.jsx');
  assert.match(ciclo, /De 12 a 36 meses de repasses/);
  const contrato = ler('src/components/parceiro/painel/ParceiroContratoTexto.jsx');
  assert.match(contrato, /8\.1\. O presente contrato terá vigência de 12 \(doze\) a 36 \(trinta e seis\) meses de repasses/);
  assert.match(contrato, /8\.4\. Ao final do prazo de repasses contratado \(de 12 a 36 meses\)/);
  const contas = ler('src/components/parceiro/painel/contas/ContasDemonstrativo.jsx');
  assert.doesNotMatch(contas, /parceirosCompra/);
});
