// 📊 NÚMEROS OFICIAIS DA OPERAÇÃO — base do Valuation e do Investment Memorandum
// exibidos no painel do Parceiro.
//
// ⚠️ FONTE ÚNICA DA VERDADE. Todo número aqui foi recalculado do zero na auditoria
// do LAUDO MASTER LNZ-2026-005 (22/07/2026) e corrige as divergências encontradas:
//
//  1. IRPJ estava calculado como "34% flat sobre o LAIR". O correto é
//     IRPJ 15% + adicional de 10% sobre o que excede R$ 20.000/mês + CSLL 9%.
//     No cenário de R$ 1M/mês isso significava R$ 5.550/mês de imposto a MAIS
//     do que o devido — o laudo era pessimista contra a própria operação.
//  2. O mesmo cenário de R$ 1M/mês aparecia com DOIS lucros diferentes no laudo
//     (R$ 186.450 no card e R$ 182.900 na DRE). Aqui existe um único valor.
//  3. Despesa fixa: o laudo dizia "mesma estrutura" mas aplicava 5,5% da receita
//     em todas as escalas. Estrutura fixa é valor ABSOLUTO (R$ 48.000/mês) — é
//     assim que entra aqui, o que corrige para baixo a linha de R$ 500 mil.
//  4. Capital: o laudo multiplicava o ROI por 4 (giro semanal) em um cenário e
//     ignorava o giro em outro. DECISÃO: capital = 25% da receita do mês, SEM
//     multiplicar por giro. É a leitura mais conservadora e defensável.
//  5. Cenário "Hoje": o laudo aplicava a alíquota de 7,56% (apurada com RBT12 de
//     R$ 714.458) sobre uma receita de R$ 240 mil/mês — que na prática cairia em
//     outra faixa do Simples. Aqui o cenário "Hoje" usa a receita real que
//     originou esse RBT12, mantendo a alíquota legítima.

// ── Premissas operacionais (por lote) ──────────────────────────────────────────
export const PREMISSAS = {
  aquisicao: 25000,        // valor pago no arremate do lote
  valorMercado: 100000,    // valor de mercado dos itens do lote
  precoVenda: 80000,       // preço de venda (20% abaixo do mercado)
  pctAquisicao: 25,        // custo de aquisição sobre a receita
  pctComissaoRede: 30,     // comissão paga à rede de vendas
  pctDespesaOperacional: 20, // despesa operacional no estágio atual
  pctParceirosCompra: 5,   // remuneração dos parceiros de compra
  aliquotaSimples: 7.56,   // PGDAS-D 06/2026, RBT12 R$ 714.458 (Anexo I, Faixa 3)
  rbt12: 714458,
  despesaFixaMensal: 48000, // estrutura atual em valor absoluto
  cicloDias: 7,
  markupPct: 220,          // (80.000 − 25.000) / 25.000
};

// ── Cenário por lote (unidade da operação) ─────────────────────────────────────
export const POR_LOTE = {
  receita: 80000,
  aquisicao: 25000,
  comissaoRede: 24000,
  despesaOperacional: 16000,
  parceirosCompra: 4000,
  imposto: 6048,           // 7,56% de 80.000
  lucro: 4952,
  roiPct: 19.8,            // 4.952 / 25.000
  // Sem estrutura operacional (arbitragem pura) — referência teórica de teto:
  lucroSemEstrutura: 24952,
  roiSemEstruturaPct: 99.8,
};

// ── Cenário HOJE — apurado, regime Simples Nacional ───────────────────────────
// Receita mensal média = RBT12 ÷ 12 = 714.458 ÷ 12
export const HOJE = {
  regime: 'Simples Nacional — 7,56% (PGDAS-D 06/2026)',
  receita: 59538,
  aquisicao: 14885,
  lucroBruto: 44653,
  comissaoRede: 17861,
  despesaOperacional: 11908,
  parceirosCompra: 2977,
  ebitda: 11907,
  imposto: 4501,
  lucro: 7407,
  margemPct: 12.4,
  capital: 14885,
  roiPct: 49.8,
  lucroAnual: 88884,
  apurado: true,
};

// ── Cenário ESCALA R$ 1M/mês — regime Lucro Real (obrigatório acima do teto) ──
export const ESCALA_1M = {
  regime: 'Lucro Real — obrigatório acima de R$ 4,8M/ano',
  receita: 1000000,
  aquisicao: 250000,
  lucroBruto: 750000,
  comissaoRede: 300000,
  despesaFixa: 55000,
  parceirosCompra: 50000,
  lair: 345000,
  irpj: 84250,             // 15% de 345.000 + 10% sobre (345.000 − 20.000)
  csll: 31050,             // 9% do LAIR
  pisCofins: 23250,        // não-cumulativo líquido, com crédito de entradas
  icms: 18000,             // líquido, com crédito de entradas
  impostoTotal: 156550,
  cargaSobreReceitaPct: 15.66,
  lucro: 188450,
  margemPct: 18.8,
  capital: 250000,
  roiPct: 75.4,
  lucroAnual: 2261400,
  apurado: false,
};

// ── Escada de escala (projeções) ──────────────────────────────────────────────
// Estrutura fixa mantida em R$ 48.000/mês a partir de R$ 500 mil.
// PIS/COFINS líquido = 2,325% da receita · ICMS líquido = 1,8% da receita.
// IRPJ = 15% do LAIR + 10% sobre o excedente de R$ 20.000/mês · CSLL = 9% do LAIR.
export const ESCADA = [
  {
    rotulo: 'Hoje — apurado',
    regime: 'Simples 7,56%',
    receita: 59538,
    capital: 14885,
    lair: null,
    imposto: 4501,
    lucro: 7407,
    roiPct: 49.8,
    lucroAnual: 88884,
    apurado: true,
  },
  {
    rotulo: 'R$ 500 mil/mês',
    regime: 'Lucro Real',
    receita: 500000,
    capital: 125000,
    lair: 152000,
    imposto: 70305,
    lucro: 81695,
    roiPct: 65.4,
    lucroAnual: 980340,
    apurado: false,
  },
  {
    rotulo: 'R$ 1 milhão/mês',
    regime: 'Lucro Real',
    receita: 1000000,
    capital: 250000,
    lair: 345000,
    imposto: 156550,
    lucro: 188450,
    roiPct: 75.4,
    lucroAnual: 2261400,
    apurado: false,
    destaque: true,
  },
  {
    rotulo: 'R$ 2 milhões/mês',
    regime: 'Lucro Real',
    receita: 2000000,
    capital: 500000,
    lair: 752000,
    imposto: 336180,
    lucro: 415820,
    roiPct: 83.2,
    lucroAnual: 4989840,
    apurado: false,
  },
  {
    rotulo: 'R$ 5 milhões/mês',
    regime: 'Lucro Real',
    receita: 5000000,
    capital: 1250000,
    lair: 1952000,
    imposto: 867930,
    lucro: 1084070,
    roiPct: 86.7,
    lucroAnual: 13008840,
    apurado: false,
  },
  {
    rotulo: 'R$ 10 milhões/mês',
    regime: 'Lucro Real',
    receita: 10000000,
    capital: 2500000,
    lair: 3952000,
    imposto: 1754180,
    lucro: 2197820,
    roiPct: 87.9,
    lucroAnual: 26373840,
    apurado: false,
  },
];

// ── Múltiplos de referência para o Valuation ──────────────────────────────────
// NÃO é laudo de avaliação. São múltiplos ilustrativos sobre lucro líquido anual,
// faixa usual de negócios de varejo/distribuição de pequeno porte no Brasil.
export const MULTIPLOS = { min: 3, max: 6 };

export const VALUATION = {
  // Sobre resultado APURADO (o único número auditável hoje)
  apuradoLucroAnual: 88884,
  apuradoMin: 266652,      // 88.884 × 3
  apuradoMax: 533304,      // 88.884 × 6
  // Sobre o cenário projetado de R$ 1M/mês (projeção, não valor atual)
  projetadoLucroAnual: 2261400,
  projetadoMin: 6784200,   // 2.261.400 × 3
  projetadoMax: 13568400,  // 2.261.400 × 6
};

export const FONTE_FISCAL = {
  pgdas: 'PGDAS-D 51544091202606002',
  recibo: '01.07.26203.0126065-4',
  transmitido: '22/07/2026',
  contadora: 'Jucélia Teixeira de Azevedo',
  crc: 'CRC 124.591/RJ',
  empresa: 'COMPRAS FULL COMÉRCIO LTDA',
  cnpj: 'CNPJ 51.544.091/0001-67',
  formula: 'RBT12 R$ 714.458,00 × 9,50% − R$ 13.860,00 ÷ RBT12 = 7,56% (LC 123/2006, Anexo I)',
};

// 💰 Formatação em Real, sem centavos (padrão dos documentos institucionais)
export function real(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}

// 📉 Percentual com uma casa, no padrão brasileiro (vírgula)
export function pct(valor) {
  return `${String(valor).replace('.', ',')}%`;
}