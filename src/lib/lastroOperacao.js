// 🏛️ LASTRO E ROI DA OPERAÇÃO — fonte ÚNICA dos cálculos exibidos no bloco
// "Oportunidades do Dia" do painel do Parceiro.
//
// ⚠️ NADA aqui grava, paga, comissiona ou altera dado real. É APRESENTAÇÃO:
// projeção de referência calculada em cima dos lotes já publicados na tela.
//
// 📐 REGRAS OFICIAIS (validadas contra o código em produção em 06/08/2026):
//  • Venda a 80% do valor de mercado — mesma premissa de operacaoNumeros.js
//    (PREMISSAS.valorMercado 100.000 → PREMISSAS.precoVenda 80.000).
//  • Repasse ao parceiro = 3% sobre o CAPITAL APORTADO por ciclo de 30 dias.
//    É EXATAMENTE a regra do motor que já roda no painel
//    (useRentabilidadeAcumulada: alvo = capital × taxaMensalPct / 100).
//    ❌ NÃO é 3% sobre a receita de venda — isso pagaria ~3,5x mais do que a
//    operação paga de verdade e contradiria o contador do ciclo do parceiro.
//  • Orçamento de parceiros de compra = 5% da receita (PREMISSAS.pctParceirosCompra).
//    Serve para demonstrar FOLGA DE PAGAMENTO (cobertura do repasse).
//  • Lucro da operação = RESIDUAL da DRE (receita − aquisição real − comissão de
//    rede − estrutura de venda − parceiros de compra − imposto). Calculado assim
//    a conta FECHA na tela: a soma das linhas dá exatamente a receita. Os
//    percentuais de cada linha são os de operacaoNumeros (PREMISSAS/POR_LOTE):
//    comissão de rede 30%, despesa operacional 20%, parceiros de compra 5% e
//    imposto 7,56% (Simples, PGDAS-D 06/2026) — todos sobre a receita.
//  • ROI do ciclo (Retorno sobre o Investimento) = lucro ÷ capital aportado.

import { PREMISSAS } from '@/lib/operacaoNumeros';

export const PCT_VENDA_SOBRE_MERCADO = 80;
export const PCT_REPASSE_PARCEIRO_CICLO = 3;
export const PCT_ORCAMENTO_PARCEIROS = PREMISSAS.pctParceirosCompra;
export const PCT_COMISSAO_REDE = PREMISSAS.pctComissaoRede;
export const PCT_IMPOSTO = PREMISSAS.aliquotaSimples;
// 🔀 PARCEIROS DE COMPRA = 5% sobre o CAPITAL APORTADO (não sobre a receita),
// dividido em: 3% para o parceiro de compra + 2% para a estrutura do braço
// operacional da captação. Regra confirmada pela diretoria em 06/08/2026.
// ❌ NÃO existe linha separada de "estrutura de venda e operação" na DRE do
// memorial: a estrutura desse braço JÁ É os 2% aqui dentro.
export const PCT_PARCEIRO_COMPRA_TOTAL = 5;
export const PCT_PARCEIRO_REPASSE = 3;
export const PCT_PARCEIRO_ESTRUTURA = 2;

// 💰 Real sem centavos — padrão dos documentos institucionais do Parceiro
export function brl(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Math.round(Number(valor) || 0));
}

// ✖️ Múltiplo no padrão brasileiro: 4,4x
export function vezes(valor) {
  const n = Number(valor) || 0;
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`;
}

// 📉 Percentual com uma casa e vírgula
export function pctBr(valor) {
  const n = Number(valor) || 0;
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function inteiro(valor) {
  return (Number(valor) || 0).toLocaleString('pt-BR');
}

// 📊 Resumo de um conjunto de lotes (serve para o dia E para o mês).
// Espera lotes já normalizados por @/lib/loteParceiro + lanceEntrada/freteOportunidade.
export function resumirLastro(lotes = []) {
  const lista = Array.isArray(lotes) ? lotes : [];

  const lastro = lista.reduce((s, o) => s + (Number(o.valorMercado) || 0), 0);
  const capital = lista.reduce(
    (s, o) => s + (Number(o.lanceEntrada) || 0) + (Number(o.freteOportunidade) || 0),
    0
  );
  const itens = lista.reduce((s, o) => s + (Number(o.quantidade) || 0), 0);

  const receita = lastro * (PCT_VENDA_SOBRE_MERCADO / 100);
  const repasse = capital * (PCT_REPASSE_PARCEIRO_CICLO / 100);
  // 💼 5% SOBRE O CAPITAL APORTADO (3% parceiro de compra + 2% estrutura do braço)
  const orcamentoParceiros = capital * (PCT_PARCEIRO_COMPRA_TOTAL / 100);
  const comissaoRede = receita * (PCT_COMISSAO_REDE / 100);
  const imposto = receita * (PCT_IMPOSTO / 100);
  // 🧾 Lucro = residual da DRE. A soma das linhas fecha exatamente na receita.
  const lucro = receita - capital - comissaoRede - orcamentoParceiros - imposto;

  return {
    lotes: lista.length,
    itens,
    lastro,
    capital,
    receita,
    repasse,
    orcamentoParceiros,
    comissaoRede,
    imposto,
    lucro,
    margemPct: receita > 0 ? (lucro / receita) * 100 : 0,
    // 🔀 destinação dos 5% sobre o capital aportado
    parceiroRepasseFatia: capital * (PCT_PARCEIRO_REPASSE / 100),
    parceiroEstruturaFatia: capital * (PCT_PARCEIRO_ESTRUTURA / 100),
    // 🛒 quanto da lista foi efetivamente pago (capital ÷ valor de mercado)
    pctPagoDaLista: lastro > 0 ? (capital / lastro) * 100 : 0,
    descontoDaListaPct: lastro > 0 ? 100 - (capital / lastro) * 100 : 0,
    // quantas vezes o valor de mercado cobre o capital necessário
    multiploLastro: capital > 0 ? lastro / capital : 0,
    // fatia do capital dentro do lastro (para a barra visual)
    fatiaCapitalPct: lastro > 0 ? Math.min(100, (capital / lastro) * 100) : 0,
    // ROI do ciclo (Retorno sobre o Investimento): lucro ÷ capital aportado
    roiPct: capital > 0 ? (lucro / capital) * 100 : 0,
    // 🛡️ Folga real: quantas vezes o LUCRO da operação cobre o repasse
    // comprometido ao parceiro. Não existe "reserva" — o repasse é pago do lucro.
    coberturaRepasse: repasse > 0 ? lucro / repasse : 0,
    // o capital de giro volta no fechamento do ciclo e é realocado
    capitalDeVolta: capital,
  };
}

// 📅 Filtra lotes do mês corrente (usa a data do leilão e cai na data do registro).
export function doMesCorrente(lotes = []) {
  const agora = new Date();
  const mes = agora.getMonth();
  const ano = agora.getFullYear();
  return (lotes || []).filter((o) => {
    const bruta = o.dataLeilao || o.data;
    if (!bruta) return false;
    const d = new Date(bruta);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === mes && d.getFullYear() === ano;
  });
}