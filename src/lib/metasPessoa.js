// 🎯 AS METAS DA PESSOA — o modelo por função, o progresso e o ritmo.
//
// DE ONDE VEIO (dono, 06/09/2026): "meta mensal, os produtos que precisa
// vender, tudo no quadro geral da pessoa". E sobre a página Metas antiga:
// "acaba com ela e joga pra dentro".
//
// O PROGRESSO NÃO É DIGITADO: sai das tarefas feitas (por Hábito) e das
// vendas pagas do catálogo. Contato feito é Hábito 4; reunião/apresentação
// é Hábito 5; fechamento e contrato são Hábito 6. Faturamento e produto
// vêm de catalog_sales. Assim a meta e o dia da pessoa falam a mesma língua.
import { DIAS_FIXO } from './distribuicaoFixo.js';

export const CHAVES = [
  { chave: 'contatos', rotulo: 'Contatos feitos', habito: 4, unidade: 'no mês' },
  { chave: 'reunioes', rotulo: 'Reuniões / apresentações', habito: 5, unidade: 'no mês' },
  { chave: 'fechamentos', rotulo: 'Fechamentos', habito: 6, unidade: 'no mês' },
  { chave: 'contratos', rotulo: 'Contratos', habito: 6, unidade: 'no mês' },
  { chave: 'treinamentos', rotulo: 'Treinamentos dados', habito: 8, unidade: 'no mês' },
  { chave: 'faturamento', rotulo: 'Faturamento', habito: null, unidade: 'R$' },
];
export const chaveDe = (id) => CHAVES.find((c) => c.chave === id) || null;

/** O modelo de metas do mês por função — o ponto de partida, editável. */
export const METAS_MODELO = {
  socio_executivo: [['contatos', 20 * DIAS_FIXO], ['reunioes', 3 * DIAS_FIXO], ['fechamentos', 12], ['faturamento', 30000]],
  diretor_operacoes: [['reunioes', 20], ['treinamentos', DIAS_FIXO], ['fechamentos', 40], ['faturamento', 150000]],
  diretoria_executiva: [['reunioes', 12], ['treinamentos', 8], ['contratos', 10], ['faturamento', 400000]],
  ceo: [['treinamentos', 8], ['contratos', 6], ['faturamento', 1000000]],
  livoo_live: [['reunioes', DIAS_FIXO], ['treinamentos', 8], ['faturamento', 80000]],
  embaixador: [['contatos', 10 * DIAS_FIXO], ['reunioes', 20], ['contratos', 6], ['faturamento', 60000]],
  cmo: [['treinamentos', 8], ['reunioes', 12], ['contatos', 200]],
  cto: [['treinamentos', 4], ['reunioes', 12]],
  cfo: [['reunioes', 12], ['contratos', 10]],
};

/** As metas do modelo de uma função, prontas pra gravar. */
export function metasDoModelo(funcaoId, { userId, mes, criadoPorId = null } = {}) {
  return (METAS_MODELO[funcaoId] || []).map(([chave, alvo]) => {
    const c = chaveDe(chave);
    return { user_id: userId, mes, tipo: 'numero', chave, rotulo: c?.rotulo || chave, alvo, unidade: c?.unidade || 'no mês', criado_por_id: criadoPorId };
  });
}

/** Quanto do mês já passou (0..1), pelos dias corridos. */
export function ritmoDoMes(mes, hojeISO) {
  if (!mes || !hojeISO) return 0;
  const [a, m] = mes.split('-').map(Number);
  const diasNoMes = new Date(a, m, 0).getDate();
  const hoje = new Date(`${hojeISO}T12:00:00`);
  if (hoje.getFullYear() < a || (hoje.getFullYear() === a && hoje.getMonth() + 1 < m)) return 0;
  if (hoje.getFullYear() > a || hoje.getMonth() + 1 > m) return 1;
  return Math.min(1, hoje.getDate() / diasNoMes);
}

const valorDaVenda = (s) => Number(s?.total_amount ?? s?.total ?? s?.amount ?? s?.valor_total ?? 0) || 0;

/**
 * O progresso de cada meta: feito, alvo, %, e se está no ritmo do mês.
 * `tarefasDoMes` = as tarefas FEITAS da pessoa no mês (com habito);
 * `vendasDoMes` = as vendas pagas da pessoa no mês.
 */
export function progressoDasMetas({ metas = [], tarefasDoMes = [], vendasDoMes = [], mes, hojeISO } = {}) {
  const ritmo = ritmoDoMes(mes, hojeISO);
  const feitasPorHabito = {};
  for (const t of tarefasDoMes) { if (t?.feito && t.habito) feitasPorHabito[t.habito] = (feitasPorHabito[t.habito] || 0) + 1; }
  return (Array.isArray(metas) ? metas : []).map((m) => {
    let feito = 0;
    if (m.tipo === 'produto') feito = vendasDoMes.filter((v) => v.product_id === m.produto_id || v.produto_id === m.produto_id).reduce((s, v) => s + (Number(v.quantity ?? v.quantidade ?? 1) || 1), 0);
    else if (m.chave === 'faturamento') feito = vendasDoMes.reduce((s, v) => s + valorDaVenda(v), 0);
    else { const c = chaveDe(m.chave); feito = c?.habito ? (feitasPorHabito[c.habito] || 0) : 0; }
    const alvo = Number(m.alvo) || 0;
    const pct = alvo > 0 ? Math.min(999, Math.round((feito / alvo) * 100)) : 0;
    const esperado = alvo * ritmo;
    return { ...m, feito, pct, ritmo, esperado, noRitmo: alvo <= 0 || feito >= esperado - 1e-9, faltaNoRitmo: Math.max(0, esperado - feito) };
  });
}

/** 🚦 verde: planejou, sem atraso, metas no ritmo · amarelo: um furo · vermelho: dois ou mais. */
export function semaforo({ planejou = true, atrasadas = 0, metasForaDoRitmo = 0, devolvidas = 0 } = {}) {
  const furos = (planejou ? 0 : 1) + (atrasadas > 0 ? 1 : 0) + (metasForaDoRitmo > 0 ? 1 : 0) + (devolvidas > 0 ? 1 : 0);
  const motivos = [
    !planejou && 'não gerou o planejamento de hoje',
    atrasadas > 0 && `${atrasadas} pronto${atrasadas > 1 ? 's' : ''} atrasado${atrasadas > 1 ? 's' : ''}`,
    metasForaDoRitmo > 0 && `${metasForaDoRitmo} meta${metasForaDoRitmo > 1 ? 's' : ''} atrás do ritmo`,
    devolvidas > 0 && `${devolvidas} tarefa${devolvidas > 1 ? 's' : ''} devolvida${devolvidas > 1 ? 's' : ''} sem refazer`,
  ].filter(Boolean);
  return { cor: furos === 0 ? 'verde' : furos === 1 ? 'amarelo' : 'vermelho', furos, motivos };
}

/** O mês em 'YYYY-MM' de um dia ISO. */
export const mesDe = (iso) => String(iso || '').slice(0, 7);
