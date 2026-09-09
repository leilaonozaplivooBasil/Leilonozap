// 🎙️ ACERVO DE VOZ — quanto tempo a gravação fica, e o que a pessoa faz antes
// dela ir embora (DIR-104, 09/09/2026).
//
// Decisão do dono: "Faz sentido, mas inclua opção de download e aviso de que
// só permanece salvo por 1 mês."
//
// ⚠️ O QUE ISSO MUDA NA PROMESSA, EM VOZ ALTA: antes, o áudio da gratidão era
// acervo — "ouça o que você agradeceu há um ano". Agora ele é MEMÓRIA CURTA de
// 30 dias. Quem quiser guardar pra sempre, guarda no próprio aparelho, pelo
// botão de baixar. Por isso o download e o aviso não são enfeite: são a
// contrapartida da faxina. Apagar sem avisar seria quebrar promessa em
// silêncio; apagar sem dar como levar embora seria quebrar duas vezes.
//
// A régua vive aqui, pura, porque quem apaga (o cron) e quem avisa (a tela)
// TÊM que concordar no dia. Se a tela disser "restam 3 dias" e o cron apagar
// hoje, a pessoa perde a gravação depois de ler que ainda tinha tempo.

export const RETENCAO_AUDIO_DIAS = 30;

/** 'YYYY-MM-DD' → Date no meio-dia local (some com fuso na conta de dias). */
function meioDiaDe(dataISO) {
  const d = new Date(`${String(dataISO || '').slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const UM_DIA = 24 * 60 * 60 * 1000;

/** Quantos dias a gravação já viveu. `null` quando a data não presta. */
export function diasDeVida(dataISO, hoje = new Date()) {
  const nasceu = meioDiaDe(dataISO);
  if (!nasceu) return null;
  const agora = meioDiaDe(hoje instanceof Date ? hoje.toISOString().slice(0, 10) : hoje);
  if (!agora) return null;
  return Math.floor((agora - nasceu) / UM_DIA);
}

/**
 * Quantos dias ainda restam. Nunca negativo — "passou de 30" e "passou de 300"
 * dão a mesma coisa pra quem lê: acabou.
 */
export function diasQueRestam(dataISO, hoje = new Date(), retencao = RETENCAO_AUDIO_DIAS) {
  const vividos = diasDeVida(dataISO, hoje);
  if (vividos === null) return null;
  return Math.max(0, retencao - vividos);
}

/**
 * Já passou do prazo? É ESTA função que o cron usa pra decidir o que apagar —
 * a mesma que a tela usa pra avisar. Uma régua só, de propósito.
 */
export function audioExpirado(dataISO, hoje = new Date(), retencao = RETENCAO_AUDIO_DIAS) {
  const vividos = diasDeVida(dataISO, hoje);
  if (vividos === null) return false; // data ruim não autoriza apagar nada
  return vividos >= retencao;
}

/**
 * O aviso, na língua de quem lê. Sempre existe: o silêncio é que faz a pessoa
 * descobrir a regra no dia em que ela perde a gravação.
 */
export function avisoDeRetencao(dataISO, hoje = new Date(), retencao = RETENCAO_AUDIO_DIAS) {
  const restam = diasQueRestam(dataISO, hoje, retencao);
  if (restam === null) return `fica guardado por ${retencao} dias — baixe pra guardar pra sempre`;
  if (restam === 0) return 'passou de 1 mês — esta gravação já foi apagada';
  if (restam === 1) return 'some amanhã — baixe pra guardar pra sempre';
  if (restam <= 7) return `some em ${restam} dias — baixe pra guardar pra sempre`;
  return `fica guardado por ${retencao} dias — baixe pra guardar pra sempre`;
}

/** Está na reta final? A tela usa pra acender o aviso em âmbar em vez de cinza. */
export function retaFinal(dataISO, hoje = new Date(), retencao = RETENCAO_AUDIO_DIAS) {
  const restam = diasQueRestam(dataISO, hoje, retencao);
  return restam !== null && restam > 0 && restam <= 7;
}

/**
 * O nome do arquivo que a pessoa vai ver na pasta de downloads.
 *
 * `gratidao-2026-09-09.webm` e não `1757...-a3f9.webm`: o arquivo vai viver no
 * computador dela pra sempre, longe daqui — o nome é a única pista que sobra
 * de que aquilo era a gratidão daquele dia.
 */
export function nomeDoArquivo(caminho, dataISO) {
  const ext = (String(caminho || '').match(/\.([a-z0-9]{2,5})$/i)?.[1] || 'webm').toLowerCase();
  const dia = String(dataISO || '').slice(0, 10) || 'gravacao';
  return `gratidao-${dia}.${ext}`;
}

/**
 * O link assinado, agora forçando DOWNLOAD em vez de abrir uma aba tocando.
 *
 * O Storage do Supabase aceita `?download=<nome>` no link assinado e responde
 * com Content-Disposition: attachment. É por isso que dá pra baixar sem passar
 * o arquivo inteiro pela memória do navegador — e sem `<a download>`, que o
 * navegador ignora quando o arquivo vem de outro domínio.
 */
export function linkParaBaixar(url, nome) {
  if (!url) return null;
  const juncao = String(url).includes('?') ? '&' : '?';
  return `${url}${juncao}download=${encodeURIComponent(nome || 'gratidao.webm')}`;
}
