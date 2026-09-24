// 📝 O BLOCO DE NOTAS RÁPIDO — o botão "D" do cabeçalho (24/09/2026).
//
// Dono: "Botão na aba da Top College do lado do ícone, deve ter um ícone de
// 'D' (personalize tipo logo da identidade visual) de demanda, nela abre uma
// lista de demandas (em modal) que joga automaticamente para o quadro, lista
// e jornada. Como um atalho de 'bloco de notas rápido'."
//
// O QUE UMA ANOTAÇÃO VIRA, NO MESMO CLIQUE:
//   1. uma DEMANDA (xperf_demandas, origem 'bloco') — a caixa de entrada da
//      aba Demandas, que é onde a pessoa reencontra o que anotou;
//   2. uma TAREFA de HOJE, sem horário (metodo_tarefas) — entra flexível na
//      Jornada e na Lista (que são a mesma linha, ver destinos.js), perto do
//      "pronto até 18:00"; a pessoa escolhe quando fazer, ou muda o dia;
//   3. um CARD no quadro (metodo_quadro), ligado à tarefa.
//   Depois a demanda é fechada como 'agendada' apontando pra tarefa e pro
//   card — igual ao "transformar em tarefa" da aba Demandas.
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
 * As três peças a partir da demanda já gravada (com id): a tarefa de HOJE
 * sem horário e o card ligado a ela. `ordem` = quantas tarefas o dia já tem.
 */
export function pecasDaAnotacao(demanda, { hojeISO, ordem = 0, nome = null } = {}) {
  if (!demanda?.id || !hojeISO) return null;
  const tarefa = tarefaDaDemanda(demanda, { dia: hojeISO, hora: null, ordem });
  return {
    tarefa,
    card: (tarefaId) => cardDaDemanda(demanda, { tarefaId, responsavelNome: nome }),
  };
}

/** O fechamento da demanda: virou trabalho, aponta pra tarefa e pro card. */
export function fechamentoDaAnotacao({ tarefaId = null, cardId = null, hojeISO, agora = new Date() } = {}) {
  return {
    status: 'agendada', agendada_para: hojeISO,
    tarefa_id: tarefaId, card_id: cardId,
    updated_at: agora.toISOString(),
  };
}

/** As anotações recentes do bloco (só as dele), mais nova primeiro. */
export function anotacoesRecentes(linhas = [], limite = MAX_RECENTES) {
  return (Array.isArray(linhas) ? linhas : [])
    .filter((d) => d?.origem === ORIGEM_BLOCO)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, limite);
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
