// 🎯 EXECUTIVO GANHA 10% NO ARREMATE — regra nova do dono (28/09/2026).
//
// Dono: "ganha 10% no final do leilão", com estas escolhas (conversa de 28/09):
//   • base = valor do arremate, SEM frete (igual aos 5% do indicador);
//   • sai dos 25% que a empresa retinha: fica 5% indicador + 10% executivo +
//     15% retido = os mesmos 30% da rede;
//   • só daqui pra frente (nada retroativo);
//   • linha sem executivo → os 10% ficam com a empresa;
//   • executivo que também é o indicador recebe os dois (5% + 10%);
//   • a conta do dono NÃO entra: "Se não entrar: tiro a sua conta da regra,
//     e essa parte fica com a empresa".
//
// QUEM É O EXECUTIVO: a mesma ordem de busca de resolveExecutivo.js (a régua da
// loja), subindo a partir de quem arrematou — em cada degrau, primeiro o
// executivo DESIGNADO para aquela pessoa (executive_owner_id), depois a própria
// pessoa se tiver o cargo; senão sobe para quem a indicou. SEM cair no
// executivo raiz (semFallbackRaiz): linha vazia fica com a empresa.
//
// Decisões de borda (avisadas ao dono):
//   • quem arrematou não ganha 10% do próprio arremate, mesmo sendo executivo;
//   • o primeiro executivo achado decide: se for o dono, a fatia fica com a
//     empresa (não pula para outro executivo mais acima).
import { isExecutivo, readExecutiveOwner } from './resolveExecutivo.js';

export const PCT_EXECUTIVO_LEILAO = 10.0;

/** Contas fora da regra dos 10% (dono: "tiro a sua conta da regra"). */
export const FORA_DA_REGRA_DO_EXECUTIVO = new Set(['68db0ff2c19838a827fb6e5f']); // LUIZ SANTANNA

const ativo = (u) => Boolean(u) && u.active !== false;
const podeSer = (u) => ativo(u) && isExecutivo(u);

/**
 * Acha o executivo que recebe os 10% deste arremate.
 * @param {object} arrematante  usuário que arrematou (id, referred_by_id, career_levels, active, licenciado_context)
 * @param {(id:string)=>Promise<object|null>} buscar  lê um usuário pelo id
 * @returns {Promise<object|null>} o executivo, ou null (fatia fica com a empresa)
 */
export async function executivoDoArremate(arrematante, buscar) {
  if (!arrematante?.id) return null;
  const vistos = new Set();
  let atual = arrematante;
  let achado = null;
  while (atual && !vistos.has(atual.id) && vistos.size < 30) {
    vistos.add(atual.id);
    const donoId = readExecutiveOwner(atual);
    const dono = donoId ? await buscar(donoId) : null;
    if (podeSer(dono)) { achado = dono; break; }
    if (atual.id !== arrematante.id && podeSer(atual)) { achado = atual; break; }
    atual = atual.referred_by_id ? await buscar(atual.referred_by_id) : null;
  }
  if (!achado) return null;
  if (achado.id === arrematante.id) return null;
  if (FORA_DA_REGRA_DO_EXECUTIVO.has(String(achado.id))) return null;
  return achado;
}
