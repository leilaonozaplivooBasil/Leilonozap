// 🎴 A CAPA DAS VISÕES DO COMPROMISSO — DIR-183 (24/09/2026)
//
// ═══════════════════════════════════════════════════════════════════════════
// ORDEM DO DONO
// ═══════════════════════════════════════════════════════════════════════════
// "Eu preciso da mesma função igual os 08 Hábitos do Sucesso: quando eu
// clicar em Jornada vai sumir os outros, sumir a moeda, sumir TUDO e aparecer
// só o card — exatamente como está funcionando os Hábitos. E eu posso passar
// lateralmente com a seta ou clicando nos quadrados, e ter a página principal
// onde aparecem as moedas e etc."
//
// É o MESMO padrão do DIR-179 (capaDosHabitos.js), um nível abaixo: lá a capa
// é dos 8 Hábitos; aqui é das 5 VISÕES de dentro do Compromisso. Dois estados,
// nunca os dois juntos:
//
//   CAPA          → os 5 quadrados + o placar (Human Token, moeda, fogo, X-Pay)
//   VISÃO ABERTA  → só ela, com a barra fina ‹ Nome ›; o placar some
//
// ⚠️ Por que estas contas moram numa lib e não dentro do .jsx: `node --test`
// não abre .jsx. Uma regra de navegação que ninguém testa é uma regra que
// ninguém defende quando ela quebrar.

import { DESTINOS_DO_ATALHO } from './atalhoTopCollege.js';

/** A ordem oficial das 5 visões. É ela que o ‹ › percorre. */
export const ORDEM_DAS_VISOES = Object.freeze(DESTINOS_DO_ATALHO.map((d) => d.id));

export const CHAVE_ULTIMA_VISAO = 'nz_ultima_visao';

/** Um id de visão válido, ou null (= a capa). */
export function visaoValida(id) {
  const v = String(id ?? '').trim().toLowerCase();
  return ORDEM_DAS_VISOES.includes(v) ? v : null;
}

/** O rótulo da visão, pra tela. */
export function rotuloDaVisao(id) {
  const v = visaoValida(id);
  return v ? DESTINOS_DO_ATALHO.find((d) => d.id === v).rotulo : '';
}

/**
 * A visão ANTERIOR e a SEGUINTE, em roda.
 *
 * 🔁 Dá a volta de propósito, igual aos Hábitos: quem está em Demandas (a
 * última) e aperta "próxima" volta pra Jornada. Um ‹ › que apaga na ponta faz
 * a pessoa achar que travou.
 */
export function vizinhasDaVisao(id) {
  const atual = visaoValida(id);
  if (!atual) return { anterior: null, proxima: null };
  const i = ORDEM_DAS_VISOES.indexOf(atual);
  const n = ORDEM_DAS_VISOES.length;
  return {
    anterior: ORDEM_DAS_VISOES[(i - 1 + n) % n],
    proxima: ORDEM_DAS_VISOES[(i + 1) % n],
  };
}

/** O número da visão (1 a 5), pro rótulo "01", "02"… */
export function numeroDaVisao(id) {
  const atual = visaoValida(id);
  return atual ? ORDEM_DAS_VISOES.indexOf(atual) + 1 : 0;
}

/**
 * ONDE A TELA ABRE.
 *
 * A mesma escolha que o dono já fez pros Hábitos, pela mesma razão: o
 * Compromisso é a tela do dia a dia, e obrigar a passar pela capa toda manhã
 * custaria um toque a mais, pra sempre. Então:
 *
 *   1º a URL (`?visao=`) manda — é o que um link compartilhado promete, e é
 *      por ela que o atalho ⭐ da Top College entra direto na visão fixada;
 *   2º senão, a última visão que a pessoa abriu neste aparelho;
 *   3º senão (primeira vez), a CAPA — que é onde moram as moedas.
 *
 * Devolve `null` pra capa.
 */
export function visaoDeEntrada({ daUrl = null, doAparelho = null } = {}) {
  return visaoValida(daUrl) || visaoValida(doAparelho) || null;
}

/**
 * 🚨 O QUE FURA O FOCO.
 *
 * Dentro de uma visão "some tudo" — menos dois avisos, porque eles são de
 * HORA MARCADA e custam o dia inteiro da pessoa:
 *   • o Ritual do Amanhecer (passou da janela, o dia fica perdido, sem
 *     segunda chance);
 *   • o DIA ZERADO (não votou / passou do "pronto até").
 * Decisão do dono, com o custo na mesa: "só esses dois furam".
 *
 * Qualquer outro aviso (liberação, aviso âmbar do pronto) fica na capa.
 */
export const AVISOS_QUE_FURAM = Object.freeze(['zerado-nao-votou', 'zerado-atraso']);

export function furaOFoco(tipo) {
  return AVISOS_QUE_FURAM.includes(String(tipo ?? ''));
}

// ── a memória do aparelho ──────────────────────────────────────────────────
function armazem(storage) {
  if (storage) return storage;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function lerUltimaVisao(storage) {
  try { return visaoValida(armazem(storage)?.getItem(CHAVE_ULTIMA_VISAO)); } catch { return null; }
}

/**
 * Grava a última visão aberta. `null` (a capa) APAGA a memória de propósito:
 * quem voltou pra capa quis sair da visão, e reabrir a página não pode
 * arrastá-la de volta pra dentro dela.
 */
export function gravarUltimaVisao(id, storage) {
  const v = visaoValida(id);
  try {
    if (v) armazem(storage)?.setItem(CHAVE_ULTIMA_VISAO, v);
    else armazem(storage)?.removeItem(CHAVE_ULTIMA_VISAO);
  } catch { /* aparelho sem storage: a URL e o padrão continuam valendo */ }
  return v;
}
