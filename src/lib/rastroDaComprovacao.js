// 🧾 O RASTRO DA COMPROVAÇÃO — o que permite dizer "foi erro nosso" ou "foi
// mal uso" sem abrir log de servidor (10/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ISTO EXISTE
// ═══════════════════════════════════════════════════════════════════════════
// Dono: o laudo de comprovações serve pra "quando o usuário reclamar de algum
// erro, podermos ver na hora se foi mal uso do usuário ou se de fato é erro".
//
// 🔴 E a comprovação de hoje NÃO responde isso. Medido em 10/09, sobre as 255
// comprovações dos últimos 7 dias:
//
//     guardam quantas vezes a pessoa tentou ....... 0
//     guardam tempo de tela ...................... 19  (só o ritual)
//     marcam IA fora do ar ........................ 0
//
// A comprovação é SOBRESCRITA: só sobra a última tentativa.
//
// O caso que provou a falta: na manhã de 10/09, cinco pessoas não conseguiram
// gravar o vídeo do Ritual. Onze envios voltaram HTTP 413 — e NADA disso
// aparecia na comprovação. A evidência estava só no log da Vercel, que ninguém
// abre às 6h da manhã. Quem abrisse o laudo da Iara leria "reprovada — ritual
// perdido" e concluiria MAL USO. Estaria errado, e o laudo teria dado
// confiança pra errar.
//
// Estes campos são o que falta pra pergunta ser respondível pelo próprio
// registro.

/** Teto do histórico de falhas: o suficiente pra diagnosticar, sem inchar a linha. */
export const MAX_FALHAS = 10;

/**
 * Em que tentativa a pessoa está.
 *
 * A comprovação anterior da MESMA tarefa é a prova de que já houve uma. Sem
 * `tentativas` gravado (registro antigo), uma comprovação existente já conta
 * como a primeira — por isso o piso é 1, e não 0.
 */
export function proximaTentativa(comprovacaoAnterior) {
  if (!comprovacaoAnterior) return 1;
  const antes = Number(comprovacaoAnterior?.tentativas);
  return (Number.isFinite(antes) && antes > 0 ? antes : 1) + 1;
}

/**
 * Acrescenta uma falha técnica ao histórico, mantendo as mais RECENTES.
 *
 * ⚠️ Guarda as últimas, não as primeiras: quando alguém reclama, o que
 * interessa é o que acabou de acontecer. Cortar pelo começo deixaria o teto
 * esconder justamente a falha da reclamação.
 */
export function comFalha(falhasAntes, { o_que, erro, quando } = {}) {
  const lista = Array.isArray(falhasAntes) ? falhasAntes : [];
  const oQue = String(o_que || '').trim();
  if (!oQue) return lista.slice(-MAX_FALHAS);
  const nova = {
    o_que: oQue,
    erro: String(erro || 'sem detalhe').trim().slice(0, 200),
    quando: quando || new Date().toISOString(),
  };
  return [...lista, nova].slice(-MAX_FALHAS);
}

/**
 * Segundos de tela MEDIDOS, ou `null` quando não houve medição.
 *
 * 🔴 `Number(null)` é 0, e `Number('')` também. Sem esta peça, todo caminho
 * que não mede tempo de tela gravaria `tempo_tela_s: 0` — e o laudo diria
 * "ficou zero segundo na tela" onde a verdade é "não sei". Seria a mesma
 * mentira confiante que este arquivo existe pra evitar, só que ao contrário:
 * em vez de esconder erro do sistema, acusaria mal uso que não houve.
 *
 * Zero MEDIDO continua valendo 0 — é informação de verdade.
 */
function segundosMedidos(tempoTelaS) {
  if (tempoTelaS === null || tempoTelaS === undefined || tempoTelaS === '') return null;
  const seg = Number(tempoTelaS);
  return Number.isFinite(seg) && seg >= 0 ? seg : null;
}

/**
 * Os campos de rastro prontos pra entrar na comprovação.
 *
 * Só devolve o que TEM valor: registro sem falha nenhuma não ganha um
 * `falhas: []` vazio pra carregar pra sempre.
 */
export function rastroDa({ anterior = null, tempoTelaS = null, iaIndisponivel = false, falhas = [] } = {}) {
  const seg = segundosMedidos(tempoTelaS);
  return {
    tentativas: proximaTentativa(anterior),
    ...(seg === null ? {} : { tempo_tela_s: Math.round(seg) }),
    ...(iaIndisponivel ? { ia_indisponivel: true } : {}),
    ...(Array.isArray(falhas) && falhas.length ? { falhas: falhas.slice(-MAX_FALHAS) } : {}),
  };
}

/**
 * A leitura do laudo, em uma linha: o que este registro sugere.
 *
 * 🔴 NÃO decide nada — só aponta pra onde olhar. A decisão é de quem lê, e é
 * por isso que a frase diz "olhar" e não "culpado". Um diagnóstico automático
 * aqui repetiria o erro que este arquivo existe pra corrigir.
 */
export function leituraDoRastro(comprovacao = {}) {
  const falhas = Array.isArray(comprovacao?.falhas) ? comprovacao.falhas : [];
  const tentativas = Number(comprovacao?.tentativas) || 1;
  const seg = Number(comprovacao?.tempo_tela_s);
  if (falhas.length) return { sinal: 'erro_do_sistema', texto: `falha técnica registrada: ${falhas[falhas.length - 1].erro}` };
  if (comprovacao?.ia_indisponivel) return { sinal: 'erro_do_sistema', texto: 'a IA não respondeu — não foi a pessoa' };
  if (tentativas >= 3) return { sinal: 'olhar', texto: `${tentativas} tentativas — vale conferir o que travou` };
  if (Number.isFinite(seg) && seg > 0 && seg < 30) return { sinal: 'olhar', texto: `só ${seg}s de tela` };
  return { sinal: 'normal', texto: 'sem sinal técnico' };
}
