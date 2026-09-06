// 🧠 O ENCONTRO DA MENTALIDADE — a segunda-feira como um espaço só.
//
// DE ONDE VEIO (dono, 06/09/2026): "toda segunda a gente tem esse encontro:
// a Mentalidade do Executivo, do Diretor e do CEO. Quero um lugar estratégico
// pra essas mentorias, junto com os 8 Hábitos. Quando eu clicar: a
// apresentação da reunião com o tópico. O tópico tem que ter uma IA: eu digito
// as pautas e ela gera o tópico pra gente seguir. O fluxo: 15 minutos de
// leitura, 45 de treinamento (quem dá o treinamento está lá na apresentação),
// 2 horas de reunião estratégica — com cronômetro. E conforme a reunião vai
// acontecendo, as pautas já vão direcionando pra cada um as demandas, gerando
// no painel de cada um, numa visão executiva de produção pra ser concluído
// durante a semana. Um espaço só, não três."
//
// O que mora aqui (puro, testável, sem relógio de dentro):
//   • BLOCOS + o cronômetro: um estado pequeno (acumulado e início de cada
//     bloco) que vai pro banco e vale em qualquer aparelho;
//   • as pautas viram TÓPICO: pela IA (prompt + schema) ou pela régua local
//     (a mesma leitura das ações) quando a IA não está ligada — o encontro
//     nunca fica sem roteiro;
//   • a demanda que nasce do tópico: quem, até quando, com que peso;
//   • a produção da semana: o que saiu da reunião e como está em cada um;
//   • os slides da apresentação.
import { classificarAcao } from './catalogoAcoes.js';
import { mentalidadeDe, ensinamentoDaTarefa, pesoComMentalidade, habitoDe } from './mentalidades.js';
import { HABITOS } from './metodo.js';
import { faseDoMes } from './documentoOficial.js';
import { CARGOS_OFICIAIS } from './documentoOficial.js';
import { prazoDe } from './pronto.js';

// ── ⏱️ os três blocos (Documento Oficial p. 33: Bloco 1 formação, Bloco 2 organização; dono: 15 + 45 + 120) ──
export const BLOCOS = [
  { id: 'leitura', n: 1, nome: 'Leitura', minutos: 15, descricao: 'um trecho, uma pergunta, uma aplicação', cor: 'var(--topcollege-azul)' },
  { id: 'treinamento', n: 2, nome: 'Treinamento', minutos: 45, descricao: 'quem treina apresenta; o time pratica', cor: 'var(--topcollege-magenta)' },
  { id: 'reuniao', n: 3, nome: 'Reunião estratégica', minutos: 120, descricao: 'números, gargalo, decisões e as demandas de cada um', cor: '#22c55e' },
];
export const MINUTOS_TOTAL = BLOCOS.reduce((s, b) => s + b.minutos, 0); // 180
export const blocoDe = (id) => BLOCOS.find((b) => b.id === id) || null;

const seg = (iso) => { const t = new Date(iso).getTime(); return Number.isNaN(t) ? 0 : t / 1000; };

/** O cronômetro zerado. */
export const cronometroInicial = () => ({ atual: null, terminado: false, blocos: Object.fromEntries(BLOCOS.map((b) => [b.id, { acumulado: 0, inicio: null }])) });

const normalizar = (c) => {
  const base = cronometroInicial();
  if (!c || typeof c !== 'object') return base;
  for (const b of BLOCOS) {
    const x = c.blocos?.[b.id] || {};
    base.blocos[b.id] = { acumulado: Math.max(0, Number(x.acumulado) || 0), inicio: x.inicio || null };
  }
  base.atual = blocoDe(c.atual) ? c.atual : null;
  base.terminado = !!c.terminado;
  return base;
};

/** Começa (ou retoma) um bloco agora; o que estava rodando pausa e guarda o acumulado. */
export function iniciarBloco(cron, blocoId, agoraISO) {
  const c = pausar(cron, agoraISO);
  if (!blocoDe(blocoId)) return c;
  c.blocos[blocoId].inicio = agoraISO;
  c.atual = blocoId;
  c.terminado = false;
  return c;
}

/** Pausa o que estiver rodando (o acumulado absorve o trecho). */
export function pausar(cron, agoraISO) {
  const c = normalizar(cron);
  if (c.atual && c.blocos[c.atual].inicio) {
    c.blocos[c.atual].acumulado += Math.max(0, seg(agoraISO) - seg(c.blocos[c.atual].inicio));
    c.blocos[c.atual].inicio = null;
  }
  return c;
}

/** Fecha o bloco atual e abre o próximo; no último, termina o encontro. */
export function avancar(cron, agoraISO) {
  const c = pausar(cron, agoraISO);
  const i = BLOCOS.findIndex((b) => b.id === c.atual);
  const proximo = BLOCOS[i + 1];
  if (!c.atual) return iniciarBloco(c, BLOCOS[0].id, agoraISO);
  if (!proximo) { c.atual = null; c.terminado = true; return c; }
  return iniciarBloco(c, proximo.id, agoraISO);
}

/** O estado pra tela: por bloco, decorrido/restante/estourou; e o todo. */
export function estadoDoCronometro(cron, agoraISO) {
  const c = normalizar(cron);
  const blocos = BLOCOS.map((b) => {
    const x = c.blocos[b.id];
    const rodando = c.atual === b.id && !!x.inicio;
    const decorrido = Math.round(x.acumulado + (rodando ? Math.max(0, seg(agoraISO) - seg(x.inicio)) : 0));
    const restante = b.minutos * 60 - decorrido;
    return { ...b, rodando, decorrido, restante: Math.max(0, restante), estourou: restante < 0, estouro: Math.max(0, -restante), pct: Math.min(1, decorrido / (b.minutos * 60)), feito: decorrido > 0 && c.atual !== b.id && (c.terminado || BLOCOS.findIndex((q) => q.id === c.atual) > BLOCOS.findIndex((q) => q.id === b.id)) };
  });
  const atual = blocos.find((b) => b.id === c.atual) || null;
  const totalDecorrido = blocos.reduce((s, b) => s + b.decorrido, 0);
  return {
    atual, blocos, rodando: !!atual?.rodando, terminado: c.terminado, comecou: totalDecorrido > 0 || !!c.atual,
    totalDecorrido, totalRestante: Math.max(0, MINUTOS_TOTAL * 60 - totalDecorrido),
    proximo: atual ? BLOCOS[BLOCOS.findIndex((b) => b.id === atual.id) + 1] || null : BLOCOS[0],
  };
}

/** "1:23:05" / "14:59" */
export function fmtTempo(segundos) {
  const s = Math.max(0, Math.round(segundos));
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

// ── 📝 as pautas → o tópico ──
/** O texto cru vira uma lista: uma pauta por linha, sem marcador. */
export function pautasDoTexto(texto) {
  return String(texto || '').split(/\r?\n|;/)
    .map((l) => l.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

export const SCHEMA_ROTEIRO = {
  type: 'object',
  properties: {
    tema: { type: 'string' },
    abertura: { type: 'string' },
    leitura: { type: 'object', properties: { titulo: { type: 'string' }, trecho: { type: 'string' }, perguntas: { type: 'array', items: { type: 'string' } }, aplicacao: { type: 'string' } } },
    treinamento: { type: 'object', properties: { tema: { type: 'string' }, objetivo: { type: 'string' }, passos: { type: 'array', items: { type: 'string' } }, pratica: { type: 'string' } } },
    reuniao: {
      type: 'object',
      properties: {
        topicos: { type: 'array', items: { type: 'object', properties: {
          titulo: { type: 'string' }, objetivo: { type: 'string' }, decisao: { type: 'string' }, minutos: { type: 'number' },
          mentalidade: { type: 'string', enum: ['executivo', 'diretor', 'ceo'] }, habito: { type: 'number' },
          responsavel_funcao: { type: 'string' }, demanda: { type: 'string' },
        } } },
      },
    },
    fechamento: { type: 'string' },
  },
  required: ['tema', 'leitura', 'treinamento', 'reuniao', 'fechamento'],
};

/** O prompt pra IA: as pautas, o mês, quem está na sala e a régua da casa. */
export function promptDoRoteiro({ pautas = [], mes, tema, time = [], conduzidoPor, treinamentoPor } = {}) {
  const fase = faseDoMes(mes);
  const funcoes = CARGOS_OFICIAIS.map((c) => `${c.id} = ${c.sigla} (${c.cargoPt}: ${c.dono})`).join('; ');
  const sala = time.map((p) => `${p.nome} (${p.funcaoCurta || p.funcao || 'sem função'})`).join(', ');
  return [
    'Você é o roteirista do ENCONTRO DA MENTALIDADE de segunda-feira da Leilão NoZap (Top College + X-EOS). É UM encontro só, com três mentalidades na sala: Executivo (Hábitos 1–5, faz com a própria mão), Diretor (Hábitos 5–8, multiplica e mede) e CEO (Hábitos 5–8, constrói o sistema).',
    'Os 8 Hábitos do Sucesso: ' + HABITOS.map((h) => `${h.n} ${h.completo} — ${h.sub}`).join('; ') + '.',
    `Estrutura fixa do encontro: 15 minutos de LEITURA (um trecho curto + perguntas + aplicação), 45 minutos de TREINAMENTO (${treinamentoPor ? `quem treina: ${treinamentoPor}` : 'quem treina apresenta'}; passos práticos + prática guiada), 120 minutos de REUNIÃO ESTRATÉGICA (números, gargalo, decisões, demandas).`,
    mes ? `Mês: ${mes}${fase ? ` — fase oficial do ciclo: ${fase.fase} (${fase.foco})` : ''}.` : '',
    tema ? `Tema do mês: ${tema}.` : '',
    conduzidoPor ? `Conduz: ${conduzidoPor}.` : '',
    sala ? `Na sala: ${sala}.` : '',
    `Funções oficiais (use o id em responsavel_funcao): ${funcoes}.`,
    'PAUTAS ditadas pelo dono (uma por linha):',
    ...pautas.map((p, i) => `${i + 1}. ${p}`),
    'Gere o TÓPICO do encontro. Regras: português do Brasil, direto, sem enrolação; a LEITURA liga o tema do mês a um Hábito; o TREINAMENTO é prático (3 a 5 passos e uma prática de 10 minutos); a REUNIÃO tem um tópico por pauta (mantenha a ordem), cada um com objetivo, decisão esperada, minutos (a soma dos minutos = 120), a mentalidade que ele mais exige, o Hábito (1–8), a função responsável (id) e a DEMANDA que sai dele (uma frase no imperativo, começando com verbo, que vira tarefa da pessoa até sexta). O fechamento é uma frase que o time repete.',
  ].filter(Boolean).join('\n');
}

const KEYWORDS_FUNCAO = [
  ['logistica', /log[ií]stic|estoque|expedi|entrega|distribuidora|transportadora|galp/],
  ['cmo', /marketing|tr[aá]fego|an[uú]ncio|ranking|audi[eê]ncia|live|conte[uú]do|instagram|whatsapp/],
  ['cro', /vendedor|licenciad|influenciador|comercial|receita|venda|fechament|script/],
  ['cco', /investidor|capta[cç][aã]o|capital|aporte|cons[oó]rcio|carteira/],
  ['cbdo', /parceri|fornecedor|ind[uú]stria|fabricante|distribuidor|consigna/],
  ['cao', /contrato|pagamento|recebiment|contabil|documento|nota fiscal|administrativ/],
  ['cfo', /caixa|financeir|or[cç]amento|custo|comiss/],
  ['cto', /\bapp\b|aplicativo|sistema|tecnolog|integra[cç]|automa[cç]|\bbug\b|\bia\b/],
  ['coo', /opera[cç][aã]o|processo|ponto de retirada|loja f[ií]sica|expans/],
  ['rh', /contrata|recrut|onboarding|pessoas|equipe nova|treinamento/],
];
/** A função que o texto da pauta pede (régua local). */
export function funcaoDaPauta(texto) {
  const t = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const achou = KEYWORDS_FUNCAO.find(([, re]) => re.test(t));
  return achou ? achou[0] : null;
}

/** Os minutos da reunião repartidos entre os tópicos (mínimo 10, soma 120). */
export function repartirMinutos(n, total = 120, minimo = 10) {
  if (n <= 0) return [];
  const base = Math.max(minimo, Math.floor(total / n));
  const lista = Array.from({ length: n }, () => base);
  let sobra = total - base * n;
  for (let i = 0; sobra > 0 && i < n; i++) { lista[i] += 1; sobra -= 1; }
  return lista;
}

/** O tópico pela régua local — quando a IA não está ligada, o encontro não fica sem roteiro. */
export function roteiroLocal({ pautas = [], mes, tema, habitosDoMes = [] } = {}) {
  const fase = faseDoMes(mes);
  const h = habitoDe(habitosDoMes[0] || 7) || HABITOS[6];
  const hObj = HABITOS.find((x) => x.n === h.n) || HABITOS[6];
  const minutos = repartirMinutos(pautas.length || 1);
  const topicos = (pautas.length ? pautas : ['Os números da semana e o gargalo']).map((p, i) => {
    const lida = classificarAcao(p);
    return {
      titulo: p,
      objetivo: `Deixar claro o que travou, o que fica decidido e quem leva "${p}" até sexta.`,
      decisao: 'Uma decisão escrita: quem faz, até quando, com que número.',
      minutos: minutos[i],
      mentalidade: lida.mentalidade,
      habito: lida.habito || hObj.n,
      responsavel_funcao: funcaoDaPauta(p),
      demanda: /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]?[a-záéíóúâêôãõç]+(ar|er|ir)\b/.test(p.trim()) ? p.trim() : `Resolver: ${p.trim()}`,
    };
  });
  return {
    tema: tema || (fase ? `${fase.fase} · ${hObj.completo}` : hObj.completo),
    abertura: `Bem-vindos ao Encontro da Mentalidade. ${fase ? `Estamos na fase "${fase.fase}" do ciclo. ` : ''}Hoje: 15 minutos de leitura, 45 de treinamento e 2 horas de reunião estratégica.`,
    leitura: { titulo: `Hábito ${hObj.n} — ${hObj.completo}`, trecho: hObj.texto, perguntas: ['Onde esse hábito falhou na minha semana?', 'O que eu faço diferente amanhã de manhã?'], aplicacao: `Cada um escreve uma ação de ${hObj.curto.toLowerCase()} pra esta semana.` },
    treinamento: { tema: `${hObj.completo} na prática`, objetivo: `Sair com o Hábito ${hObj.n} aplicado ao trabalho de cada função.`, passos: ['Quem treina mostra como faz (5 min)', 'Um exemplo real da semana (10 min)', 'Prática em dupla (20 min)', 'Cada um apresenta o que vai fazer (10 min)'], pratica: 'Em dupla: aplicar o hábito a uma pauta de hoje.' },
    reuniao: { topicos },
    fechamento: 'Combinado é combinado: cada demanda tem dono e prazo até sexta.',
  };
}

/** O que a IA devolveu, garantido no formato — o que faltar vem da régua local. */
export function normalizarRoteiro(obj, contexto = {}) {
  const local = roteiroLocal(contexto);
  if (!obj || typeof obj !== 'object') return { ...local, origem: 'local' };
  const topicosIA = Array.isArray(obj.reuniao?.topicos) ? obj.reuniao.topicos : [];
  const topicos = (topicosIA.length ? topicosIA : local.reuniao.topicos).map((t, i) => {
    const base = local.reuniao.topicos[i] || local.reuniao.topicos[0] || {};
    const titulo = String(t.titulo || base.titulo || `Tópico ${i + 1}`);
    const lida = classificarAcao(t.demanda || titulo);
    return {
      titulo,
      objetivo: String(t.objetivo || base.objetivo || ''),
      decisao: String(t.decisao || base.decisao || ''),
      minutos: Math.max(5, Math.round(Number(t.minutos) || base.minutos || 10)),
      mentalidade: mentalidadeDe(t.mentalidade)?.id || lida.mentalidade,
      habito: Number(t.habito) >= 1 && Number(t.habito) <= 8 ? Number(t.habito) : (lida.habito || base.habito || null),
      responsavel_funcao: t.responsavel_funcao || base.responsavel_funcao || funcaoDaPauta(titulo),
      demanda: String(t.demanda || base.demanda || titulo),
    };
  });
  // a soma dos minutos fecha em 120: o que sobrar (ou faltar) vai pro último
  const soma = topicos.reduce((s, t) => s + t.minutos, 0);
  if (topicos.length && soma !== 120) topicos[topicos.length - 1].minutos = Math.max(5, topicos[topicos.length - 1].minutos + (120 - soma));
  return {
    tema: String(obj.tema || local.tema),
    abertura: String(obj.abertura || local.abertura),
    leitura: { ...local.leitura, ...(obj.leitura || {}), perguntas: Array.isArray(obj.leitura?.perguntas) && obj.leitura.perguntas.length ? obj.leitura.perguntas : local.leitura.perguntas },
    treinamento: { ...local.treinamento, ...(obj.treinamento || {}), passos: Array.isArray(obj.treinamento?.passos) && obj.treinamento.passos.length ? obj.treinamento.passos : local.treinamento.passos },
    reuniao: { topicos },
    fechamento: String(obj.fechamento || local.fechamento),
    origem: 'ia',
  };
}

// ── 📥 a demanda que sai do tópico ──
/** Quem do time leva o tópico: pela função sugerida; senão ninguém (o dono escolhe). */
export function sugerirResponsavel(topico, time = []) {
  const f = topico?.responsavel_funcao;
  if (!f) return null;
  return time.find((p) => p.funcaoId === f) || null;
}

/** A sexta desta semana (ou hoje, se já for sexta/sábado/domingo → a próxima sexta). */
export function sextaDaSemana(hojeISO) {
  const d = new Date(`${String(hojeISO).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const faltam = (5 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + faltam);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A linha de xperf_demandas que nasce de um tópico (ou de uma frase solta). */
export function demandaDoTopico(topico, { pessoaId, pessoaNome, criadoPorId, criadoPorNome, encontroId = null, origem = 'encontro', prazoDia, prazoHora = '18:00', detalheExtra = null } = {}) {
  const titulo = String(topico?.demanda || topico?.titulo || '').trim();
  if (!titulo || !pessoaId) return null;
  const mentalidade = mentalidadeDe(topico?.mentalidade)?.id || classificarAcao(titulo).mentalidade;
  const habito = topico?.habito || classificarAcao(titulo).habito || null;
  const detalhe = ensinamentoDaTarefa({ mentalidade, habito, detalhe: [topico?.objetivo, topico?.decisao, detalheExtra].filter(Boolean).join(' ') || `Demanda do encontro: ${topico?.titulo || titulo}.` });
  return {
    titulo, detalhe, pessoa_id: pessoaId, pessoa_nome: pessoaNome || null,
    origem, criado_por_id: criadoPorId || null, criado_por_nome: criadoPorNome || null, encontro_id: encontroId,
    prazo_em: prazoDia ? prazoDe(prazoDia, prazoHora) : null,
    mentalidade, habito, peso: pesoComMentalidade(titulo, mentalidade).peso, categoria: 'mentoria', status: 'recebida',
  };
}

/** A demanda agendada pela pessoa vira a tarefa do dia dela (metodo_tarefas). */
export function tarefaDaDemanda(demanda, { dia, hora = null, ordem = 0 } = {}) {
  if (!demanda?.pessoa_id || !dia) return null;
  return {
    user_id: demanda.pessoa_id, data: dia, hora: hora || null, titulo: demanda.titulo, feito: false, ordem,
    categoria: demanda.categoria || 'mentoria', peso: demanda.peso || 3,
    origem: 'xperf', criado_por_id: demanda.criado_por_id || null,
    mentalidade: demanda.mentalidade || null, habito: demanda.habito || null, detalhe: demanda.detalhe || null,
    prazo_em: demanda.prazo_em || prazoDe(dia, '18:00'),
    encontro_id: demanda.encontro_id || null, demanda_id: demanda.id || null,
  };
}

/** …e/ou o card do quadro dela (metodo_quadro). */
export function cardDaDemanda(demanda, { tarefaId = null, responsavelNome = null } = {}) {
  if (!demanda?.pessoa_id) return null;
  return {
    user_id: demanda.pessoa_id, titulo: demanda.titulo, detalhe: demanda.detalhe || null, coluna: 'aberto',
    habito: demanda.habito || null, prazo: demanda.prazo_em ? String(demanda.prazo_em).slice(0, 10) : null,
    responsavel_nome: responsavelNome || demanda.criado_por_nome || null,
    virou_tarefa_id: tarefaId, virou_tarefa_em: tarefaId ? new Date().toISOString() : null,
    ordem: 0, checklist: [], encontro_id: demanda.encontro_id || null, demanda_id: demanda.id || null,
  };
}

// ── 📊 a produção da semana ──
/** O estado de UMA demanda, lido da tarefa/card que ela virou. */
export function estadoDaDemanda(demanda, { tarefas = [], cards = [], hojeISO } = {}) {
  if (demanda.status === 'devolvida') return { id: 'devolvida', rotulo: 'devolvida', cor: 'text-red-300' };
  const t = demanda.tarefa_id ? tarefas.find((x) => x.id === demanda.tarefa_id) : null;
  const c = demanda.card_id ? cards.find((x) => x.id === demanda.card_id) : null;
  if (t?.conferido) return { id: 'conferida', rotulo: 'conferida ✔✔', cor: 'text-nz-verde' };
  if (t?.feito || c?.coluna === 'concluido') return { id: 'pronta', rotulo: 'pronto — a conferir', cor: 'text-amber-300' };
  const atrasada = demanda.prazo_em && hojeISO && String(demanda.prazo_em).slice(0, 10) < String(hojeISO).slice(0, 10);
  if (demanda.status === 'agendada' || t || c) return atrasada ? { id: 'atrasada', rotulo: 'atrasada', cor: 'text-red-300' } : { id: 'agendada', rotulo: `agendada${demanda.agendada_para ? ` · ${String(demanda.agendada_para).slice(8, 10)}/${String(demanda.agendada_para).slice(5, 7)}` : ''}${demanda.hora ? ` ${demanda.hora}` : ''}`, cor: 'text-white/70' };
  return atrasada ? { id: 'atrasada', rotulo: 'sem agendar · atrasada', cor: 'text-red-300' } : { id: 'recebida', rotulo: 'recebida — sem agendar', cor: 'text-white/45' };
}

/** Por pessoa: quantas, agendadas, prontas, conferidas, atrasadas, %. */
export function producaoDaSemana({ demandas = [], tarefas = [], cards = [], hojeISO } = {}) {
  const porPessoa = new Map();
  for (const d of demandas) {
    const e = estadoDaDemanda(d, { tarefas, cards, hojeISO });
    const p = porPessoa.get(d.pessoa_id) || { pessoaId: d.pessoa_id, nome: d.pessoa_nome || d.pessoa_id, total: 0, recebidas: 0, agendadas: 0, prontas: 0, conferidas: 0, atrasadas: 0, devolvidas: 0, itens: [] };
    p.total += 1;
    if (e.id === 'recebida') p.recebidas += 1;
    if (e.id === 'agendada') p.agendadas += 1;
    if (e.id === 'pronta') p.prontas += 1;
    if (e.id === 'conferida') p.conferidas += 1;
    if (e.id === 'atrasada') p.atrasadas += 1;
    if (e.id === 'devolvida') p.devolvidas += 1;
    p.itens.push({ ...d, estado: e });
    porPessoa.set(d.pessoa_id, p);
  }
  const pessoas = [...porPessoa.values()].map((p) => ({ ...p, concluidas: p.prontas + p.conferidas, pct: p.total ? Math.round(((p.prontas + p.conferidas) / p.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
  const total = demandas.length;
  const concluidas = pessoas.reduce((s, p) => s + p.concluidas, 0);
  return { pessoas, total, concluidas, pct: total ? Math.round((concluidas / total) * 100) : 0, atrasadas: pessoas.reduce((s, p) => s + p.atrasadas, 0), semAgendar: pessoas.reduce((s, p) => s + p.recebidas, 0) };
}

// ── 🎞️ os slides da apresentação ──
export function slidesDoEncontro({ data, roteiro, mes, conduzidoPor, treinamentoPor, demandas = [] } = {}) {
  const r = roteiro || roteiroLocal({ mes });
  const fase = faseDoMes(mes);
  const slides = [
    { id: 'capa', bloco: null, titulo: 'Encontro da Mentalidade', sub: `${data || ''}${fase ? ` · ${fase.fase}` : ''}`, corpo: [r.tema, conduzidoPor ? `conduz: ${conduzidoPor}` : null].filter(Boolean), rodape: 'Executivo · Diretor · CEO — um espaço só' },
    { id: 'abertura', bloco: null, titulo: 'Abertura', sub: '15 leitura · 45 treinamento · 120 reunião', corpo: [r.abertura], rodape: null },
    { id: 'leitura', bloco: 'leitura', titulo: r.leitura?.titulo || 'Leitura', sub: '15 minutos', corpo: [r.leitura?.trecho, ...(r.leitura?.perguntas || []).map((p) => `• ${p}`), r.leitura?.aplicacao ? `→ ${r.leitura.aplicacao}` : null].filter(Boolean), rodape: 'um trecho, uma pergunta, uma aplicação' },
    { id: 'treinamento', bloco: 'treinamento', titulo: r.treinamento?.tema || 'Treinamento', sub: `45 minutos${treinamentoPor ? ` · quem treina: ${treinamentoPor}` : ''}`, corpo: [r.treinamento?.objetivo, ...(r.treinamento?.passos || []).map((p, i) => `${i + 1}. ${p}`), r.treinamento?.pratica ? `Prática: ${r.treinamento.pratica}` : null].filter(Boolean), rodape: null },
    ...(r.reuniao?.topicos || []).map((t, i) => ({ id: `topico-${i}`, bloco: 'reuniao', titulo: `${i + 1}. ${t.titulo}`, sub: `${t.minutos} min · ${mentalidadeDe(t.mentalidade)?.nome || ''}${t.habito ? ` · H${t.habito}` : ''}`, corpo: [t.objetivo, t.decisao ? `Decisão: ${t.decisao}` : null, t.demanda ? `Demanda: ${t.demanda}` : null].filter(Boolean), rodape: t.responsavel_funcao ? `função responsável: ${t.responsavel_funcao.toUpperCase()}` : null })),
    { id: 'fechamento', bloco: null, titulo: 'Fechamento', sub: `${demandas.length} demanda${demandas.length === 1 ? '' : 's'} direcionada${demandas.length === 1 ? '' : 's'}`, corpo: [r.fechamento, ...demandas.slice(0, 8).map((d) => `• ${d.pessoa_nome || d.pessoa_id}: ${d.titulo}`)].filter(Boolean), rodape: 'até sexta' },
  ];
  return slides;
}
