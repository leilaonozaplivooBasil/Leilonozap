// 📱 OS AVISOS POR WHATSAPP E SMS — 29/09/2026 (regras e textos, PURO)
//
// Dono: "precisamos de alguns desses para enviar no WhatsApp para o usuário,
// além dos SMS pela Brevo" → "os 5 que você sugeriu, WhatsApp oficial pela
// Brevo". Só os avisos que perdem valor se a pessoa demorar pra ler o e-mail:
//   ⚡ cobriram seu lance · ⏰ última hora · 🏆 arrematou · ⏳ PIX não pago · 🚚 pedido a caminho
//
// WhatsApp: o texto mora no MODELO aprovado pela Meta dentro da Brevo; daqui
// saem só os campos (NOME, PRODUTO, VALOR…). SMS: o texto sai daqui, SEM
// acento (um acento derruba o limite de 160 pra 70 caracteres e dobra o custo)
// e cabendo em 1 SMS.
//
// Quem envia é api/_lib/avisosPorMensagem.js.
import { telefoneBR } from '../../src/lib/telefoneBR.js';

export const TIPOS_POR_MENSAGEM = Object.freeze(['superado', 'ultima_hora', 'arrematou', 'pix_pendente', 'compra_enviada']);

/** "Cobriram seu lance" por mensagem: no máximo 1 a cada 30 min por pessoa por leilão. */
export const INTERVALO_SUPERADO_MS = 30 * 60 * 1000;
export const TAMANHO_SMS = 160;

const SITE_CURTO = 'leilaonozap.net';

/** Tira acento e troca o que não é GSM-7 (o SMS continua valendo 160). */
export function semAcento(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[–—]/g, '-').replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...')
    .replace(/[^\x20-\x7E\n]/g, '');
}

export const reaisCurto = (n) => 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function horaBR(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(d);
}

/**
 * Silêncio das 22h às 8h (Brasília): mensagem no celular de madrugada é
 * incômodo, e o e-mail + o sino já registraram o aviso. Nada é reenviado
 * depois — o que caiu no silêncio fica só no e-mail e no sino.
 */
export function horarioDeSilencio(agora = Date.now()) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date(agora)));
  return h >= 22 || h < 8;
}

/** Celular brasileiro no formato da Brevo (55 + DDD + número), ou null. Fixo não recebe. */
export function celularParaMensagem(telefone) {
  const t = telefoneBR(telefone);
  return t && t.celular ? `55${t.nacional}` : null;
}

const primeiroNome = (nome) => {
  const p = String(nome || '').trim().split(/\s+/)[0] || '';
  return p ? p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1).toLocaleLowerCase('pt-BR') : '';
};

function linkDoAviso(tipo, d, { curto = false } = {}) {
  const base = curto ? SITE_CURTO : `https://${SITE_CURTO}`;
  if ((tipo === 'superado' || tipo === 'ultima_hora') && d.leilaoId) return `${base}/l/${encodeURIComponent(d.leilaoId)}`;
  if (tipo === 'arrematou') return `${base}/MyWinnings`;
  if (tipo === 'pix_pendente') return !curto && d.link ? d.link : `${base}/${d.deposito ? 'Carteira' : 'MyCatalogOrders'}`;
  if (tipo === 'compra_enviada') return `${base}/${d.arremate ? 'MyWinnings' : 'MyCatalogOrders'}`;
  return base;
}

/**
 * Os campos do modelo de WhatsApp (o texto está na Brevo). Todos os modelos
 * recebem o mesmo conjunto — cada um usa os que precisa.
 */
export function camposDoWhatsApp(tipo, d = {}) {
  if (!TIPOS_POR_MENSAGEM.includes(tipo)) return null;
  const pedido = String(d.pedido || '');
  return {
    NOME: primeiroNome(d.nome) || 'cliente',
    PRODUTO: String(d.produto || (pedido ? `pedido #${pedido}` : 'seu pedido')).slice(0, 80),
    VALOR: reaisCurto(tipo === 'superado' || tipo === 'ultima_hora' ? d.valorAtual : d.valor),
    HORA: horaBR(d.termina) || 'em breve',
    SITUACAO: tipo === 'ultima_hora' ? (d.naFrente ? 'Você está na frente.' : 'Seu lance foi coberto.') : '',
    PEDIDO: pedido,
    RASTREIO: d.rastreio || 'disponível no site',
    LINK: linkDoAviso(tipo, d),
  };
}

/** Encaixa o nome do produto pra mensagem inteira caber em 1 SMS (corta o nome, nunca o link). */
function caber(montar, produto) {
  const inteiro = semAcento(produto).trim();
  const msg = montar(inteiro);
  const sobra = msg.length - TAMANHO_SMS;
  if (sobra <= 0) return msg;
  const cabe = inteiro.length - sobra - 3;
  return cabe >= 6 ? montar(`${inteiro.slice(0, cabe).trim()}...`).replace('.... ', '... ') : msg.slice(0, TAMANHO_SMS);
}

/** O texto do SMS: sem acento, 1 SMS, com link curto. */
export function smsDoAviso(tipo, d = {}) {
  if (!TIPOS_POR_MENSAGEM.includes(tipo)) return null;
  const link = linkDoAviso(tipo, d, { curto: true });
  const hora = horaBR(d.termina);
  let texto;
  switch (tipo) {
    case 'superado':
      texto = caber((p) => `Leilao NoZap: cobriram seu lance em ${p}. Lance atual ${reaisCurto(d.valorAtual)}${hora ? `, encerra ${hora}` : ''}. ${link}`, d.produto || 'um leilao');
      break;
    case 'ultima_hora':
      texto = caber((p) => `Leilao NoZap: ${p} encerra ${hora ? `as ${hora}` : 'em breve'}. Lance atual ${reaisCurto(d.valorAtual)}. ${d.naFrente ? 'Voce esta na frente.' : 'Seu lance foi coberto.'} ${link}`, d.produto || 'o leilao');
      break;
    case 'arrematou':
      texto = caber((p) => `Leilao NoZap: parabens! Voce arrematou ${p} por ${reaisCurto(d.valor)}. Veja os proximos passos: ${link}`, d.produto || 'o leilao');
      break;
    case 'pix_pendente':
      texto = d.deposito
        ? `Leilao NoZap: seu PIX de ${reaisCurto(d.valor)} ainda nao foi pago. O codigo vale 24h. Se ja pagou, ignore. ${link}`
        : `Leilao NoZap: o pedido #${semAcento(d.pedido)} espera o PIX de ${reaisCurto(d.valor)}. O codigo vale 24h. Se ja pagou, ignore. ${link}`;
      break;
    case 'compra_enviada':
      texto = `Leilao NoZap: seu pedido #${semAcento(d.pedido)} saiu para entrega.${d.rastreio ? ` Rastreio: ${semAcento(d.rastreio)}.` : ''} ${link}`;
      break;
    default:
      return null;
  }
  return semAcento(texto).slice(0, TAMANHO_SMS);
}

/** Pode mandar de novo? (1x por pessoa/tipo/chave; "superado" repete depois de 30 min) */
export function mensagemPodeRepetir(tipo, ultimoEnvio, agora = Date.now()) {
  if (!ultimoEnvio) return true;
  if (tipo !== 'superado') return false;
  const t = new Date(ultimoEnvio).getTime();
  return !Number.isFinite(t) || agora - t >= INTERVALO_SUPERADO_MS;
}
