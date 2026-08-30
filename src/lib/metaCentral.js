// metaCentral — META CENTRAL DE VENDAS de R$ 5.000.000/mês (DIR-23,
// 30/08/2026). Fonte: RESUMO EXECUTIVO INTEGRADO do dono — meta central
// R$ 5M/mês com alvo em março/2027, dividida em dois trilhos:
//   • Online  → R$ 4.000.000/mês = Loja Virtual + Leilões (venda REAL,
//     critério oficial src/lib/dinheiroReal.js, do MÊS de referência).
//   • Física  → R$ 1.000.000/mês = loja física/distribuidora. HOJE NÃO
//     EXISTE fonte de dado de venda física no sistema — o trilho aparece
//     como "sem fonte", nunca com número inventado (regra de governança do
//     próprio documento: separar Dado realizado / Premissa / Projeção).
// Não confundir com a meta de CAPTAÇÃO de R$ 1M (src/lib/captacaoParceiros.js):
// aquela é expansão (aportes + adesões); esta é venda de mercadoria.
import { isVendaReal } from './dinheiroReal.js';

export const META_VENDAS_MES = 5000000;
export const META_ONLINE_MES = 4000000;
export const META_FISICA_MES = 1000000;
export const ALVO_META_CENTRAL = 'março/2027';

/** A venda cai dentro do mês de referência? (compara ano+mês em UTC) */
export function mesmoMes(dataVenda, ref) {
  if (!dataVenda) return false;
  const d = new Date(dataVenda);
  if (Number.isNaN(d.getTime())) return false;
  return d.getUTCFullYear() === ref.getUTCFullYear() && d.getUTCMonth() === ref.getUTCMonth();
}

/**
 * Progresso do mês contra a Meta Central.
 * @param sales linhas de catalog_sales (plataforma inteira — painel só de visão total)
 * @param ref Date dentro do mês que se quer medir
 */
/**
 * Ritmo diário do mês contra a meta (DIR-24 Fase 3): venda real de
 * mercadoria por dia do mês de referência + quanto precisa entrar POR DIA
 * daqui até o fim do mês pra fechar a meta. É o gráfico de barras do painel.
 * @returns {{dias: Array<{dia:number, valor:number}>, necessarioPorDia:number, diasRestantes:number}}
 */
export function ritmoDiario(sales = [], ref = new Date()) {
  const ano = ref.getUTCFullYear();
  const mes = ref.getUTCMonth();
  const totalDias = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const hoje = ref.getUTCDate();
  const dias = Array.from({ length: totalDias }, (_, i) => ({ dia: i + 1, valor: 0 }));
  let acumulado = 0;
  for (const s of sales) {
    if (!isVendaReal(s) || !mesmoMes(s.created_date, ref)) continue;
    if (!['loja', 'produto', 'arremate'].includes(s.kind)) continue;
    const d = new Date(s.created_date).getUTCDate();
    const valor = Number(s.total_amount) || 0;
    dias[d - 1].valor += valor;
    acumulado += valor;
  }
  const diasRestantes = Math.max(1, totalDias - hoje + 1); // hoje ainda conta
  const necessarioPorDia = Math.max(0, META_VENDAS_MES - acumulado) / diasRestantes;
  return { dias, necessarioPorDia, diasRestantes };
}

export function calcularMetaCentral(sales = [], ref = new Date()) {
  const doMes = sales.filter((s) => isVendaReal(s) && mesmoMes(s.created_date, ref));
  const soma = (lista) => lista.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  const onlineLoja = soma(doMes.filter((s) => ['loja', 'produto'].includes(s.kind)));
  const onlineLeilao = soma(doMes.filter((s) => s.kind === 'arremate'));
  const online = onlineLoja + onlineLeilao;
  // Venda física: sem fonte no sistema (null ≠ 0 — "não medimos", não "vendemos zero").
  const fisica = null;
  const total = online + (fisica || 0);
  return {
    online,
    onlineLoja,
    onlineLeilao,
    fisica,
    total,
    metaOnline: META_ONLINE_MES,
    metaFisica: META_FISICA_MES,
    metaTotal: META_VENDAS_MES,
    pctOnline: (online / META_ONLINE_MES) * 100,
    pctTotal: (total / META_VENDAS_MES) * 100,
    faltamTotal: Math.max(0, META_VENDAS_MES - total),
  };
}
