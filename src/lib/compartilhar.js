// 🔗 COMPARTILHAR COM LINK LIMPO (25/09/2026).
//
// Dono: "ao clicar em compartilhar produto/leilão e copiar o link, ao tentar
// colar num adesivo de link do story do Instagram dá erro de link inválido".
//
// O link em si é curto (leilaonozap.net/l/<id>, ~50 caracteres). O que a
// pessoa colava era a MENSAGEM inteira: o "Copiar" da folha de compartilhar
// do celular copia texto + link, com emoji e quebra de linha — e o adesivo do
// Instagram só aceita uma URL pura. Daqui em diante:
//   1. antes de abrir a folha, o link LIMPO já vai pra área de transferência
//      (e a pessoa é avisada) — cancelou a folha, é só colar;
//   2. o texto compartilhado NÃO repete o link quando a folha recebe `url`
//      em separado (Android e iOS mostram o link uma vez só).
import { copyLink } from './clipboard.js';

/** Tira o link de dentro da mensagem (a folha recebe `url` à parte). */
export function mensagemSemLink(mensagem, url) {
  const m = String(mensagem ?? '');
  const u = String(url ?? '').trim();
  if (!u) return m.trim();
  const saida = [];
  for (const linha of m.split('\n')) {
    if (!linha.includes(u)) { saida.push(linha); continue; }
    const resto = linha.replace(u, '').replace(/[:\s]+$/, '').trimEnd();
    if (resto.trim()) saida.push(resto);
    // "Compre agora:\n<link>" → a linha do link some e o ":" órfão da de cima também
    else if (saida.length) saida[saida.length - 1] = saida[saida.length - 1].replace(/[:\s]+$/, '');
  }
  return saida.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Uma URL pura serve num adesivo de link? (sem espaço, sem quebra, http/https) */
export function ehLinkPuro(texto) {
  const t = String(texto ?? '');
  return /^https?:\/\/\S+$/.test(t) && t === t.trim() && !/\n/.test(t);
}

/**
 * Copia SÓ o link e devolve se copiou. Quem chama mostra o aviso
 * ("Link copiado — cole onde quiser") só quando devolver true.
 */
export async function copiarLinkLimpo(url) {
  const u = String(url ?? '').trim();
  if (!ehLinkPuro(u)) return false;
  try { return await copyLink(u); } catch { return false; }
}
