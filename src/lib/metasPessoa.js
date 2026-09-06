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
import { CARGOS_OFICIAIS } from './documentoOficial.js';

// O PROGRESSO de cada chave sai de uma FONTE — nunca é digitado:
//   habito   → tarefas feitas da pessoa no mês com aquele Hábito;
//   vendas   → catalog_sales pagas (faturamento, produto);
//   captacao → captacao_oportunidades fechadas (fechado_100) do responsável no mês;
//   cadastros→ app_users novos no mês (por nível, recrutados pela pessoa; ou a plataforma inteira);
export const CHAVES = [
  { chave: 'contatos', rotulo: 'Contatos feitos', habito: 4, unidade: 'no mês', fonte: 'habito' },
  { chave: 'reunioes', rotulo: 'Reuniões / apresentações', habito: 5, unidade: 'no mês', fonte: 'habito' },
  { chave: 'reunioes_investimento', rotulo: 'Reuniões de investimento', habito: 5, unidade: 'no mês', fonte: 'habito', nota: '2 por dia × 22 dias produtivos (Documento p. 16)' },
  { chave: 'fechamentos', rotulo: 'Fechamentos', habito: 6, unidade: 'no mês', fonte: 'habito' },
  { chave: 'contratos', rotulo: 'Contratos', habito: 6, unidade: 'no mês', fonte: 'habito' },
  { chave: 'parcerias', rotulo: 'Parcerias estratégicas', habito: 6, unidade: 'no mês', fonte: 'habito' },
  { chave: 'pontos_retirada', rotulo: 'Pontos de retirada abertos', habito: 6, unidade: 'no mês', fonte: 'habito' },
  { chave: 'lojas', rotulo: 'Lojas físicas abertas', habito: 6, unidade: 'a cada 2 meses', fonte: 'habito' },
  { chave: 'treinamentos', rotulo: 'Treinamentos dados', habito: 8, unidade: 'no mês', fonte: 'habito' },
  { chave: 'encontros_formacao', rotulo: 'Encontros de formação conduzidos', habito: 8, unidade: 'no mês', fonte: 'habito' },
  { chave: 'lives', rotulo: 'Lives comerciais', habito: 5, unidade: 'no mês', fonte: 'habito' },
  { chave: 'fechamentos_caixa', rotulo: 'Fechamentos de caixa', habito: 7, unidade: 'no mês', fonte: 'habito' },
  { chave: 'entregas_tecnicas', rotulo: 'Entregas técnicas publicadas', habito: 6, unidade: 'no mês', fonte: 'habito' },
  { chave: 'captacao', rotulo: 'Captação de capital', habito: null, unidade: 'R$', fonte: 'captacao' },
  { chave: 'vendedores', rotulo: 'Vendedores novos', habito: null, unidade: 'no mês', fonte: 'cadastros', nivel: 'vendedor' },
  { chave: 'licenciados', rotulo: 'Licenciados novos', habito: null, unidade: 'no mês', fonte: 'cadastros', nivel: 'licenciado' },
  { chave: 'influenciadores', rotulo: 'Influenciadores novos', habito: null, unidade: 'no mês', fonte: 'cadastros', nivel: 'influenciador' },
  { chave: 'entradas', rotulo: 'Novas pessoas no ecossistema', habito: null, unidade: 'no mês', fonte: 'cadastros', nivel: null, plataforma: true },
  { chave: 'cadastros', rotulo: 'Cadastros no Ranking', habito: null, unidade: 'no mês', fonte: 'cadastros', nivel: null, plataforma: true },
  { chave: 'faturamento', rotulo: 'Faturamento', habito: null, unidade: 'R$', fonte: 'vendas' },
];
export const chaveDe = (id) => CHAVES.find((c) => c.chave === id) || null;

// ── o modelo por função ──
// As funções OFICIAIS puxam as metas do Documento Oficial (documentoOficial.js):
// captação por executivo (p. 14), 44 reuniões de investimento (p. 16), 20
// vendedores / 5 licenciados / 30 influenciadores (p. 22), 2 parcerias (p. 25),
// 1 ponto de retirada por mês e 1 loja a cada 2 meses (p. 21), 1.000
// pessoas/dia (p. 24)… Onde o documento não dá número, a linha vem marcada
// `oficial: false` (sugestão) e o dono ajusta. As funções do painel (Sócio
// Executivo, Livoo Live, Embaixador) seguem a sugestão de sempre.
const SUGESTOES_DO_PAINEL = {
  socio_executivo: [['contatos', 20 * DIAS_FIXO], ['reunioes', 3 * DIAS_FIXO], ['fechamentos', 12], ['faturamento', 30000]],
  livoo_live: [['lives', 20], ['treinamentos', 8], ['faturamento', 80000]],
  embaixador: [['contatos', 10 * DIAS_FIXO], ['reunioes', 20], ['influenciadores', 10], ['contratos', 6], ['faturamento', 60000]],
};
export const METAS_MODELO = Object.fromEntries([
  ...CARGOS_OFICIAIS.map((c) => [c.id, c.metas.map((m) => [m.chave, m.alvo, m.oficial, m.nota])]),
  ...Object.entries(SUGESTOES_DO_PAINEL).map(([id, lista]) => [id, lista.map(([chave, alvo]) => [chave, alvo, false, null])]),
]);

/** As metas do modelo de uma função, prontas pra gravar. */
export function metasDoModelo(funcaoId, { userId, mes, criadoPorId = null } = {}) {
  return (METAS_MODELO[funcaoId] || []).map(([chave, alvo]) => {
    const c = chaveDe(chave);
    return { user_id: userId, mes, tipo: 'numero', chave, rotulo: c?.rotulo || chave, alvo, unidade: c?.unidade || 'no mês', criado_por_id: criadoPorId };
  });
}

/** O modelo com a marca de onde veio cada linha (documento oficial ou sugestão). */
export function modeloDaFuncao(funcaoId) {
  return (METAS_MODELO[funcaoId] || []).map(([chave, alvo, oficial, nota]) => ({ chave, alvo, oficial: !!oficial, nota: nota || null, rotulo: chaveDe(chave)?.rotulo || chave, unidade: chaveDe(chave)?.unidade || 'no mês' }));
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
export function progressoDasMetas({ metas = [], tarefasDoMes = [], vendasDoMes = [], oportunidadesDoMes = [], cadastrosDoMes = [], pessoaId = null, mes, hojeISO } = {}) {
  const ritmo = ritmoDoMes(mes, hojeISO);
  const feitasPorHabito = {};
  for (const t of tarefasDoMes) { if (t?.feito && t.habito) feitasPorHabito[t.habito] = (feitasPorHabito[t.habito] || 0) + 1; }
  // captação fechada no mês (fechado_100) — o valor previsto da oportunidade
  const captado = (Array.isArray(oportunidadesDoMes) ? oportunidadesDoMes : []).filter((o) => o?.estagio === 'fechado_100').reduce((s, o) => s + (Number(o.valor_previsto) || 0), 0);
  const nivelDe = (u) => (u?.primary_career_level || (Array.isArray(u?.career_levels) ? u.career_levels[0] : null) || '').toString();
  const recrutadoPor = (u) => u?.recruited_by_id || u?.referred_by_id || null;
  return (Array.isArray(metas) ? metas : []).map((m) => {
    let feito = 0;
    const c = chaveDe(m.chave);
    if (m.tipo === 'produto') feito = vendasDoMes.filter((v) => v.product_id === m.produto_id || v.produto_id === m.produto_id).reduce((s, v) => s + (Number(v.quantity ?? v.quantidade ?? 1) || 1), 0);
    else if (m.chave === 'faturamento') feito = vendasDoMes.reduce((s, v) => s + valorDaVenda(v), 0);
    else if (c?.fonte === 'captacao') feito = captado;
    else if (c?.fonte === 'cadastros') feito = (Array.isArray(cadastrosDoMes) ? cadastrosDoMes : []).filter((u) => (c.plataforma || !pessoaId || recrutadoPor(u) === pessoaId) && (!c.nivel || nivelDe(u) === c.nivel)).length;
    else feito = c?.habito ? (feitasPorHabito[c.habito] || 0) : 0;
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

// ── 📊 as cinco frações do Score Executivo (Documento p. 42), lidas do que a pessoa fez ──
//   resultado    → a média do % das metas do mês (teto 100% cada);
//   entregaveis  → cards entregues ÷ cards do quadro da diretoria (xperf_entregaveis);
//   equipe       → tarefas de Hábito 8 (duplicação/treinamento) feitas ÷ planejadas no ciclo;
//   cultura      → tarefas de formação (categoria mentoria) feitas ÷ planejadas no ciclo;
//   organizacao  → dias com planejamento gerado ÷ dias de operação já passados no ciclo.
// `null` = sem dado ainda (o score mostra "sem dado" em vez de zero escondido).
export function fracoesDoScore({ progresso = [], entregaveis = [], tarefasCiclo = [], pessoaId, hojeISO, cicloInicio } = {}) {
  const metas = progresso.filter((m) => Number(m.alvo) > 0);
  const resultado = metas.length ? metas.reduce((s, m) => s + Math.min(1, (Number(m.feito) || 0) / Number(m.alvo)), 0) / metas.length : null;
  const cards = entregaveis.filter((e) => !pessoaId || e.dono_id === pessoaId);
  const entregues = cards.filter((e) => e.coluna === 'entregue').length;
  const minhas = tarefasCiclo.filter((t) => !pessoaId || t.user_id === pessoaId);
  const h8 = minhas.filter((t) => Number(t.habito) === 8);
  const formacao = minhas.filter((t) => (t.categoria || '') === 'mentoria');
  const razao = (lista) => (lista.length ? lista.filter((t) => t.feito).length / lista.length : null);
  const dias = [...new Set(minhas.map((t) => String(t.data).slice(0, 10)))];
  const passados = dias.filter((d) => d <= String(hojeISO || '') && (!cicloInicio || d >= cicloInicio));
  const planejados = passados.filter((d) => {
    const doDia = minhas.filter((t) => String(t.data).slice(0, 10) === d);
    return doDia.some((t) => (t.origem || '') !== 'xperf');
  });
  return {
    resultado,
    entregaveis: cards.length ? entregues / cards.length : null,
    equipe: razao(h8),
    cultura: razao(formacao),
    organizacao: passados.length ? planejados.length / passados.length : null,
  };
}

/** A carteira de capital construída pela pessoa: o que fechou (fechado_100) nos últimos 12 meses — contratos de 12 meses (Documento p. 11). */
export function carteiraDeCapital(oportunidades = [], hojeISO) {
  const limite = hojeISO ? new Date(`${hojeISO}T12:00:00`) : new Date();
  limite.setFullYear(limite.getFullYear() - 1);
  return (Array.isArray(oportunidades) ? oportunidades : [])
    .filter((o) => o?.estagio === 'fechado_100' && (!o.fechado_em || new Date(o.fechado_em) >= limite))
    .reduce((s, o) => s + (Number(o.valor_previsto) || 0), 0);
}
