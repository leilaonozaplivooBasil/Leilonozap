// esteiraCaptacao — a ESTEIRA DE CAPTAÇÃO (DIR-34, 30/08/2026): aporte de
// parceiro e venda de licença acompanhados do agendamento da reunião ao
// contrato assinado, classificados pela INTENÇÃO do cliente (estágios
// ditados pelo dono, probabilidade fixa por estágio). Fonte única: o kanban,
// o forecast, o ranking do time e a fila de contato leem daqui.
import { isVendaReal } from './dinheiroReal.js';

// Ordem OFICIAL do dono — as exigências de cada estágio estão em `exige`.
export const ESTAGIOS_ESTEIRA = [
  { id: 'reuniao_agendada', label: '📅 Reunião agendada', prob: 10, exige: ['reuniao_em'] },
  { id: 'interesse_futuro', label: '🕐 Interesse pra frente', prob: 20, exige: ['recontato_em'] },
  { id: 'interesse_nova_reuniao', label: '🔄 Interesse — nova reunião', prob: 40, exige: ['reuniao_em'] },
  { id: 'fechado_50', label: '💰 Fechado 50%', prob: 50, exige: ['valor_previsto'] },
  { id: 'fechado_70', label: '📋 Fechado 70% — documentação', prob: 70, exige: ['valor_previsto'] },
  { id: 'fechado_99', label: '✍️ Fechado 99% — assinatura marcada', prob: 99, exige: ['valor_previsto', 'reuniao_em'] },
  { id: 'fechado_100', label: '✅ Fechado 100% — dinheiro na conta', prob: 100, exige: ['valor_previsto'] },
  { id: 'sem_interesse', label: '❌ Sem interesse', prob: 0, exige: ['motivo_perda'] },
];

export const MOTIVOS_PERDA = [
  { id: 'preco', label: 'Valor/condições' },
  { id: 'timing', label: 'Momento errado (sem liquidez agora)' },
  { id: 'confianca', label: 'Falta de confiança/conhecimento' },
  { id: 'concorrencia', label: 'Escolheu outra aplicação' },
  { id: 'sem_retorno', label: 'Parou de responder' },
  { id: 'outro', label: 'Outro' },
];

const POR_ID = Object.fromEntries(ESTAGIOS_ESTEIRA.map((e) => [e.id, e]));
export const estagioDe = (id) => POR_ID[id] || POR_ID.reuniao_agendada;
export const ehPerdida = (o) => o.estagio === 'sem_interesse';
export const ehFechada = (o) => o.estagio === 'fechado_100';
export const ehAtiva = (o) => !ehPerdida(o) && !ehFechada(o);

/** Campos que faltam pra entrar num estágio (validação do movimento). */
export function pendenciasParaEstagio(oportunidade, estagioId) {
  const alvo = POR_ID[estagioId];
  if (!alvo) return ['estágio desconhecido'];
  return alvo.exige.filter((campo) => {
    const v = oportunidade[campo];
    if (campo === 'valor_previsto') return !(Number(v) > 0);
    return !v;
  });
}

/**
 * Resumo da esteira: valores por estágio, pipeline PONDERADO (Σ valor ×
 * probabilidade dos ativos) e fechado real (100%).
 */
export function resumoEsteira(oportunidades = []) {
  const porEstagio = Object.fromEntries(ESTAGIOS_ESTEIRA.map((e) => [e.id, { qtd: 0, valor: 0 }]));
  let ponderado = 0;
  let fechado = 0;
  let ativas = 0;
  for (const o of oportunidades) {
    const est = estagioDe(o.estagio);
    const valor = Number(o.valor_previsto) || 0;
    porEstagio[est.id].qtd += 1;
    porEstagio[est.id].valor += valor;
    if (ehFechada(o)) fechado += valor;
    else if (ehAtiva(o)) { ponderado += valor * (est.prob / 100); ativas += 1; }
  }
  return { porEstagio, pipelinePonderado: ponderado, fechado, ativas };
}

/**
 * % de CONVERSÃO do time, por responsável (pedido do dono):
 *   winRate    = fechadas ÷ (fechadas + perdidas) — padrão de mercado
 *   conversao  = fechadas ÷ total de oportunidades (funil inteiro)
 */
export function conversaoPorResponsavel(oportunidades = []) {
  const por = new Map();
  for (const o of oportunidades) {
    const chave = o.responsavel_id || o.responsavel_nome || 'sem_responsavel';
    if (!por.has(chave)) {
      por.set(chave, { chave, nome: o.responsavel_nome || 'Sem responsável', total: 0, fechadas: 0, perdidas: 0, valorFechado: 0, valorEmEsteira: 0 });
    }
    const r = por.get(chave);
    r.total += 1;
    const valor = Number(o.valor_previsto) || 0;
    if (ehFechada(o)) { r.fechadas += 1; r.valorFechado += valor; }
    else if (ehPerdida(o)) r.perdidas += 1;
    else r.valorEmEsteira += valor;
  }
  return [...por.values()]
    .map((r) => ({
      ...r,
      winRate: (r.fechadas + r.perdidas) > 0 ? (r.fechadas / (r.fechadas + r.perdidas)) * 100 : null,
      conversaoFunil: r.total > 0 ? (r.fechadas / r.total) * 100 : 0,
    }))
    .sort((a, b) => b.valorFechado - a.valorFechado || b.valorEmEsteira - a.valorEmEsteira);
}

const DIA_MS = 24 * 60 * 60 * 1000;
export const DIAS_PARADA_ATENCAO = 7;
export const DIAS_PARADA_CRITICO = 15;

/** Dias que a oportunidade está no estágio atual. */
export const diasNoEstagio = (o, ref = new Date()) => {
  const desde = o.estagio_desde || o.created_date;
  if (!desde) return 0;
  return Math.floor((ref.getTime() - new Date(desde).getTime()) / DIA_MS);
};

/**
 * Alertas da esteira (alimentam a fila "Quem contatar hoje"):
 * reunião hoje/atrasada, recontato vencido, oportunidade parada.
 */
export function alertasEsteira(oportunidades = [], ref = new Date()) {
  const hojeStr = ref.toISOString().slice(0, 10);
  const alertas = [];
  for (const o of oportunidades) {
    if (!ehAtiva(o)) continue;
    if (o.reuniao_em && String(o.reuniao_em).slice(0, 10) <= hojeStr) {
      alertas.push({ tipo: 'reuniao', oportunidade: o, detalhe: `Reunião ${String(o.reuniao_em).slice(0, 10) === hojeStr ? 'HOJE' : 'atrasada'} — ${estagioDe(o.estagio).label}` });
      continue;
    }
    if (o.estagio === 'interesse_futuro' && o.recontato_em && String(o.recontato_em).slice(0, 10) <= hojeStr) {
      alertas.push({ tipo: 'recontato', oportunidade: o, detalhe: 'Data de recontato chegou — retomar a conversa.' });
      continue;
    }
    const dias = diasNoEstagio(o, ref);
    if (dias >= DIAS_PARADA_ATENCAO) {
      alertas.push({ tipo: 'parada', oportunidade: o, dias, critico: dias >= DIAS_PARADA_CRITICO, detalhe: `Parada há ${dias} dias em "${estagioDe(o.estagio).label}".` });
    }
  }
  return alertas;
}

/**
 * A venda REAL (partner_plan/adesão) do cliente da oportunidade — é ELA que
 * prova o 100% e é ela que vira `venda_id` quando a oportunidade fecha
 * (DIR-36: a amarração deixa de ser só inferência por e-mail).
 */
export function vendaRealDoCliente(oportunidade, sales = []) {
  const email = String(oportunidade.cliente_email || '').toLowerCase();
  const uid = oportunidade.cliente_user_id;
  return sales.find((s) =>
    ['partner_plan', 'adesao', 'seller_adhesion'].includes(s.kind)
    && isVendaReal(s)
    && ((uid && s.buyer_id === uid) || (email && String(s.buyer_email || '').toLowerCase() === email))
  ) || null;
}

// 📖 DIR-41 — as objeções OFICIAIS do método (deck "O Sucesso Não Negocia
// com a Mediocridade", Hábito 6): o que trava a negociação, medido de verdade.
export const OBJECOES_METODO = [
  { id: 'nao_tenho_dinheiro', label: 'Não tenho dinheiro' },
  { id: 'preciso_pensar', label: 'Preciso pensar' },
  { id: 'tenho_medo', label: 'Tenho medo' },
  { id: 'nao_conheco', label: 'Não conheço isso' },
  { id: 'outra', label: 'Outra' },
];
export const objecaoLabel = (id) => OBJECOES_METODO.find((o) => o.id === id)?.label || id;

/**
 * DIR-41 — PPV (Próximo Ponto de Venda): "cada etapa precisa conduzir ao
 * próximo ponto". Oportunidade ATIVA sem reunião futura e sem recontato
 * futuro está SEM PPV — negociação morrendo, o kanban avisa em vermelho.
 */
export function semPPV(oportunidade, ref = new Date()) {
  if (!ehAtiva(oportunidade)) return false; // fechada/perdida não precisa de PPV
  const hojeStr = ref.toISOString().slice(0, 10);
  const temReuniaoFutura = oportunidade.reuniao_em && String(oportunidade.reuniao_em).slice(0, 10) >= hojeStr;
  const temRecontatoFuturo = oportunidade.recontato_em && String(oportunidade.recontato_em).slice(0, 10) >= hojeStr;
  return !temReuniaoFutura && !temRecontatoFuturo;
}

/** Placar de objeções em negociações ATIVAS — a dor real do funil, contada. */
export function placarObjecoes(oportunidades = []) {
  const contagem = new Map();
  for (const o of oportunidades) {
    if (!ehAtiva(o) || !o.objecao) continue;
    contagem.set(o.objecao, (contagem.get(o.objecao) || 0) + 1);
  }
  return [...contagem.entries()]
    .map(([id, qtd]) => ({ id, label: objecaoLabel(id), qtd }))
    .sort((a, b) => b.qtd - a.qtd);
}

// 💵 DIR-40 — só estas contas podem receber aporte de capital (regra do dono).
export const BANCOS_APORTE_EXTERNO = [
  { id: 'santander', label: 'Santander' },
  { id: 'itau', label: 'Itaú' },
];

/** O registro de aporte externo é válido? (banco permitido + valor > 0) */
export function aporteExternoValido(oportunidade) {
  const a = oportunidade?.aporte_externo;
  return !!a && BANCOS_APORTE_EXTERNO.some((b) => b.id === a.banco) && Number(a.valor) > 0;
}

/**
 * O 100% se prova sozinho: existe venda REAL do cliente OU aporte externo
 * REGISTRADO com auditoria (DIR-40: transferência direto no Santander/Itaú,
 * carimbada por quem registrou)? Sem nenhum dos dois → "declarado sem
 * dinheiro na conta" (chip âmbar no kanban).
 */
export function dinheiroNaConta(oportunidade, sales = []) {
  return vendaRealDoCliente(oportunidade, sales) !== null || aporteExternoValido(oportunidade);
}

/**
 * DIR-38 — o fechado (100%) separado com honestidade: quanto tem venda REAL
 * casada (na conta) e quanto ainda é só declaração. É esta divisão que a
 * Visão Executiva mostra — declarado NUNCA se soma como dinheiro.
 */
export function fechadoProvado(oportunidades = [], sales = []) {
  let naConta = 0;
  let declarado = 0;
  for (const o of oportunidades) {
    if (!ehFechada(o)) continue;
    const valor = Number(o.valor_previsto) || 0;
    if (dinheiroNaConta(o, sales)) naConta += valor;
    else declarado += valor;
  }
  return { naConta, declarado };
}
