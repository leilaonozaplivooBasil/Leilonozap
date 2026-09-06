// 🗂️ O NOSSO QUADRO — a mesa de trabalho dentro do Compromisso (Hábito 2).
//
// DE ONDE VEIO (dono, 06/09/2026, com prints do quadro dele no MeisterTask):
// "recolher, botar foto pra pessoa dar sentido de pertencimento, editar os
// cards ali, e tudo sincronizado com a agenda diária — botando dali e levando
// pro Compromisso, do Compromisso pra ali, fazendo lista de tarefas. Quero
// melhor que o MeisterTask, mas mais simplificado, mais eficiente." E: "o que
// você decidir está decidido."
//
// ── O QUE O QUADRO DELE ENSINOU, E AS DECISÕES QUE SAÍRAM DISSO ─────────────
//
// 1. O TEMPO NÃO É COLUNA — É O COMPROMISSO. Ele tinha SEGUNDA/TERÇA/QUARTA
//    com vagas numeradas à mão ("1 -", "2 -"… "11 -"). O dia já existe: é o
//    Hábito 2. Card vai pro dia pelo "pro meu dia". Isso apaga metade do quadro
//    dele sem perder nada — e apaga os horizontes da DIR-75 pelo mesmo motivo.
//
// 2. COLUNAS SÃO LISTAS QUE A PESSOA NOMEIA. Academia · Trabalho · Pessoal —
//    contextos, que é como ele já usa. E RECOLHEM (o print 5 dele).
//
// 3. FEITO É AUTOMÁTICO. Ele criou colunas "CONCLUÍDAS" na mão ao lado de cada
//    contexto porque a ferramenta deixa o feito acumular. Aqui: marcou o card ou
//    fechou o último item do checklist → Feito sozinho, com carimbo. Depois de
//    7 dias sai da mesa. Ninguém move feito pra lugar nenhum.
//
// 4. O CARD QUE TRABALHA É O DE CHECKLIST. "TAREFA DO DIA — 1ª… 5ª — 2/5" é o
//    card que ele mais usa. Checklist é de primeira classe, na cara do card.
//
// 5. ATRASADO COM SAÍDA. Card vencido SOBE pro topo da lista dele — e a tela
//    oferece "pro meu dia". Pintar de laranja e parar não ajuda ninguém.
//
// 6. VIRA TAREFA UMA VEZ, E VOLTA. O cartão guarda que já virou tarefa (dois
//    toques não enchem o dia de repetido — tarefa repetida dilui o X-Pay de
//    todas). E a tarefa feita no Compromisso DEVOLVE: o card vai pro Feito.

export const ESTADO_ABERTO = 'aberto';
export const ESTADO_FEITO = 'feito';
/** Os horizontes da DIR-75 e o 'aberto' novo: tudo isso é "ainda na mesa". */
const ABERTOS = new Set(['aberto', 'hoje', 'semana', 'depois']);

/** Depois disto o feito sai da mesa (fica no histórico). Régua do dono. */
export const DIAS_NA_MESA_DEPOIS_DE_FEITO = 7;

/**
 * Os tons das listas. Os nomes são a chave da paleta da tela (DIR-76.1) — que
 * saiu das seções do quadro do dono no MeisterTask: barra sólida e saturada,
 * uma cor por contexto. Nome de cor mora aqui, valor de cor mora na tela.
 */
export const CORES_LISTA = ['grafite', 'ambar', 'roxo', 'rosa', 'teal', 'verde'];

/**
 * O MODELO PRONTO do primeiro uso. Três contextos que o quadro do dono já
 * tinha, mais um card de exemplo com checklist — porque quadro vazio não
 * ensina ninguém a usar quadro.
 */
export const LISTAS_MODELO = [
  { nome: 'Trabalho', cor: 'grafite' },
  { nome: 'Academia', cor: 'teal' },
  { nome: 'Pessoal', cor: 'roxo' },
];
export const CARD_EXEMPLO = {
  titulo: 'Organizar a semana',
  checklist: [
    { texto: 'Pegar as pautas da reunião de amanhã', feito: false },
    { texto: 'Conferir os contratos pendentes', feito: false },
    { texto: 'Marcar as 3 reuniões do dia', feito: false },
  ],
};

/**
 * Os ícones que a pessoa pode escolher pra lista — é o painel "Ícone de seção"
 * do MeisterTask (ordem do dono: "precisa selecionar emoji, tem que dar tudo
 * isso pra ele"). Guarda-se o NOME, nunca o desenho: o desenho vem do pacote de
 * ícones e muda de versão; o nome é nosso e sobrevive.
 */
export const ICONES_LISTA = [
  'lista', 'trabalho', 'academia', 'casa', 'alvo', 'relogio',
  'marketing', 'dinheiro', 'estudo', 'ideia', 'alerta', 'foguete',
];

/**
 * E os EMOJI, porque o dono pediu os dois: "dar a opção de ele selecionar a
 * cor, de ele selecionar o emoji que ele quer colocar".
 *
 * ⚠️ Isto NÃO contradiz a DIR-76.1 ("está muito aparecendo emoji"). São coisas
 * diferentes: lá o emoji era enfeite que EU espalhava pela interface — some em
 * um sistema, muda de desenho no outro, e dá cara de rascunho. Aqui é ESCOLHA
 * DELE pra marcar a lista dele. Emoji que a pessoa escolhe é identidade;
 * emoji que o programa espalha é ruído.
 */
export const EMOJIS_LISTA = [
  '🔥', '💪', '🏋️', '🏃', '⚽', '🧠',
  '💼', '📈', '💰', '🤝', '📞', '📊',
  '🏠', '❤️', '🎯', '⭐', '🚀', '⚡',
  '📚', '✍️', '🎓', '🎨', '🎵', '☕',
];

/** O que pode ir no campo `icone`: um nome da casa OU um emoji escolhido. */
export function marcaValida(marca) {
  const m = String(marca || '');
  if (!m) return false;
  return ICONES_LISTA.includes(m) || EMOJIS_LISTA.includes(m);
}

/** É emoji (desenha como texto) ou nome (desenha como ícone)? */
export const ehEmoji = (marca) => EMOJIS_LISTA.includes(String(marca || ''));

/**
 * Arrastar a lista de um lado pro outro. Devolve a lista TODA com `ordem`
 * recalculada — e não só as duas que trocaram: ordem que só muda em quem se
 * mexeu deixa buracos e empates, e aí a próxima leitura vem embaralhada.
 * Devolve a MESMA lista quando o movimento não existe.
 */
export function reordenarListas(listas, id, paraIndice) {
  const arr = Array.isArray(listas) ? listas : [];
  const de = arr.findIndex((l) => l.id === id);
  const para = Math.max(0, Math.min(arr.length - 1, Number(paraIndice)));
  if (de < 0 || Number.isNaN(para) || de === para) return arr;
  const copia = [...arr];
  const [movida] = copia.splice(de, 1);
  copia.splice(para, 0, movida);
  return copia.map((l, i) => ({ ...l, ordem: i }));
}

export function estaFeito(cartao) {
  return String(cartao?.coluna || '') === ESTADO_FEITO;
}
export function estaAberto(cartao) {
  return ABERTOS.has(String(cartao?.coluna || ESTADO_ABERTO));
}

/** {feitos, total, pct} do checklist — o "2/5" na cara do card. */
export function progressoChecklist(cartao) {
  const itens = Array.isArray(cartao?.checklist) ? cartao.checklist : [];
  const feitos = itens.filter((i) => i && i.feito).length;
  return { feitos, total: itens.length, pct: itens.length ? Math.round((feitos / itens.length) * 100) : 0 };
}

/** Prazo vencido e ainda aberto. `hojeISO` entra por parâmetro — nunca do relógio. */
export function atrasado(cartao, hojeISO) {
  const hoje = String(hojeISO || '').slice(0, 10);
  if (!hoje || !cartao?.prazo || !estaAberto(cartao)) return false;
  return String(cartao.prazo).slice(0, 10) < hoje;
}

/** Marca feito com carimbo. Não muta. */
export function marcarFeito(cartao, quandoISO) {
  if (!cartao) return cartao;
  return { ...cartao, coluna: ESTADO_FEITO, feito_em: quandoISO || cartao.feito_em || null };
}

/** Reabre: volta pra mesa, apaga o carimbo — carimbo de estado que a peça não ocupa é mentira guardada. */
export function reabrir(cartao) {
  if (!cartao) return cartao;
  return { ...cartao, coluna: ESTADO_ABERTO, feito_em: null };
}

/**
 * 🔒 Alterna um item do checklist. Fechar o ÚLTIMO item leva o card pro Feito
 * sozinho; reabrir um item de card feito traz ele de volta pra mesa. É a
 * regra 3 — o feito automático — e ela mora aqui, não na tela.
 */
export function alternarItem(cartao, indice, quandoISO) {
  const itens = Array.isArray(cartao?.checklist) ? cartao.checklist : [];
  if (!cartao || indice < 0 || indice >= itens.length) return cartao;
  const checklist = itens.map((i, k) => (k === indice ? { ...i, feito: !i.feito } : i));
  const todosFeitos = checklist.length > 0 && checklist.every((i) => i.feito);
  const base = { ...cartao, checklist };
  if (todosFeitos) return marcarFeito(base, quandoISO);
  if (estaFeito(cartao)) return reabrir(base);
  return base;
}

/** Acrescenta um item. Texto vazio não vira item. */
export function adicionarItem(cartao, texto) {
  const t = String(texto || '').trim();
  if (!cartao || !t) return cartao;
  const itens = Array.isArray(cartao.checklist) ? cartao.checklist : [];
  // card feito que ganha item novo volta pra mesa: tem trabalho de novo
  const base = { ...cartao, checklist: [...itens, { texto: t, feito: false }] };
  return estaFeito(cartao) ? reabrir(base) : base;
}

export function removerItem(cartao, indice) {
  const itens = Array.isArray(cartao?.checklist) ? cartao.checklist : [];
  if (!cartao || indice < 0 || indice >= itens.length) return cartao;
  return { ...cartao, checklist: itens.filter((_, k) => k !== indice) };
}

/** Já saiu da mesa? Feito há mais de N dias. */
export function arquivavel(cartao, hojeISO, dias = DIAS_NA_MESA_DEPOIS_DE_FEITO) {
  if (!estaFeito(cartao) || !cartao?.feito_em) return false;
  const feito = new Date(String(cartao.feito_em));
  const hoje = new Date(`${String(hojeISO || '').slice(0, 10)}T12:00:00`);
  if (Number.isNaN(feito.getTime()) || Number.isNaN(hoje.getTime())) return false;
  return (hoje - feito) / 86400000 > dias;
}

/**
 * Os cards de uma lista, na ordem em que a mesa mostra: por prazo, depois pela
 * ordem da pessoa. O ATRASADO sobe pro topo (regra 5) POR SER o prazo mais
 * antigo — a primeira versão tinha uma regra explícita "atrasado primeiro" e a
 * mutação mostrou que tirá-la não mudava nada: vencido é prazo < hoje, e prazo
 * < hoje já vem antes de qualquer prazo >= hoje. Regra que não faz nada saiu.
 * Feitos ficam fora — eles vivem na seção Feito.
 */
export function cartoesDaLista(cartoes = [], listaId) {
  const lista = (Array.isArray(cartoes) ? cartoes : [])
    .filter((c) => estaAberto(c) && String(c.lista_id || '') === String(listaId || ''));
  return [...lista].sort((a, b) => {
    const pa = a.prazo ? String(a.prazo) : '9999';
    const pb = b.prazo ? String(b.prazo) : '9999';
    if (pa !== pb) return pa < pb ? -1 : 1;
    return (Number(a.ordem) || 0) - (Number(b.ordem) || 0);
  });
}

/** Os feitos ainda na mesa (menos de N dias), do mais recente pro mais antigo. */
export function feitosNaMesa(cartoes = [], hojeISO) {
  return (Array.isArray(cartoes) ? cartoes : [])
    .filter((c) => estaFeito(c) && !arquivavel(c, hojeISO))
    .sort((a, b) => String(b.feito_em || '').localeCompare(String(a.feito_em || '')));
}

/** Cards abertos SEM lista (sobraram da DIR-75 ou perderam a lista). Vão pra primeira lista na tela. */
export function semLista(cartoes = []) {
  return (Array.isArray(cartoes) ? cartoes : []).filter((c) => estaAberto(c) && !c.lista_id);
}

/**
 * 🔗 quadro → dia. Devolve a LINHA de metodo_tarefas — a gravação é da tela,
 * pela ENTIDADE. `null` quando o cartão já virou tarefa (regra 6) ou não existe.
 */
export function tarefaDoCartao(cartao, { userId, dataISO, hora = null } = {}) {
  if (!cartao || !userId || !dataISO) return null;
  if (cartao.virou_tarefa_id) return null;
  return {
    user_id: userId,
    data: String(dataISO).slice(0, 10),
    hora: hora || null,
    titulo: String(cartao.titulo || '').trim(),
    detalhe: cartao.detalhe || null,
    feito: false,
  };
}

/**
 * 🔗 dia → quadro. A tarefa que não saiu hoje vira card numa lista, em vez de
 * virar PERDIDO pra sempre. Leva o título e o detalhe; não leva o feito (se
 * estivesse feita não precisaria ser guardada).
 */
export function cartaoDaTarefa(tarefa, { userId, listaId } = {}) {
  if (!tarefa || !userId || !listaId) return null;
  const titulo = String(tarefa.titulo || '').trim();
  if (!titulo) return null;
  return {
    user_id: userId,
    lista_id: listaId,
    titulo,
    detalhe: tarefa.detalhe || null,
    coluna: ESTADO_ABERTO,
    habito: tarefa.habito || null,
    checklist: [],
  };
}

/** A volta: a tarefa que veio de um card foi marcada — o card acompanha. */
export function cartaoDaTarefaFeita(cartoes = [], tarefaId, feito, quandoISO) {
  const alvo = (Array.isArray(cartoes) ? cartoes : []).find((c) => c.virou_tarefa_id && String(c.virou_tarefa_id) === String(tarefaId));
  if (!alvo) return null;
  return feito ? marcarFeito(alvo, quandoISO) : reabrir(alvo);
}

/** O resumo da mesa, pro cabeçalho e pro relatório do Hábito 7. */
export function resumoDoQuadro(cartoes = [], hojeISO) {
  const lista = Array.isArray(cartoes) ? cartoes : [];
  const abertos = lista.filter(estaAberto);
  return {
    total: lista.length,
    abertos: abertos.length,
    feitos: lista.filter(estaFeito).length,
    atrasados: abertos.filter((c) => atrasado(c, hojeISO)).length,
    viraramTarefa: lista.filter((c) => !!c.virou_tarefa_id).length,
  };
}
