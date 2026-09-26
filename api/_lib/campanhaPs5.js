// 📣 CAMPANHA DO PS5 — 26/09/2026 (dono: "vamos disparar os e-mails para os usuários").
//
// O texto, a arte e o link vieram do dono. Aqui ficam as regras puras — quem
// recebe, em que janela, e a peça pronta — para dar pra testar sem banco e sem
// Brevo. Quem dispara é api/functions/dispararCampanhaPs5.js, pelo servidor,
// porque a chave da Brevo só existe lá (scripts/campanha/disparar.mjs precisa
// dela na máquina de quem roda, e hoje ninguém tem).
//
// 🔴 Uma campanha só, com dia marcado. Fora da janela nada sai, e cada pessoa
// recebe UMA vez (avisos_enviados: tipo 'campanha_ps5', chave '2026-09-26').
import { modeloDeEmail, p, esc, SITE } from './modeloDeEmail.js';
import { classificarEmail, EMAILS_INTERNOS, normalizarEmail } from '../../scripts/campanha/publico.mjs';

export const TIPO = 'campanha_ps5';
export const CHAVE = '2026-09-26';
export const LINK = 'https://leilaonozap.net/Home?ref=top';
export const IMAGEM = `${SITE}/midia/campanha-ps5-26-09.jpg`;
/** Janela do disparo, em Brasília. Fora dela a rota responde "fora_da_janela" e não manda nada. */
export const JANELA = Object.freeze({ dia: '2026-09-26', de: '12:30', ate: '17:30' });
/** Quantas pessoas por execução (o cron roda de 5 em 5 min até esvaziar a fila). */
export const POR_EXECUCAO = 300;
export const POR_CHAMADA_BREVO = 50;

function horaBR(agora) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const partes = Object.fromEntries(f.formatToParts(new Date(agora)).map((x) => [x.type, x.value]));
  return { dia: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
}
/** Está na janela? (dia certo, entre `de` e `ate`, horário de Brasília) */
export function dentroDaJanela(agora = Date.now(), janela = JANELA) {
  const { dia, hora } = horaBR(agora);
  return dia === janela.dia && hora >= janela.de && hora <= janela.ate;
}

/**
 * Quem pode receber: e-mail válido (regra da campanha), conta ativa, aceita
 * avisos de leilão, não pediu para sair, não é caixa interna, não recebeu ainda.
 * @returns {{ok:boolean, motivo:string}}
 */
export function elegivel(pessoa, { descadastrados = new Set(), jaReceberam = new Set() } = {}) {
  const email = normalizarEmail(pessoa?.email);
  if (!pessoa?.id) return { ok: false, motivo: 'sem_id' };
  if (jaReceberam.has(String(pessoa.id))) return { ok: false, motivo: 'ja_recebeu' };
  const classe = classificarEmail(email);
  if (classe !== 'ok') return { ok: false, motivo: classe };
  if (EMAILS_INTERNOS.includes(email)) return { ok: false, motivo: 'interno' };
  if (pessoa.active === false) return { ok: false, motivo: 'inativo' };
  if (pessoa.avisos_leilao === false) return { ok: false, motivo: 'nao_aceita' };
  if (descadastrados.has(email)) return { ok: false, motivo: 'descadastrado' };
  return { ok: true, motivo: 'ok' };
}

/** Primeiro nome limpo, ou '' (a saudação some em vez de sair errada). */
export function primeiroNome(nome) {
  const limpo = String(nome ?? '').trim().replace(/\s+/g, ' ');
  const [primeiro] = limpo.split(' ');
  if (!primeiro || primeiro.length < 2 || /\d/.test(primeiro)) return '';
  if (/^(vim|indicado|indica[cç][aã]o|parceiro|teste|qa)$/i.test(primeiro)) return '';
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR');
}

/**
 * A peça. Texto do dono (com a hora certa: o PS5 ENCERRA às 18h), arte no topo,
 * um botão só, link de saída no rodapé. Assunto curto, sem caixa alta.
 */
export function montarEmailPs5({ nome = '', linkSaida = '' } = {}) {
  const primeiro = primeiroNome(nome);
  const assunto = 'PS5 no leilão: encerra hoje às 18h. Dê seu lance';
  const preheader = 'Um PS5 novo na caixa em disputa. Acesse sua conta e participe antes das 18h.';
  const corpo = [
    p(primeiro ? `${primeiro}, hoje é dia de oportunidade grande no Leilão no Zap. 👀🔥` : 'Hoje é dia de oportunidade grande no Leilão no Zap. 👀🔥'),
    p('Às 18h encerra a disputa de um PS5 novo na caixa na plataforma.'),
    p('Se você já tem cadastro, agora é simples: acesse sua conta, acompanhe os lances e participe.'),
    p('Essa pode ser a chance de disputar um dos produtos mais desejados do mercado por um valor muito mais atrativo.'),
    p('Não deixa pra entrar em cima da hora.'),
  ];
  const html = modeloDeEmail({
    titulo: 'PS5 no leilão, é hoje às 18h',
    preheader,
    imagem: { url: IMAGEM, alt: 'PS5 no Leilão. É hoje às 18h.', href: LINK },
    corpo,
    botao: { rotulo: 'Acesse sua conta e dê seu lance', url: LINK },
    avisoFinal: 'Antes de dar seu lance, leia as regras da plataforma.',
    motivo: 'Você recebe este e-mail porque tem cadastro no Leilão NoZap.',
    sair: linkSaida ? { rotulo: 'Não quero mais receber.', url: linkSaida } : null,
  });
  const texto = [
    primeiro ? `${primeiro}, hoje é dia de oportunidade grande no Leilão no Zap.` : 'Hoje é dia de oportunidade grande no Leilão no Zap.',
    '',
    'Às 18h encerra a disputa de um PS5 novo na caixa na plataforma.',
    '',
    'Se você já tem cadastro, agora é simples: acesse sua conta, acompanhe os lances e participe.',
    'Essa pode ser a chance de disputar um dos produtos mais desejados do mercado por um valor muito mais atrativo.',
    'Não deixa pra entrar em cima da hora.',
    '',
    `Acesse sua conta e dê seu lance: ${LINK}`,
    '',
    'Antes de dar seu lance, leia as regras da plataforma.',
    '---',
    'Você recebe este e-mail porque tem cadastro no Leilão NoZap.',
    linkSaida ? `Para não receber mais: ${linkSaida}` : '',
    'Leilão NoZap - relacionamento@leilaonozap.com',
  ].filter((l) => l !== null).join('\n');
  return { assunto, html, texto };
}
export { esc };
