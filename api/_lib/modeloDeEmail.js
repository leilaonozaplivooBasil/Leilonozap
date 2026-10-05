// ✉️ O MODELO DOS E-MAILS DA PLATAFORMA — 24/09/2026.
//
// Dono: "esse e-mail precisa ir mais profissional e com a nossa identidade
// visual… e também uma clean no corpo do e-mail. Busque referências."
//
// AS REFERÊNCIAS (o que os transacionais bem feitos têm em comum — Nubank,
// Mercado Livre, Stripe, Apple):
//   • fundo claro e UM cartão branco, estreito (560px), centrado;
//   • a marca em cima, pequena, e mais nada disputando com ela;
//   • UM título, dois ou três parágrafos curtos, UM botão;
//   • o que é dado (código, e-mail, senha) num quadro próprio, legível;
//   • rodapé cinza e discreto: quem mandou, por que mandou, como sair.
//
// POR QUE EM TABELA E COM PNG: cliente de e-mail não é navegador. Outlook e
// o app do Gmail não entendem flex/grid nem `border-radius` em div solta, e
// o Outlook do Windows não mostra WebP. Tabela + PNG é o que chega inteiro.
//
// Este arquivo é PURO: recebe pedaços, devolve HTML. Nada de rede, nada de
// banco — quem monta o texto é quem chama (textosDosAvisos, sendEmailCode…).
export const SITE = 'https://leilaonozap.net';
export const LOGO_URL = `${SITE}/brand/logo-email.png`;

/** As cores da marca, tiradas da própria logo (balão verde + LEILÃO NOZAP azul-marinho). */
export const CORES = Object.freeze({
  marinho: '#0B2D4F',   // o azul do "LEILÃO NOZAP"
  verde: '#1B7F4B',     // o verde de ação do site (botão)
  verdeLogo: '#61A668', // o verde do balão
  texto: '#334155',
  cinza: '#6B7280',
  fundo: '#F2F4F3',
  borda: '#E3E8E5',
  quadro: '#F6F8F7',
});

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Um parágrafo do corpo — o texto é escapado aqui. */
export const p = (texto) => `<p style="margin:0 0 14px;color:${CORES.texto};font-size:15px;line-height:1.6">${esc(texto)}</p>`;

/** O quadro do código (confirmação de e-mail, redefinição de senha). */
export const blocoDeCodigo = (codigo) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px"><tr><td align="center" style="background:${CORES.quadro};border:1px solid ${CORES.borda};border-radius:12px;padding:18px 12px;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:8px;color:${CORES.marinho}">${esc(codigo)}</td></tr></table>`;

/** Um quadro de dados (rótulo à esquerda, valor à direita), ex.: e-mail e senha. */
export const tabelaDeDados = (linhas) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:${CORES.quadro};border:1px solid ${CORES.borda};border-radius:12px">${linhas.map(([rotulo, valor], i) => `<tr><td style="padding:${i ? '6px' : '14px'} 16px ${i === linhas.length - 1 ? '14px' : '6px'};color:${CORES.cinza};font-size:12px">${esc(rotulo)}</td><td align="right" style="padding:${i ? '6px' : '14px'} 16px ${i === linhas.length - 1 ? '14px' : '6px'};color:${CORES.marinho};font-size:15px;font-weight:700">${esc(valor)}</td></tr>`).join('')}</table>`;

/** Um endereço copiável, pra quando o botão não abre. */
export const linkCopiavel = (url) => `<p style="margin:0 0 14px;color:${CORES.cinza};font-size:12px;line-height:1.6">Se o botão não abrir, copie este endereço no navegador:<br><span style="color:${CORES.cinza};word-break:break-all">${esc(url)}</span></p>`;

const botaoHtml = (b, secundario = false) => (b && b.url ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:${secundario ? '0 0 6px' : '8px 0 10px'}"><tr><td align="center" style="border-radius:10px;background:${secundario ? '#ffffff' : CORES.verde};border:1px solid ${CORES.verde}"><a href="${esc(b.url)}" target="_blank" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:${secundario ? CORES.verde : '#ffffff'};text-decoration:none;border-radius:10px">${esc(b.rotulo)}</a></td></tr></table>` : '');

/**
 * O e-mail inteiro.
 * @param {object} o
 * @param {string} o.titulo        a manchete (escapada aqui)
 * @param {string[]} o.corpo       pedaços de HTML já prontos (use `p`, `blocoDeCodigo`, `tabelaDeDados`, `linkCopiavel`)
 * @param {{rotulo:string,url:string}} [o.botao]
 * @param {{rotulo:string,url:string}} [o.botaoSecundario]
 * @param {string[]} [o.depoisDoBotao]  pedaços de HTML logo abaixo do botão (ex.: `linkCopiavel`)
 * @param {string} [o.avisoFinal]  linha pequena embaixo do botão (expira em…, se não foi você…)
 * @param {string} [o.motivo]      por que a pessoa recebe este e-mail (rodapé)
 * @param {{rotulo:string,url:string}} [o.sair]  o link de descadastro (rodapé)
 * @param {string} [o.preheader]   a linha que o Gmail mostra ao lado do assunto
 * @param {{url:string,alt?:string,href?:string}} [o.imagem]  arte de topo (campanha), entre a logo e a manchete
 */
export function modeloDeEmail({ titulo, corpo = [], botao = null, botaoSecundario = null, depoisDoBotao = [], avisoFinal = '', motivo = '', sair = null, preheader = '', imagem = null } = {}) {
  const pre = preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${CORES.fundo};opacity:0">${esc(preheader)}</div>` : '';
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:${CORES.fundo};font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CORES.fundo};padding:32px 12px">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid ${CORES.borda};border-radius:14px">
      <tr><td align="center" style="padding:28px 32px 6px">
        <a href="${SITE}" target="_blank" style="text-decoration:none"><img src="${LOGO_URL}" alt="Leilão NoZap" width="220" style="display:block;border:0;width:220px;max-width:220px;height:auto"></a>
      </td></tr>
      ${imagem && imagem.url ? `<tr><td style="padding:14px 32px 0">${imagem.href ? `<a href="${esc(imagem.href)}" target="_blank" style="text-decoration:none">` : ''}<img src="${esc(imagem.url)}" alt="${esc(imagem.alt || titulo)}" width="496" style="display:block;border:0;width:100%;max-width:496px;height:auto;border-radius:12px">${imagem.href ? '</a>' : ''}</td></tr>` : ''}
      <tr><td style="padding:14px 32px 0">
        <h1 style="margin:0 0 14px;color:${CORES.marinho};font-size:22px;line-height:1.3;font-weight:800">${esc(titulo)}</h1>
        ${corpo.join('\n        ')}
        ${botaoHtml(botao)}${botaoHtml(botaoSecundario, true)}
        ${depoisDoBotao.join('\n        ')}
        ${avisoFinal ? `<p style="margin:10px 0 0;color:${CORES.cinza};font-size:12px;line-height:1.6">${esc(avisoFinal)}</p>` : ''}
      </td></tr>
      <tr><td style="padding:22px 32px 0"><div style="height:1px;background:${CORES.borda};line-height:1px;font-size:1px">&nbsp;</div></td></tr>
      <tr><td style="padding:16px 32px 26px;color:${CORES.cinza};font-size:12px;line-height:1.7">
        <b style="color:${CORES.marinho}">Leilão NoZap</b> · <a href="${SITE}" target="_blank" style="color:${CORES.cinza};text-decoration:underline">leilaonozap.net</a><br>
        Dúvida? É só responder este e-mail.${motivo ? `<br>${esc(motivo)}` : ''}${sair && sair.url ? ` <a href="${esc(sair.url)}" style="color:${CORES.cinza};text-decoration:underline">${esc(sair.rotulo || 'Não quero mais receber.')}</a>` : ''}
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}
