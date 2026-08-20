// simplesNacional — cálculo oficial da alíquota efetiva do Simples Nacional,
// Anexo I (Comércio), LC 123/2006 + LC 155/2016. Mesma fórmula já usada em
// src/lib/operacaoNumeros.js (FONTE_FISCAL): RBT12 confere com 7,56% hoje.
//
// Por que existe: o dono pediu que a alíquota do painel de lucro diário
// acompanhe o crescimento da operação — hoje é 7,56% (Faixa 3), mas se o
// faturamento dos últimos 12 meses (RBT12) crescer o suficiente, a faixa
// muda e a alíquota efetiva sobe. Em vez de um número fixo, calcula a faixa
// certa a cada vez e avisa quando está perto da próxima.

// Faixas oficiais do Anexo I (RBT12 em R$, alíquota nominal, parcela a deduzir)
export const FAIXAS_ANEXO_I = [
  { min: 0, max: 180000, aliquotaNominal: 4.0, deducao: 0 },
  { min: 180000.01, max: 360000, aliquotaNominal: 7.3, deducao: 5940 },
  { min: 360000.01, max: 720000, aliquotaNominal: 9.5, deducao: 13860 },
  { min: 720000.01, max: 1800000, aliquotaNominal: 10.7, deducao: 22500 },
  { min: 1800000.01, max: 3600000, aliquotaNominal: 14.3, deducao: 87300 },
  { min: 3600000.01, max: 4800000, aliquotaNominal: 19.0, deducao: 378000 },
];

/** Faixa do Anexo I em que o RBT12 informado se encaixa. */
export function faixaDoRbt12(rbt12) {
  const r = Number(rbt12) || 0;
  return FAIXAS_ANEXO_I.find((f) => r >= f.min && r <= f.max) || FAIXAS_ANEXO_I[FAIXAS_ANEXO_I.length - 1];
}

/**
 * Alíquota efetiva: ((RBT12 × Alíquota Nominal) − Parcela a Deduzir) ÷ RBT12.
 * RBT12 = 0 cai na Faixa 1 (empresa nova, ainda sem 12 meses de histórico).
 */
export function calcularAliquotaEfetiva(rbt12) {
  const r = Number(rbt12) || 0;
  if (r <= 0) return FAIXAS_ANEXO_I[0].aliquotaNominal;
  const faixa = faixaDoRbt12(r);
  const efetiva = ((r * faixa.aliquotaNominal) / 100 - faixa.deducao) / r * 100;
  return Math.max(0, Math.round(efetiva * 100) / 100);
}

/**
 * Visão completa pra exibir no painel: alíquota atual, faixa, quanto falta em
 * RBT12 pra bater na próxima faixa (o dono pediu esse alerta de crescimento).
 */
export function analiseFiscal(rbt12) {
  const r = Number(rbt12) || 0;
  const faixa = faixaDoRbt12(r);
  const aliquotaEfetiva = calcularAliquotaEfetiva(r);
  const idx = FAIXAS_ANEXO_I.indexOf(faixa);
  const proxima = idx >= 0 && idx < FAIXAS_ANEXO_I.length - 1 ? FAIXAS_ANEXO_I[idx + 1] : null;
  const faltamParaProximaFaixa = proxima ? Math.max(0, proxima.min - r) : null;
  // "perto" = dentro dos últimos 10% da faixa atual — vale um aviso proativo
  const largura = faixa.max - faixa.min;
  const percorrido = largura > 0 ? (r - faixa.min) / largura : 1;
  const pertoDaProximaFaixa = Boolean(proxima) && percorrido >= 0.9;
  return {
    rbt12: r,
    faixaAtual: faixa,
    aliquotaNominal: faixa.aliquotaNominal,
    aliquotaEfetiva,
    proximaFaixa: proxima,
    aliquotaEfetivaProximaFaixa: proxima ? calcularAliquotaEfetiva(proxima.min) : null,
    faltamParaProximaFaixa,
    pertoDaProximaFaixa,
  };
}
