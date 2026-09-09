// 🎙️ ditado — a regra do "falar em vez de digitar", fora do React.
//
// Nasceu extraída do Tira Dúvidas (07/09/2026), que era o ÚNICO lugar do
// sistema com microfone — e onde o gravador vivia solto dentro do componente,
// em ~60 linhas de refs e limpeza. O dono pediu o mesmo botão em módulos do
// X-GAME (Momento de Gratidão à frente), e copiar aquelas 60 linhas quatro
// vezes seria criar quatro cópias do mesmo bug de microfone-que-fica-ligado.
// No celular esse bug não é sutil: o navegador acende a bolinha vermelha de
// gravação e a pessoa acha que o app está espionando ela.
//
// Aqui fica só o que dá pra testar sem navegador. O MediaRecorder e a limpeza
// moram no hook (useDitado); o desenho, no BotaoDitado.

/** Teto de uma gravação. Veio do Tira Dúvidas e vale pra todo mundo: o
 *  Whisper cobra por minuto e ninguém dita 5 minutos sem se perder. */
export const TETO_GRAVACAO_SEG = 120;

/** Abaixo disso é clique sem querer, não fala — não vale gastar transcrição. */
export const TAMANHO_MINIMO_BYTES = 1000;

export const MENSAGENS = {
  semMicrofone: 'Não consegui abrir o microfone. Libere o acesso ou escreva.',
  semFala: 'Não ouvi nada. Chega mais perto do microfone e grava de novo.',
  falhou: 'Falhou ao transcrever. Tenta escrever?',
};

/**
 * Junta o que a pessoa ditou com o que ela já tinha escrito.
 *
 * DUAS DECISÕES QUE VIERAM DO TIRA DÚVIDAS E FICAM:
 *   1. o ditado ENTRA NO CAMPO, não sai como mensagem. A pessoa lê o que o
 *      computador entendeu e corrige antes de mandar. É isso que faz o áudio
 *      ser seguro num sistema onde o texto vale nota, dinheiro e MvM.
 *   2. acrescenta, não substitui: quem já escreveu metade e ditou o resto não
 *      perde a metade.
 */
export function juntarTexto(atual, novo, limite = Infinity) {
  const a = String(atual ?? '').trim();
  const b = String(novo ?? '').trim();
  if (!b) return a.slice(0, limite);
  return (a ? `${a} ${b}` : b).slice(0, limite);
}

/** mm:ss do cronômetro. */
export function textoDoCronometro(segundos) {
  const s = Math.max(0, Math.floor(Number(segundos) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Quanto ainda dá pra gravar. */
export const segundosRestantes = (segundos, teto = TETO_GRAVACAO_SEG) =>
  Math.max(0, teto - (Number(segundos) || 0));

/** Bateu o teto? Quem chama para a gravação. */
export const bateuOTeto = (segundos, teto = TETO_GRAVACAO_SEG) =>
  (Number(segundos) || 0) >= teto;

/** Veio fala de verdade, ou foi clique sem querer? */
export const gravacaoUtil = (blob) => (Number(blob?.size) || 0) > TAMANHO_MINIMO_BYTES;

// A ordem importa: webm é o que o Chrome/Android dão e o que o Whisper come
// melhor; mp4 é a saída do Safari no iPhone, que só ganhou MediaRecorder no
// iOS 14.3 e não fala webm. Sem nenhum deles, deixa o navegador escolher.
const FORMATOS = ['audio/webm', 'audio/ogg', 'audio/mp4'];

/**
 * Escolhe o formato de gravação. Recebe o testador de fora (o
 * `MediaRecorder.isTypeSupported`) pra esta função poder ser testada no node,
 * onde MediaRecorder não existe.
 */
export function formatoDeGravacao(suporta) {
  if (typeof suporta !== 'function') return null;
  return FORMATOS.find((f) => { try { return suporta(f); } catch { return false; } }) || null;
}

/** Extensão do arquivo a partir do mime — pro nome no cofre de provas. */
export function extensaoDoMime(mime) {
  const base = String(mime || '').split(';')[0].trim().toLowerCase();
  if (base === 'audio/mp4' || base === 'audio/x-m4a') return 'm4a';
  if (base === 'audio/ogg') return 'ogg';
  if (base === 'audio/mpeg') return 'mp3';
  if (base === 'audio/wav') return 'wav';
  return 'webm';
}
