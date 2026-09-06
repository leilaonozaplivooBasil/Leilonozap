// 📚 O CATÁLOGO DE AÇÕES — "o que tem pra fazer", com mentalidade, Hábito e
// peso já reconhecidos.
//
// DE ONDE VEIO (ditado pelo dono em 06/09/2026, na gestão do X-Performance):
// "eu gostaria que o sistema identificasse o peso e qual é a mentalidade
// dessa ação — temos três, executivo, diretor e CEO. Que me desse uma lista
// de opções do que tem pra fazer; ao selecionar, ele já me diz o peso e a
// mentalidade. E cada ação que eu for colocando eu poder adicionar nesse
// menu suspenso."
//
// TRÊS PEÇAS:
//   1. classificarAcao(titulo) — lê o texto e diz a mentalidade e o Hábito.
//      A regra é por palavra: quem fala de time, números, conferir, treinar
//      está multiplicando (diretor); quem fala de diretoria, sistema,
//      processo, estratégia está construindo (CEO); o resto é a própria mão
//      (executivo). O peso vem da régua de sempre (título + mentalidade).
//   2. ACOES_PADRAO — o catálogo inicial, no código, pra lista nunca nascer
//      vazia. O que o dono acrescenta vai pra tabela xperf_acoes.
//   3. catalogoJunto(padrao, doBanco) — uma lista só, sem título repetido, o
//      do banco por cima do padrão (o dono pode "corrigir" uma ação padrão
//      salvando a dele com o mesmo nome).
import { pesoComMentalidade, mentalidadeDe, habitosDaMentalidade } from './mentalidades.js';

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ── 🧠 A LEITURA VIVA (dono, 06/09/2026): "quando eu botei uma palavra ele
// ficou nessa palavra até o final; tem que ir atualizando conforme eu for
// escrevendo — um raciocínio vivo junto comigo". Então a leitura não para na
// primeira regra que bate: TODAS as palavras contam, cada uma vale um ponto
// pra sua mentalidade/Hábito, dizer o nome ("mentalidade do CEO", "hábito 7")
// vale três, e no empate vence o que foi escrito POR ÚLTIMO.

const SINAIS_MENTALIDADE = [
  // o nome dito com todas as letras: o sinal mais forte
  { id: 'ceo', peso: 3, re: /mentalidade d[oe] ceo|\bceo\b|presidente/g, rotulo: 'diz CEO' },
  { id: 'diretor', peso: 3, re: /mentalidade d[oe] diretor|\bdiretor(?!ia)\w*/g, rotulo: 'diz diretor' },
  { id: 'executivo', peso: 3, re: /mentalidade d[oe] executivo|\bexecutiv\w*/g, rotulo: 'diz executivo' },
  // as palavras do dia a dia de cada mentalidade
  { id: 'ceo', peso: 1, re: /diretoria|estrateg\w*|sistema|processo|empresa|expans\w*|investid\w*|socied\w*|orcamento|cultura|governanca|conselho/g, rotulo: 'sistema/diretoria' },
  { id: 'diretor', peso: 1, re: /\btime\b|equipe|1:1|1 a 1|conferir|conferencia|numeros|indicador|win rate|validar|treinar|treinamento|acompanh\w*|pauta\w*|reuniao de segunda|corrigir|duplica\w*|ensinar|mentoria|liderar|delegar|cobrar/g, rotulo: 'time/números' },
];

const SINAIS_HABITO = [
  { n: 8, re: /treinar|treinamento|ensinar|duplica\w*|formar|multiplicar|capacitar|onboarding|mentorar|mentoria/g },
  // "pauta" é planejamento de reunião: pesa dois, senão "reunião" (5) escrita depois roubava a leitura
  { n: 7, peso: 2, re: /pauta\w*|planejamento executivo/g },
  { n: 7, re: /numeros|verific\w*|indicador|win rate|metas?\b|medir|conferir|resultado|placar|relatorio|planejar|planejamento|preparar|agenda|revisar|analis\w*|auditar|decidir|organizacao semanal|visao estrateg\w*|estrategi\w*/g },
  { n: 6, re: /follow|fechamento|fechar|ppv|acompanh\w*|proposta|negocia\w*|cobrar|contrato|entrega|pos[- ]?venda/g },
  { n: 5, re: /apresenta\w*|reuniao|reunioes|demonstra\w*|pitch|visita/g },
  { n: 4, re: /contato|convite|convidar|f\.?o\.?r\.?m|script|mensagem|ligar|whatsapp|conversa/g },
  { n: 3, re: /lista|networking|prospec\w*|indicac\w*|contatos novos|mapear/g },
  { n: 2, re: /rotina|compromisso|treino|gratidao|disciplina|planejamento do dia|organizar|organizacao|ambiente|story|post\b/g },
  { n: 1, re: /sonho|quadro|visao de futuro|proposito/g },
];
// sem palavra que aponte um Hábito, o Hábito TÍPICO da mentalidade: o
// executivo vive no Compromisso (2), o diretor mede (7), o CEO duplica (8)
const HABITO_PADRAO = { executivo: 2, diretor: 7, ceo: 8 };

/** As categorias que a régua reconhece, na ordem em que aparecem no select. */
export const CATEGORIAS_ACAO = [
  ['mentoria', 'Mentoria'], ['producao', 'Produção'], ['visao', 'Visão estratégica'], ['bonus', 'Bônus / estudo'],
];
const SINAIS_CATEGORIA = [
  // dizer "mentoria" com todas as letras pesa mais: é o nome da coisa
  { id: 'mentoria', peso: 3, re: /mentoria|mentor\w*/g },
  { id: 'mentoria', peso: 1, re: /treinamento|treinar/g },
  { id: 'visao', peso: 1, re: /visao estrateg\w*|estrateg\w*|planejamento executivo|diretoria/g },
  { id: 'bonus', peso: 1, re: /leitura|estudo|estudar|curso|livro|capitulo/g },
  { id: 'producao', peso: 1, re: /venda|loja|cliente|contato|apresenta\w*|reuniao|follow|proposta|contrato|entrega/g },
];
/** Os temas que o dono cita na mentoria — viram etiquetas na tarefa. */
export const TEMAS = [
  { id: 'visao', rotulo: 'visão estratégica', re: /visao estrateg\w*|estrateg\w*/g },
  { id: 'metas', rotulo: 'metas', re: /\bmetas?\b|objetivo\w*/g },
  { id: 'organizacao', rotulo: 'organização', re: /organiza\w*/g },
  { id: 'aplicabilidade', rotulo: 'aplicabilidade', re: /aplicabilidade|aplicar|pratica/g },
  { id: 'leitura', rotulo: 'leitura', re: /leitura|estudo|livro/g },
  { id: 'treinamento', rotulo: 'treinamento', re: /treinamento|treinar/g },
  { id: 'reuniao', rotulo: 'reunião', re: /reuniao|reunioes|pauta\w*/g },
  { id: 'constancia', rotulo: 'constância', re: /constan\w*|consisten\w*|disciplina/g },
];

/** Todas as ocorrências de um sinal no texto: quantas, e onde foi a última. */
function ocorrencias(texto, re) {
  const r = new RegExp(re.source, 'g');
  let n = 0; let ultima = -1; let palavra = null; let m;
  while ((m = r.exec(texto)) !== null) { n += 1; ultima = m.index; palavra = m[0]; if (m[0] === '') r.lastIndex += 1; }
  return { n, ultima, palavra };
}

/** Quem venceu: mais pontos; no empate, o sinal escrito por último. */
function vencedor(placar) {
  const lista = Object.values(placar).filter((p) => p.pontos > 0);
  if (!lista.length) return null;
  return lista.sort((a, b) => b.pontos - a.pontos || b.ultima - a.ultima)[0];
}

/**
 * A leitura viva do texto: mentalidade, Hábito, categoria e temas — cada um
 * com os sinais (palavras) que o sustentam, pra tela mostrar o raciocínio.
 */
export function lerTexto(titulo) {
  const t = semAcento(titulo);
  const sinais = [];
  const placarM = {};
  for (const sinal of SINAIS_MENTALIDADE) {
    const o = ocorrencias(t, sinal.re);
    if (!o.n) continue;
    const p = (placarM[sinal.id] ||= { id: sinal.id, pontos: 0, ultima: -1 });
    p.pontos += o.n * sinal.peso; p.ultima = Math.max(p.ultima, o.ultima);
    sinais.push({ tipo: 'mentalidade', id: sinal.id, palavra: o.palavra, rotulo: sinal.rotulo, forte: sinal.peso > 1 });
  }
  const placarH = {};
  const explicito = /habito\s*(\d)|\bh\s?([1-8])\b/.exec(t);
  for (const sinal of SINAIS_HABITO) {
    const o = ocorrencias(t, sinal.re);
    if (!o.n) continue;
    const p = (placarH[sinal.n] ||= { id: sinal.n, pontos: 0, ultima: -1 });
    p.pontos += o.n * (sinal.peso || 1); p.ultima = Math.max(p.ultima, o.ultima);
    sinais.push({ tipo: 'habito', id: sinal.n, palavra: o.palavra });
  }
  const placarC = {};
  for (const sinal of SINAIS_CATEGORIA) {
    const o = ocorrencias(t, sinal.re);
    if (!o.n) continue;
    const p = (placarC[sinal.id] ||= { id: sinal.id, pontos: 0, ultima: -1 });
    p.pontos += o.n * (sinal.peso || 1); p.ultima = Math.max(p.ultima, o.ultima);
    sinais.push({ tipo: 'categoria', id: sinal.id, palavra: o.palavra });
  }
  const temas = TEMAS.filter((tema) => ocorrencias(t, tema.re).n > 0).map((tema) => tema.id);
  return {
    mentalidade: vencedor(placarM)?.id || null,
    habito: explicito ? Number(explicito[1] || explicito[2]) : (vencedor(placarH)?.id ?? null),
    habitoExplicito: !!explicito,
    categoria: vencedor(placarC)?.id || null,
    temas,
    sinais,
  };
}

/** Lê o título e diz mentalidade, Hábito, peso, categoria e temas — com o porquê. */
export function classificarAcao(titulo, mentalidadeFixa = null) {
  const t = semAcento(titulo);
  const leitura = lerTexto(titulo);
  const mentalidade = mentalidadeDe(mentalidadeFixa)?.id || leitura.mentalidade || 'executivo';
  const foco = habitosDaMentalidade(mentalidade);
  const lido = leitura.habito ?? (t.trim() ? HABITO_PADRAO[mentalidade] : null);
  // o Hábito lido tem que estar na trilha da mentalidade; se não estiver, o mais perto dela
  const habito = lido == null ? null : (foco.includes(lido) ? lido : foco.reduce((m, n) => (Math.abs(n - lido) < Math.abs(m - lido) ? n : m), foco[0]));
  const { peso, porque } = pesoComMentalidade(titulo, mentalidade);
  const sinalM = leitura.sinais.filter((x) => x.tipo === 'mentalidade' && x.id === leitura.mentalidade).sort((a, b) => Number(b.forte) - Number(a.forte))[0];
  const sinalH = leitura.sinais.find((x) => x.tipo === 'habito' && x.id === leitura.habito);
  return {
    mentalidade, habito, peso, porque,
    categoria: leitura.categoria || 'mentoria',
    temas: leitura.temas,
    sinais: leitura.sinais,
    porqueMentalidade: mentalidadeFixa
      ? 'escolhida por você'
      : sinalM ? `pelo texto: "${sinalM.palavra}"${sinalM.forte ? '' : ` (${sinalM.rotulo})`}` : 'pelo texto: ação da própria mão',
    porqueHabito: !t.trim() ? '' : leitura.habitoExplicito ? `você escreveu o Hábito ${leitura.habito}` : sinalH ? `pelo texto: "${sinalH.palavra}" (Hábito ${leitura.habito}${habito !== leitura.habito ? `, puxado pra trilha: ${habito}` : ''})` : `o Hábito típico da ${mentalidadeDe(mentalidade)?.nome}`,
  };
}

// ── 🎓 O ROTEIRO DA MENTORIA (dono): "uma mentoria da mentalidade do diretor
// / CEO: são quinze minutos de leitura, quarenta e cinco de treinamento e
// duas horas de reunião — visão estratégica, meta, aplicabilidade". Então
// "mentoria" não é UMA tarefa: são três blocos encadeados no horário.
export const ROTEIRO_MENTORIA = [
  { bloco: 'leitura', minutos: 15, titulo: 'Leitura (15 min)', categoria: 'bonus', habito: { executivo: 2, diretor: 8, ceo: 8 }, tema: 'o texto do dia — a mentalidade que a mentoria vai trabalhar' },
  { bloco: 'treinamento', minutos: 45, titulo: 'Treinamento (45 min)', categoria: 'mentoria', habito: { executivo: 5, diretor: 8, ceo: 8 }, tema: 'o método na prática — duplicação' },
  { bloco: 'reuniao', minutos: 120, titulo: 'Reunião (2h): visão estratégica, metas e aplicabilidade', categoria: 'mentoria', habito: { executivo: 5, diretor: 7, ceo: 7 }, tema: 'visão estratégica, metas e aplicabilidade' },
];

const somaMinutos = (hhmm, min) => {
  const [h, m] = String(hhmm || '09:00').split(':').map(Number);
  const total = (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0) + min;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** Os três blocos da mentoria, encadeados a partir da hora de início. */
export function montarMentoria({ titulo, mentalidade = 'diretor', horaInicio = '09:00' } = {}) {
  let hora = horaInicio || '09:00';
  const base = String(titulo || '').trim();
  return ROTEIRO_MENTORIA.map((b) => {
    const linha = {
      bloco: b.bloco, hora, minutos: b.minutos,
      titulo: base ? `${base} — ${b.titulo}` : `Mentoria — ${b.titulo}`,
      categoria: b.categoria, habito: b.habito[mentalidade] ?? b.habito.diretor, mentalidade, tema: b.tema,
    };
    hora = somaMinutos(hora, b.minutos);
    return linha;
  });
}

/** O catálogo inicial — cada linha já com a classificação da régua. */
const BASE = [
  // ── executivo: a própria mão (Hábitos 1 a 5) ──
  ['Escrever o sonho do ciclo no quadro', 'executivo', 1],
  ['Gerar e cumprir a Rotina Perfeita do dia', 'executivo', 2],
  ['Qualificar 10 pessoas da lista de networking (1 a 5)', 'executivo', 3],
  ['Fazer 20 contatos com F.O.R.M. e o próprio script', 'executivo', 4],
  ['Fazer 3 apresentações de sucesso (45 a 60 min)', 'executivo', 5],
  ['Postar o story da rotina (antes, durante e depois)', 'executivo', 2],
  ['Enviar o convite para a apresentação de amanhã', 'executivo', 4],
  // ── diretor: multiplicar e medir (Hábitos 5 a 8) ──
  ['Pegar as pautas da reunião de segunda', 'diretor', 7],
  ['Reunião 1:1 com cada executivo do time', 'diretor', 6],
  ['Conferir os números da semana (reuniões, win rate, PPV)', 'diretor', 7],
  ['Validar as tarefas do time (conferência dupla)', 'diretor', 7],
  ['Treinar o time no Hábito da semana', 'diretor', 8],
  ['Acompanhar o follow-up dos clientes em PPV do time', 'diretor', 6],
  ['Corrigir o gargalo apontado na reunião de segunda', 'diretor', 7],
  // ── CEO: construir o sistema (Hábitos 5 a 8) ──
  ['Preparar a reunião de diretoria de segunda', 'ceo', 7],
  ['Revisar o planejamento executivo do ciclo', 'ceo', 7],
  ['Decidir com os números: o gargalo da empresa nesta semana', 'ceo', 7],
  ['Formar um diretor novo (plano de 30 dias)', 'ceo', 8],
  ['Desenhar o processo que hoje depende de uma pessoa só', 'ceo', 8],
  ['Apresentar a estratégia do trimestre para a diretoria', 'ceo', 5],
];

export const ACOES_PADRAO = BASE.map(([titulo, mentalidade, habito]) => ({
  id: `padrao:${semAcento(titulo).replace(/[^a-z0-9]+/g, '-')}`,
  titulo, mentalidade, habito,
  peso: pesoComMentalidade(titulo, mentalidade).peso,
  categoria: lerTexto(titulo).categoria || 'mentoria',
  temas: lerTexto(titulo).temas,
  padrao: true,
}));

/** Uma lista só: o banco por cima do padrão (mesmo título = a do banco vale), ordenada por mentalidade e título. */
export function catalogoJunto(padrao = ACOES_PADRAO, doBanco = []) {
  const chave = (a) => semAcento(a.titulo).trim();
  const mapa = new Map();
  for (const a of padrao) mapa.set(chave(a), a);
  for (const a of Array.isArray(doBanco) ? doBanco : []) if (a?.titulo) mapa.set(chave(a), { ...a, padrao: false });
  const ordem = { executivo: 0, diretor: 1, ceo: 2 };
  return [...mapa.values()].sort((a, b) => (ordem[a.mentalidade] ?? 9) - (ordem[b.mentalidade] ?? 9) || a.titulo.localeCompare(b.titulo, 'pt-BR'));
}

/** Ações do catálogo que se parecem com o que está sendo escrito (2+ palavras fortes em comum). */
export function parecidas(catalogo, titulo, maximo = 4) {
  const fortes = (x) => new Set(semAcento(x).split(/[^a-z0-9]+/).filter((w) => w.length >= 4));
  const minhas = fortes(titulo);
  if (minhas.size < 1) return [];
  return (Array.isArray(catalogo) ? catalogo : [])
    .map((a) => ({ a, comum: [...fortes(a.titulo)].filter((w) => minhas.has(w)).length }))
    .filter(({ a, comum }) => comum >= Math.min(2, minhas.size) && semAcento(a.titulo).trim() !== semAcento(titulo).trim())
    .sort((x, y) => y.comum - x.comum)
    .slice(0, maximo)
    .map(({ a }) => a);
}

/** Já existe no catálogo? (por título, sem acento nem caixa) */
export const jaNoCatalogo = (catalogo, titulo) => catalogo.some((a) => semAcento(a.titulo).trim() === semAcento(titulo).trim());

/** A linha pra gravar em xperf_acoes a partir do que está no formulário. */
export function acaoParaGravar({ titulo, mentalidade, habito, peso, categoria, criadoPorId }) {
  return {
    titulo: String(titulo || '').trim(),
    mentalidade: mentalidadeDe(mentalidade)?.id || 'executivo',
    habito: habito ? Number(habito) : null,
    peso: Math.min(6, Math.max(1, Number(peso) || 3)),
    categoria: categoria || 'mentoria',
    criado_por_id: criadoPorId || null,
  };
}
