// 🔎 A ORDEM DA LISTA DE NETWORKING — regra pura, testável sem navegador.
//
// 🔴 POR QUE ISTO EXISTE (22/09/2026)
// Pedido do Ávilla: "os adicionados mais recentes devem ser vistos primeiro, e
// alterados também".
//
// COMO ESTAVA: a lista ordenava por PROBABILIDADE DE FECHAMENTO (maior primeiro)
// e, no empate, por nome. Quem acabou de ser cadastrado ainda não tem
// qualificação — e sem qualificação a probabilidade é `null`, que a ordenação
// tratava como -1. Ou seja: **a pessoa que você acabou de adicionar ia para o
// FIM da lista**, atrás de todo mundo que já tem nota. Com 277 pessoas na base,
// some da tela.
//
// A ordem por probabilidade não é errada — ela responde "quem eu ligo agora?".
// Só que ela não é a única pergunta. Quem acabou de cadastrar alguém está
// perguntando "salvou?". As duas continuam existindo; o que muda é qual delas
// vem ligada por padrão.
//
// `recentes` é o padrão porque é o que quem MEXE na lista espera ver.

// import relativo (não `@/`): este arquivo é exercitado por `node --test`, que
// não conhece o alias do Vite. Ver tests/ordemDaAgenda.test.mjs.
import { probabilidadeFechamento } from './metodo.js';

export const ORDEM_PADRAO = 'recentes';

export const ORDENS = [
  { id: 'recentes', rotulo: '🕒 mais recentes', dica: 'quem entrou ou foi alterado por último aparece em cima' },
  { id: 'quentes', rotulo: '🔥 mais quentes', dica: 'maior probabilidade de fechamento em cima' },
];

export function ordemValida(id) {
  return ORDENS.some((o) => o.id === id) ? id : ORDEM_PADRAO;
}

/**
 * Quando esta pessoa foi mexida pela última vez, em milissegundos.
 *
 * Olha a alteração ANTES da criação de propósito: o pedido fala em "adicionados
 * ... e alterados também". Quem corrige o telefone de um contato de março
 * espera ele subir, não continuar em março.
 *
 * Os quatro campos existem e estão preenchidos nas 277 linhas da base (conferido
 * em 22/09/2026), mas a ordem de tentativa importa pra linha que vier de outra
 * origem amanhã. Sem data nenhuma → 0, que manda pro fim em vez de quebrar.
 */
export function mexidoEm(pessoa) {
  const campos = [pessoa?.updated_date, pessoa?.updated_at, pessoa?.created_date, pessoa?.created_at];
  for (const c of campos) {
    if (!c) continue;
    const t = new Date(c).getTime();
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

/** Casa o termo com nome, telefone ou e-mail. Sem termo, passa todo mundo. */
export function casaComTermo(pessoa, termo) {
  const t = String(termo || '').trim().toLowerCase();
  if (!t) return true;
  return ['full_name', 'phone', 'email']
    .some((campo) => String(pessoa?.[campo] || '').toLowerCase().includes(t));
}

const porNome = (a, b) =>
  String(a?.full_name || '').localeCompare(String(b?.full_name || ''), 'pt-BR');

/**
 * Filtra pela busca e ordena pela ordem escolhida.
 *
 * Nunca muda o array recebido: a tela guarda `clientesManuais` em estado, e
 * ordenar por cima dele embaralharia a lista de quem passou pra cá.
 *
 * ⚠️ HONESTIDADE SOBRE O `[...filtrados]`: hoje ele é redundante, e eu descobri
 * isso na rodada de mutação — trocar `[...filtrados].sort` por `filtrados.sort`
 * NÃO quebrou teste nenhum. E não quebra mesmo: `.filter()` já devolve um array
 * novo, então o `.sort()` estaria mexendo na cópia dele, não no original.
 *
 * Mantido de propósito, como cinto e suspensório: no dia em que alguém
 * "otimizar" o caminho sem busca com um `if (!termo) return pessoas;`, o
 * `.sort()` passaria a ordenar o estado do componente por dentro — e esse é um
 * bug que não dá erro, só faz a tela piscar em ordem errada de vez em quando.
 * O teste "não mexe no array que recebeu" continua valendo como contrato: ele
 * pega esse atalho no dia em que ele aparecer.
 */
export function ordenarAgenda(pessoas = [], { termo = '', ordem = ORDEM_PADRAO } = {}) {
  const filtrados = (pessoas || []).filter((p) => casaComTermo(p, termo));
  const qual = ordemValida(ordem);

  if (qual === 'recentes') {
    // desempate por nome: duas pessoas importadas no mesmo segundo (acontece na
    // importação de agenda) ficariam numa ordem que muda a cada render
    return [...filtrados].sort((a, b) => mexidoEm(b) - mexidoEm(a) || porNome(a, b));
  }

  return [...filtrados].sort((a, b) => {
    const pa = probabilidadeFechamento(a?.qualificacao_network)?.pct ?? -1;
    const pb = probabilidadeFechamento(b?.qualificacao_network)?.pct ?? -1;
    return pb - pa || porNome(a, b);
  });
}
