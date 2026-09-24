// 🎴 A CAPA DOS 8 HÁBITOS — 24/09/2026
//
// ═══════════════════════════════════════════════════════════════════════════
// ORDEM DO DONO
// ═══════════════════════════════════════════════════════════════════════════
// "Quando eu clicar no Sonho, o quadro do Compromisso, Lista, Contato,
// Apresentação, Acompanhamento, Verificação e Duplicação precisa sumir...
// aparece só o carro do quadro dos sonhos, e já aparecem os sonhos. Para quê?
// Para limpar mais a página. E me dando a possibilidade de ir para frente e
// para trás. A ideia funciona igual a lupa da loja virtual quando eu procuro
// um produto... eu quero algo tudo muito limpo e muito fluido, porque eu
// estou sentindo muita informação."
//
// 🔴 A CAUSA, achada no código antes de mexer: a tela NUNCA teve um estado
// "nenhum hábito aberto". `secaoAtual` cai em `SECOES[0]` quando nada casa,
// então a grade das 8 portas e o conteúdo de um hábito conviviam SEMPRE. A
// página era menu e mesa de trabalho ao mesmo tempo, o tempo todo — e é isso
// que pesa, não a quantidade de texto de cada hábito.
//
// A analogia do dono é a solução exata: um catálogo tem DOIS estados, grade e
// produto, nunca os dois juntos. Aqui vira CAPA (as 8 portas + o ciclo da
// gamificação) e HÁBITO ABERTO (um só, com ‹ ›).
//
// ⚠️ Por que estas contas moram numa lib e não dentro do .jsx: `node --test`
// não abre .jsx. Uma regra de navegação que ninguém testa é uma regra que
// ninguém defende quando ela quebrar.

import { SECOES_DO_METODO } from './atalhoTopCollege.js';

/** A ordem oficial dos 8 Hábitos. É ela que o ‹ › percorre. */
export const ORDEM_DOS_HABITOS = SECOES_DO_METODO;

export const CHAVE_ULTIMO_HABITO = 'nz_ultimo_habito';

/** Um id de hábito válido, ou null (= a capa). */
export function habitoValido(id) {
  const v = String(id ?? '').trim().toLowerCase();
  return ORDEM_DOS_HABITOS.includes(v) ? v : null;
}

/**
 * O hábito ANTERIOR e o SEGUINTE, em roda.
 *
 * 🔁 Dá a volta de propósito: quem está na Duplicação (8) e aperta "próximo"
 * volta pro Sonho (1), que é como o método se comporta — o ciclo recomeça.
 * Um ‹ › que apaga na ponta faz a pessoa achar que travou.
 */
export function vizinhosDoHabito(id) {
  const atual = habitoValido(id);
  if (!atual) return { anterior: null, proximo: null };
  const i = ORDEM_DOS_HABITOS.indexOf(atual);
  const n = ORDEM_DOS_HABITOS.length;
  return {
    anterior: ORDEM_DOS_HABITOS[(i - 1 + n) % n],
    proximo: ORDEM_DOS_HABITOS[(i + 1) % n],
  };
}

/** O número do hábito (1 a 8), pro rótulo "01", "02"… */
export function numeroDoHabito(id) {
  const atual = habitoValido(id);
  return atual ? ORDEM_DOS_HABITOS.indexOf(atual) + 1 : 0;
}

/**
 * ONDE A PÁGINA ABRE.
 *
 * O dono escolheu, com o custo na mesa: "lembra o último hábito". O
 * Compromisso é a tela do dia a dia — fazer a capa ser a porta de entrada
 * custaria um clique a mais TODA manhã, pra sempre. Então:
 *
 *   1º a URL (`?secao=`) manda — é o que um link compartilhado promete;
 *   2º senão, o último hábito que a pessoa abriu neste aparelho;
 *   3º senão (primeira vez), a CAPA — que é onde se aprende o método.
 *
 * Devolve `null` pra capa.
 */
export function habitoDeEntrada({ daUrl = null, doAparelho = null } = {}) {
  return habitoValido(daUrl) || habitoValido(doAparelho) || null;
}

// ── a memória do aparelho ──────────────────────────────────────────────────
function armazem(storage) {
  if (storage) return storage;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function lerUltimoHabito(storage) {
  try { return habitoValido(armazem(storage)?.getItem(CHAVE_ULTIMO_HABITO)); } catch { return null; }
}

/**
 * Grava o último hábito aberto. `null` (a capa) APAGA a memória de propósito:
 * quem voltou pra capa quis sair do hábito, e reabrir a página não pode
 * arrastá-la de volta pra dentro dele.
 */
export function gravarUltimoHabito(id, storage) {
  const v = habitoValido(id);
  try {
    if (v) armazem(storage)?.setItem(CHAVE_ULTIMO_HABITO, v);
    else armazem(storage)?.removeItem(CHAVE_ULTIMO_HABITO);
  } catch { /* aparelho sem storage: a URL e o padrão continuam valendo */ }
  return v;
}
