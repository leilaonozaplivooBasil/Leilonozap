// 📝 O BLOCO DE NOTAS RÁPIDO — o botão "D" do cabeçalho (24/09/2026).
//
// Dono: "Botão na aba da Top College do lado do ícone, deve ter um ícone de
// 'D' (personalize tipo logo da identidade visual) de demanda, nela abre uma
// lista de demandas (em modal) que joga automaticamente para o quadro, lista
// e jornada. Como um atalho de 'bloco de notas rápido'."
//
// 25/09 (dono): "preciso poder escolher para onde enviar essa tarefa de nota
// rápida. Depois, deve ser possível tanto arrastar as notas e editá-las. Esse
// mesmo modal deve ser possível movê-lo, para parecer mesmo um bloco de notas
// suspenso." — o destino é escolha (o padrão continua "Jornada + Quadro"), a
// nota se edita e se reordena (ordem_bloco), e o bloco é uma janelinha solta.
//
// O QUE UMA ANOTAÇÃO VIRA, NO MESMO CLIQUE (conforme o destino):
//   1. sempre uma DEMANDA (xperf_demandas, origem 'bloco') — a caixa de
//      entrada da aba Demandas, que é onde a pessoa reencontra o que anotou;
//   2. se o destino inclui a jornada: uma TAREFA de HOJE, sem horário
//      (metodo_tarefas) — entra flexível na Jornada e na Lista (mesma linha,
//      ver destinos.js), perto do "pronto até 18:00";
//   3. se o destino inclui o quadro: um CARD no quadro (metodo_quadro),
//      ligado à tarefa quando ela existe.
//   Depois a demanda é fechada como 'agendada' apontando pro que nasceu —
//   igual ao "transformar em tarefa" da aba Demandas. "Só anotar" não fecha
//   nada: fica 'recebida' na aba Demandas, esperando a pessoa decidir.
//
// Nada aqui é novo por baixo: `tarefaDaDemanda` e `cardDaDemanda` são as
// mesmas do Encontro, do Painel e da aba Demandas. Este arquivo só decide a
// FORMA de cada peça e é puro — quem grava é BlocoDeDemandas.jsx.
import { tarefaDaDemanda, cardDaDemanda } from './encontro.js';
import { RECEBIDA, PESO_NEUTRO } from './demandas.js';
import { mostraAtalho } from './atalhoTopCollege.js';

/** Como a anotação do bloco se identifica na fila. */
export const ORIGEM_BLOCO = 'bloco';
/** O evento que avisa Jornada, Lista, Quadro e Demandas abertos pra recarregar. */
export const EVENTO_ANOTACAO = 'demandaAnotada';
export const MAX_TITULO = 300;
export const MAX_RECENTES = 8;

/**
 * Quem vê o botão "D": logado (a régua do ícone da Top College) E dentro da
 * Top College. 24/09 (dono, print do WhatsApp): "só pode aparecer nas
 * áreas/telas/páginas da Top College" — a bandeira vem de areaTopCollege.js,
 * levantada pelo próprio Licensing (o mesmo `naTopCollege` da faixa preta).
 */
export function mostraBloco(usuario, naTopCollege = false) {
  return mostraAtalho(usuario) && naTopCollege === true;
}

// ── 🎯 PARA ONDE VAI (25/09) ─────────────────────────────────────────────
export const DESTINOS_DO_BLOCO = Object.freeze([
  Object.freeze({ id: 'tudo', rotulo: 'Jornada + Quadro', jornada: true, quadro: true }),
  Object.freeze({ id: 'jornada', rotulo: 'Só Jornada', jornada: true, quadro: false }),
  Object.freeze({ id: 'quadro', rotulo: 'Só Quadro', jornada: false, quadro: true }),
  Object.freeze({ id: 'anotar', rotulo: 'Só anotar', jornada: false, quadro: false }),
]);
export const DESTINO_PADRAO_DO_BLOCO = 'tudo';
export const CHAVE_DESTINO_DO_BLOCO = 'nz_bloco_destino';

/** Um destino válido, ou o padrão (Jornada + Quadro, como sempre foi). */
export function normalizarDestinoDoBloco(valor) {
  const v = String(valor ?? '').trim().toLowerCase();
  return DESTINOS_DO_BLOCO.some((d) => d.id === v) ? v : DESTINO_PADRAO_DO_BLOCO;
}
export function destinoDoBloco(id) {
  return DESTINOS_DO_BLOCO.find((d) => d.id === normalizarDestinoDoBloco(id));
}
function armazem(storage) {
  if (storage) return storage;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}
/** O último destino escolhido neste aparelho. */
export function lerDestinoDoBloco(storage) {
  try { return normalizarDestinoDoBloco(armazem(storage)?.getItem(CHAVE_DESTINO_DO_BLOCO)); } catch { return DESTINO_PADRAO_DO_BLOCO; }
}
export function gravarDestinoDoBloco(destino, storage) {
  const d = normalizarDestinoDoBloco(destino);
  try { armazem(storage)?.setItem(CHAVE_DESTINO_DO_BLOCO, d); } catch { /* sem storage: segue o padrão */ }
  return d;
}

/**
 * A demanda que a anotação vira. Sem texto ou sem dono devolve null — uma
 * demanda sem dono não aparece em painel nenhum, some em silêncio.
 */
export function demandaDoBloco(texto, { pessoaId, pessoaNome = null } = {}) {
  const titulo = String(texto ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TITULO);
  if (!titulo || !pessoaId) return null;
  const dono = String(pessoaId);
  return {
    titulo, detalhe: null,
    pessoa_id: dono, pessoa_nome: pessoaNome || null,
    origem: ORIGEM_BLOCO,
    criado_por_id: dono, criado_por_nome: pessoaNome || null,
    encontro_id: null, status: RECEBIDA, peso: PESO_NEUTRO,
  };
}

/**
 * As peças a partir da demanda já gravada (com id), conforme o destino: a
 * tarefa de HOJE sem horário (ou null) e o card ligado a ela (ou null).
 * `ordem` = quantas tarefas o dia já tem.
 */
export function pecasDaAnotacao(demanda, { hojeISO, ordem = 0, nome = null, destino = DESTINO_PADRAO_DO_BLOCO } = {}) {
  if (!demanda?.id || !hojeISO) return null;
  const d = destinoDoBloco(destino);
  return {
    destino: d.id,
    tarefa: d.jornada ? tarefaDaDemanda(demanda, { dia: hojeISO, hora: null, ordem }) : null,
    card: (tarefaId) => (d.quadro ? cardDaDemanda(demanda, { tarefaId: tarefaId || null, responsavelNome: nome }) : null),
  };
}

/**
 * O fechamento da demanda: virou trabalho, aponta pra tarefa e/ou pro card.
 * "Só anotar" não fecha nada (devolve null): fica 'recebida' na aba Demandas.
 */
export function fechamentoDaAnotacao({ tarefaId = null, cardId = null, hojeISO, agora = new Date() } = {}) {
  if (!tarefaId && !cardId) return null;
  return {
    status: 'agendada', agendada_para: hojeISO,
    tarefa_id: tarefaId, card_id: cardId,
    updated_at: agora.toISOString(),
  };
}

/** O que a pessoa lê depois de anotar, conforme onde foi parar. */
export function recadoDaAnotacao(titulo, { tarefaId = null, cardId = null } = {}) {
  const t = `"${titulo}"`;
  if (tarefaId && cardId) return `${t} entrou na sua jornada de hoje e no quadro`;
  if (tarefaId) return `${t} entrou na sua jornada de hoje`;
  if (cardId) return `${t} entrou no quadro`;
  return `${t} ficou anotada nas suas Demandas`;
}

// ── 📋 A LISTA DO BLOCO ─────────────────────────────────────────────────
const temOrdem = (d) => d?.ordem_bloco !== null && d?.ordem_bloco !== undefined && Number.isFinite(Number(d.ordem_bloco));

/**
 * As anotações recentes do bloco (só as dele): quem tem ordem escolhida à
 * mão (ordem_bloco) vem primeiro, na ordem; o resto, mais nova primeiro.
 */
export function anotacoesRecentes(linhas = [], limite = MAX_RECENTES) {
  return (Array.isArray(linhas) ? linhas : [])
    .filter((d) => d?.origem === ORIGEM_BLOCO)
    .sort((a, b) => {
      if (temOrdem(a) && temOrdem(b)) return Number(a.ordem_bloco) - Number(b.ordem_bloco);
      if (temOrdem(a)) return -1;
      if (temOrdem(b)) return 1;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    })
    .slice(0, limite);
}

/** Move a nota da posição `de` pra `para` (arrastar). Fora do alcance, devolve a lista igual. */
export function moverNota(lista = [], de, para) {
  const l = Array.isArray(lista) ? [...lista] : [];
  if (de === para || de < 0 || para < 0 || de >= l.length || para >= l.length) return l;
  const [item] = l.splice(de, 1);
  l.splice(para, 0, item);
  return l;
}

/** O que gravar depois de mover: cada nota da lista com a posição dela. */
export function ordensParaGravar(lista = []) {
  return (Array.isArray(lista) ? lista : []).map((d, i) => ({ id: d.id, ordem_bloco: i }));
}

/** O título editado, limpo — ou null se ficou vazio (aí não grava). */
export function tituloEditado(texto) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TITULO);
  return t || null;
}

/** O que a linha da lista diz sobre onde a anotação foi parar. */
export function ondeFoiParar(d) {
  if (!d) return '';
  if (d.status === 'devolvida') return 'descartada';
  if (d.tarefa_id && d.card_id) return 'na jornada e no quadro';
  if (d.tarefa_id) return 'na jornada';
  if (d.card_id) return 'no quadro';
  return 'só anotada';
}

// ── 🪟 A JANELINHA SOLTA ────────────────────────────────────────────────
export const CHAVE_POSICAO_DO_BLOCO = 'nz_bloco_posicao';
export const LARGURA_DO_BLOCO = 440;
/** A partir desta largura de tela o bloco flutua; abaixo, cola embaixo (celular). */
export const LARGURA_MINIMA_PARA_FLUTUAR = 640;

/** Onde o bloco nasce quando ninguém arrastou ainda: canto superior direito, sob o cabeçalho. */
export function posicaoInicialDoBloco({ larguraJanela, larguraBloco = LARGURA_DO_BLOCO } = {}) {
  const x = Math.max(8, (Number(larguraJanela) || 0) - larguraBloco - 16);
  return { x, y: 72 };
}

/** Mantém o bloco dentro da tela (nunca some atrás da borda). */
export function posicaoDoBloco({ x, y } = {}, { larguraJanela, alturaJanela, larguraBloco = LARGURA_DO_BLOCO, alturaBloco = 200 } = {}) {
  const maxX = Math.max(0, (Number(larguraJanela) || 0) - larguraBloco);
  const maxY = Math.max(0, (Number(alturaJanela) || 0) - Math.min(alturaBloco, 120));
  const cx = Math.min(Math.max(0, Number(x) || 0), maxX);
  const cy = Math.min(Math.max(0, Number(y) || 0), maxY);
  return { x: Math.round(cx), y: Math.round(cy) };
}

export function lerPosicaoDoBloco(storage) {
  try {
    const bruto = armazem(storage)?.getItem(CHAVE_POSICAO_DO_BLOCO);
    const p = bruto ? JSON.parse(bruto) : null;
    return p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)) ? { x: Number(p.x), y: Number(p.y) } : null;
  } catch { return null; }
}
export function gravarPosicaoDoBloco(posicao, storage) {
  try { armazem(storage)?.setItem(CHAVE_POSICAO_DO_BLOCO, JSON.stringify({ x: Math.round(posicao.x), y: Math.round(posicao.y) })); } catch { /* sem storage */ }
  return posicao;
}
