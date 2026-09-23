// ✉️ AS REGRAS DE QUANDO UM AVISO SAI — 23/09/2026 (puro, testado)
import { CATEGORIA_POR_TIPO } from './textosDosAvisos.js';

/** "Superado" sai no máximo 1x a cada 10 min por pessoa por leilão. */
export const DEBOUNCE_SUPERADO_MS = 10 * 60 * 1000;

/** Só estes repetem (com o debounce); os outros são 1x por (pessoa, tipo, chave). */
export const TIPOS_QUE_REPETEM = Object.freeze(['superado']);

/**
 * A pessoa pode receber este aviso?
 * @param {{email?:string, active?:boolean, avisos_leilao?:boolean, avisos_conta?:boolean}} pessoa
 * @param {string} tipo
 */
export function pessoaAceita(pessoa, tipo) {
  if (!pessoa || !pessoa.email || !String(pessoa.email).includes('@')) return false;
  if (pessoa.active === false) return false;
  const cat = CATEGORIA_POR_TIPO[tipo];
  if (!cat) return false;
  if (cat === 'leilao' && pessoa.avisos_leilao === false) return false;
  if (cat === 'conta' && pessoa.avisos_conta === false) return false;
  return true;
}

/**
 * Já foi enviado (pessoa, tipo, chave) em `ultimoEnvio`? Decide se sai de novo.
 * @param {string} tipo
 * @param {string|null|undefined} ultimoEnvio  ISO do último envio, ou nulo
 * @param {number} agora  ms
 */
export function podeRepetir(tipo, ultimoEnvio, agora = Date.now()) {
  if (!ultimoEnvio) return true;
  if (!TIPOS_QUE_REPETEM.includes(tipo)) return false;
  const t = new Date(ultimoEnvio).getTime();
  if (!Number.isFinite(t)) return true;
  return agora - t >= DEBOUNCE_SUPERADO_MS;
}

/**
 * Última hora: leilões que encerram entre 45 e 75 min a partir de agora
 * (o cron roda a cada 15 min — a janela de 30 min garante que cada leilão
 * cai em UMA rodada, e o registro 1x por pessoa segura a repetição).
 */
export function janelaUltimaHora(agora = Date.now()) {
  return { de: new Date(agora + 45 * 60000).toISOString(), ate: new Date(agora + 75 * 60000).toISOString() };
}
