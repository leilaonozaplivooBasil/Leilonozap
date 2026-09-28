// 🌱 NUTRIÇÃO DE QUEM SE CADASTROU E NÃO DEPOSITOU — 28/09/2026
//
// Pedido do dono (item 5 da lista de e-mails): "cadastrou e não depositou, D+1
// e D+3". O retrato que motivou: de 134 cadastros entre 20 e 28/09, só 2
// colocaram saldo. A pessoa cria a conta e some antes do primeiro PIX.
//
// É MARKETING, não aviso de conta: sai de ofertas@ (como a campanha do PS5),
// com o link de descadastro do marketing e a MESMA régua de público
// (campanhaPs5.elegivel — sem e-mail inventado, sem caixa interna, sem quem
// pediu pra sair). Cada etapa sai 1x por pessoa (avisos_enviados, tipo
// 'nutricao_d1' / 'nutricao_d3', chave 'cadastro').
//
// Este arquivo é PURO (regras e textos); quem envia é api/functions/nutricaoCadastro.js.
import { modeloDeEmail, p, esc, tabelaDeDados, CORES, SITE } from './modeloDeEmail.js';
import { primeiroNome } from './campanhaPs5.js';
import { DEPOSITO_MINIMO } from '../../src/lib/depositoMinimo.js';

export const ETAPAS = Object.freeze({ d1: { tipo: 'nutricao_d1', dias: 1 }, d3: { tipo: 'nutricao_d3', dias: 3 } });
export const CHAVE = 'cadastro';

const diaBR = (t) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));

/**
 * Quantos dias de calendário (Brasília) desde o cadastro. Cadastro às 23h50 de
 * ontem = 1 dia, igual a quem entrou às 8h de ontem: o e-mail sai no mesmo
 * horário do dia seguinte pra todo mundo. O cron roda 1x por dia, então cada
 * pessoa cai em UMA rodada de cada etapa.
 */
export function diasDesdeCadastro(criadoEm, agora = Date.now()) {
  const t = new Date(criadoEm).getTime();
  if (!Number.isFinite(t)) return null;
  const a = Date.parse(`${diaBR(agora)}T00:00:00Z`); const b = Date.parse(`${diaBR(t)}T00:00:00Z`);
  return Math.round((a - b) / 86400000);
}

/** 'd1' | 'd3' | null */
export function etapaDoDia(criadoEm, agora = Date.now()) {
  const d = diasDesdeCadastro(criadoEm, agora);
  if (d === ETAPAS.d1.dias) return 'd1';
  if (d === ETAPAS.d3.dias) return 'd3';
  return null;
}

/**
 * Além da régua da campanha: só cliente comum (equipe, vendedor e licenciado
 * não recebem "coloque saldo"), e só quem ainda não depositou.
 */
export function perfilDeCliente(pessoa) {
  if (!pessoa) return false;
  if ((pessoa.role || 'user') !== 'user') return false;
  const nivel = pessoa.primary_career_level || 'usuario';
  return nivel === 'usuario';
}

const reais = (n) => 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Os leilões abertos agora (até 3), no quadro do modelo. Some se não houver nenhum. */
function blocoDosLeiloes(leiloes = []) {
  const l = (Array.isArray(leiloes) ? leiloes : []).filter((x) => x && x.title).slice(0, 3);
  if (!l.length) return { html: [], texto: [] };
  return {
    html: [p('Abertos agora, com o lance atual:'), tabelaDeDados(l.map((x) => [x.title, reais(x.current_price)]))],
    texto: ['Abertos agora, com o lance atual:', ...l.map((x) => `• ${x.title}: ${reais(x.current_price)}`), ''],
  };
}

// Um parágrafo é texto puro OU [pergunta, resposta] (pergunta em negrito).
const paragrafoHtml = (x) => (Array.isArray(x)
  ? `<p style="margin:0 0 14px;color:${CORES.texto};font-size:15px;line-height:1.6"><b style="color:${CORES.marinho}">${esc(x[0])}</b> ${esc(x[1])}</p>`
  : p(x));
const paragrafoTexto = (x) => (Array.isArray(x) ? `${x[0]} ${x[1]}` : x);

/**
 * @param {{etapa:'d1'|'d3', nome?:string, leiloes?:Array<{title:string,current_price:number}>, linkSaida?:string}} o
 * @returns {{assunto:string, html:string, texto:string}|null}
 */
export function montarNutricao({ etapa, nome = '', leiloes = [], linkSaida = '' } = {}) {
  const primeiro = primeiroNome(nome);
  const bloco = blocoDosLeiloes(leiloes);
  let assunto; let titulo; let preheader; let paragrafos; let botao;
  if (etapa === 'd1') {
    assunto = 'Seu primeiro lance começa com um PIX';
    titulo = 'Falta só um passo pro seu primeiro lance';
    preheader = 'Como funciona, em 3 passos, e os leilões abertos agora.';
    paragrafos = [
      primeiro ? `${primeiro}, sua conta no Leilão NoZap está pronta. Só falta saldo pra dar o primeiro lance.` : 'Sua conta no Leilão NoZap está pronta. Só falta saldo pra dar o primeiro lance.',
      `1. Coloque saldo na Carteira pelo PIX, a partir de ${reais(DEPOSITO_MINIMO)}. Entra em instantes.`,
      '2. Escolha um leilão e dê seu lance. Se alguém cobrir, o valor volta pro seu saldo.',
      '3. Arrematou? O valor sai do saldo e o produto vai pra você.',
    ];
    botao = { rotulo: 'Ver os leilões abertos', url: `${SITE}/leiloes` };
  } else if (etapa === 'd3') {
    assunto = 'Ficou alguma dúvida sobre o Leilão NoZap?';
    titulo = 'As dúvidas de quem está começando';
    preheader = 'Depósito, lance coberto e Loja Virtual: as respostas rápidas.';
    paragrafos = [
      primeiro ? `${primeiro}, você criou sua conta há alguns dias e ainda não colocou saldo. Se ficou alguma dúvida, é só responder este e-mail que a gente te ajuda.` : 'Você criou sua conta há alguns dias e ainda não colocou saldo. Se ficou alguma dúvida, é só responder este e-mail que a gente te ajuda.',
      ['Como coloco saldo?', 'Pelo PIX, na Carteira. O pagamento passa pelo Mercado Pago e o saldo entra em instantes.'],
      ['E se eu não ganhar?', 'Quando alguém cobre seu lance, o valor volta pro seu saldo pra usar no próximo leilão.'],
      ['Dá pra comprar sem leilão?', 'Dá: a Loja Virtual aceita o mesmo saldo.'],
    ];
    botao = { rotulo: 'Colocar saldo na Carteira', url: `${SITE}/Carteira` };
  } else {
    return null;
  }
  const motivo = 'Você recebe este e-mail porque criou uma conta no Leilão NoZap.';
  const html = modeloDeEmail({
    titulo, preheader,
    corpo: [...paragrafos.map(paragrafoHtml), ...bloco.html],
    botao, motivo,
    sair: linkSaida ? { rotulo: 'Não quero mais receber.', url: linkSaida } : null,
  });
  const texto = [
    ...paragrafos.map(paragrafoTexto), '',
    ...bloco.texto,
    `${botao.rotulo}: ${botao.url}`, '',
    '---', motivo,
    linkSaida ? `Para não receber mais: ${linkSaida}` : '',
    'Leilão NoZap - relacionamento@leilaonozap.com',
  ].join('\n');
  return { assunto, html, texto };
}
