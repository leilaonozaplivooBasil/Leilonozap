// ✉️ OS TEXTOS DOS AVISOS POR E-MAIL — 23/09/2026
//
// Pedido do dono: "automação de e-mails: receber e-mail sempre que se
// cadastrar, receber info sempre que entrar em leilão, sempre que for
// superado, sempre que arrematar e etc." Os 8 gatilhos e os textos foram
// aprovados em 23/09 ("faz os 8, textos ok, mesmo remetente").
//
// Este arquivo é PURO: recebe dados, devolve assunto/texto/html. Nada de
// rede, nada de env — é o que os testes leem. Quem envia é avisosPorEmail.js.

import { modeloDeEmail, p, SITE } from './modeloDeEmail.js';

export { SITE };

// A categoria decide qual "desligar avisos" a pessoa clicou.
export const CATEGORIA_POR_TIPO = Object.freeze({
  cadastro: 'conta',
  entrou_no_leilao: 'leilao',
  superado: 'leilao',
  arrematou: 'leilao',
  ultima_hora: 'leilao',
  deposito: 'conta',
  compra_confirmada: 'conta',
  compra_enviada: 'conta',
  kyc_aprovado: 'conta',
  saque_pago: 'conta',
  // 💸 24/09/2026 — comissão paga na mão pela Beatriz (fora do saque da
  // plataforma), com débito atômico do saldo. Ver payCommissionManually.js.
  comissao_paga_manual: 'conta',
});
export const TIPOS_DE_AVISO = Object.freeze(Object.keys(CATEGORIA_POR_TIPO));

export const reais = (n) => {
  const v = Number(n) || 0;
  return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/** "23/09 às 20:00" em Brasília. */
export function quandoBR(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d);
  const g = (t) => p.find((x) => x.type === t)?.value || '';
  return `${g('day')}/${g('month')} às ${g('hour')}:${g('minute')}`;
}

/** "2h 15min" / "40 min" até um instante. */
export function faltaBR(iso, agora = Date.now()) {
  const ms = new Date(iso).getTime() - agora;
  if (!Number.isFinite(ms) || ms <= 0) return 'poucos minutos';
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60); const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || '';

/**
 * O aviso pronto.
 * @param {string} tipo  um de TIPOS_DE_AVISO
 * @param {object} d  dados do gatilho (nome, produto, valor, …) + linkSair (descadastro)
 * @returns {{assunto:string, texto:string, html:string, categoria:string}|null}
 */
export function montarAviso(tipo, d = {}) {
  const nome = primeiroNome(d.nome);
  const oi = nome ? `Oi, ${nome}!` : 'Oi!';
  let assunto; let linhas; let botao;
  switch (tipo) {
    case 'cadastro':
      assunto = `Bem-vindo(a) ao Leilão NoZap${nome ? `, ${nome}` : ''}!`;
      linhas = [`${oi} Sua conta está pronta.`,
        'Por aqui você dá lances em leilões de verdade, compra na Loja Virtual e ainda ganha comissão indicando amigos.',
        'Pra começar: coloque saldo na Carteira e escolha um leilão — o primeiro lance é o que vira o jogo.'];
      botao = { rotulo: 'Ver leilões ativos', url: `${SITE}/leiloes` };
      break;
    case 'entrou_no_leilao':
      assunto = `Você está no leilão: ${d.produto}`;
      linhas = [`Seu lance de ${reais(d.valor)} foi registrado em ${d.produto}. Termina em ${quandoBR(d.termina)}.`,
        'Fique de olho: se alguém cobrir, a gente avisa.'];
      botao = { rotulo: 'Acompanhar o leilão', url: `${SITE}/AuctionRoom?id=${d.leilaoId}` };
      break;
    case 'superado':
      assunto = `Cobriram seu lance em ${d.produto}`;
      linhas = [`Seu lance em ${d.produto} foi coberto — agora está em ${reais(d.valorAtual)}.`,
        `Faltam ${faltaBR(d.termina, d.agora)} pro fim. Ainda dá tempo de voltar pra disputa.`];
      botao = { rotulo: 'Dar lance agora', url: `${SITE}/AuctionRoom?id=${d.leilaoId}` };
      break;
    case 'arrematou':
      assunto = `🎉 Você arrematou ${d.produto}!`;
      linhas = [`Parabéns${nome ? `, ${nome}` : ''}! ${d.produto} é seu por ${reais(d.valor)}.`,
        d.pagoComSaldo
          ? 'O valor já saiu do seu saldo; agora é só aguardar o envio.'
          : `Próximo passo: o valor sai do saldo da sua Carteira automaticamente. Se faltar, complete o depósito de ${reais(d.valor)} na Carteira.`];
      botao = { rotulo: 'Ver meu arremate', url: `${SITE}/MyWinnings` };
      break;
    case 'ultima_hora':
      assunto = `Última hora: ${d.produto} termina às ${quandoBR(d.termina).split(' às ')[1] || ''}`;
      linhas = [`${d.produto} encerra às ${quandoBR(d.termina).split(' às ')[1] || ''}. Lance atual: ${reais(d.valorAtual)} — ${d.naFrente ? 'você está na frente' : 'você foi coberto'}.`];
      botao = { rotulo: 'Ir pro leilão', url: `${SITE}/AuctionRoom?id=${d.leilaoId}` };
      break;
    case 'deposito':
      assunto = `Depósito de ${reais(d.valor)} confirmado`;
      linhas = [`Seu depósito de ${reais(d.valor)} caiu na Carteira.${d.saldo != null ? ` Saldo disponível: ${reais(d.saldo)}.` : ''} Bons lances!`];
      botao = { rotulo: 'Ver leilões ativos', url: `${SITE}/leiloes` };
      break;
    case 'compra_confirmada':
      assunto = `Pedido #${d.pedido} confirmado`;
      linhas = [`${oi} Recebemos o pagamento do seu pedido #${d.pedido} (${reais(d.valor)}).`, 'Agora é com a gente: assim que sair pra entrega, você recebe o rastreio.'];
      botao = { rotulo: 'Ver meus pedidos', url: `${SITE}/MyCatalogOrders` };
      break;
    case 'compra_enviada':
      assunto = `Pedido #${d.pedido} a caminho${d.rastreio ? ` (rastreio ${d.rastreio})` : ''}`;
      linhas = [`Seu pedido #${d.pedido} saiu pra entrega.${d.rastreio ? ` Código de rastreio: ${d.rastreio}.` : ''}`];
      botao = { rotulo: 'Acompanhar o pedido', url: `${SITE}/MyCatalogOrders` };
      break;
    case 'kyc_aprovado':
      assunto = 'Identidade validada — você já pode sacar';
      linhas = [`${oi} Sua identidade foi validada. O saque está liberado — vai pro PIX do seu CPF.`];
      botao = { rotulo: 'Ir pra Carteira', url: `${SITE}/Carteira` };
      break;
    case 'saque_pago':
      assunto = `Saque de ${reais(d.valor)} pago no PIX do seu CPF`;
      linhas = [`Seu saque de ${reais(d.valor)} foi pago no PIX do seu CPF. Se não aparecer na sua conta em algumas horas, responda este e-mail.`];
      botao = { rotulo: 'Ver a Carteira', url: `${SITE}/Carteira` };
      break;
    case 'comissao_paga_manual':
      assunto = `Comissão de ${reais(d.valor)} paga`;
      linhas = [`Sua comissão de ${reais(d.valor)} foi paga${d.pixKeyUsada ? ` no PIX informado (${d.pixKeyUsada})` : ' no PIX combinado com você'}. Se não aparecer na sua conta em algumas horas, responda este e-mail.`];
      botao = { rotulo: 'Ver a Carteira', url: `${SITE}/Carteira` };
      break;
    default:
      return null;
  }
  const categoria = CATEGORIA_POR_TIPO[tipo];
  const rodape = categoria === 'leilao'
    ? 'Você recebe este aviso porque deu lance neste leilão.'
    : 'Você recebe este aviso porque tem conta no Leilão NoZap.';
  const sair = d.linkSair ? `${rodape} Não quer mais receber ${categoria === 'leilao' ? 'avisos de leilão' : 'estes avisos'}? ${d.linkSair}` : rodape;
  const texto = `${linhas.join('\n\n')}\n\n${botao.rotulo}: ${botao.url}\n\n— Leilão NoZap\n${sair}`;
  const html = modeloDeEmail({
    titulo: assunto,
    preheader: linhas[0],
    corpo: linhas.map(p),
    botao,
    motivo: rodape,
    sair: d.linkSair ? { url: d.linkSair, rotulo: `Não quero mais receber ${categoria === 'leilao' ? 'avisos de leilão' : 'estes avisos'}.` } : null,
  });
  return { assunto, texto, html, categoria };
}
