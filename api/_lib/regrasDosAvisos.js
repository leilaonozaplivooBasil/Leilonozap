// ✉️ AS REGRAS DE QUANDO UM AVISO SAI — 23/09/2026 (puro, testado)
import { CATEGORIA_POR_TIPO } from './textosDosAvisos.js';

/** "Superado" sai no máximo 1x a cada 10 min por pessoa por leilão. */
export const DEBOUNCE_SUPERADO_MS = 10 * 60 * 1000;

/** Só estes repetem (com o debounce); os outros são 1x por (pessoa, tipo, chave). */
export const TIPOS_QUE_REPETEM = Object.freeze(['superado']);

/**
 * A pessoa pode receber este aviso?
 * @param {{email?:string, active?:boolean, avisos_leilao?:boolean, avisos_conta?:boolean}} pessoa
 * @param {string} tipo
 */
export function pessoaAceita(pessoa, tipo) {
  if (!pessoa || !pessoa.email || !String(pessoa.email).includes('@')) return false;
  if (pessoa.active === false) return false;
  const cat = CATEGORIA_POR_TIPO[tipo];
  if (!cat) return false;
  if (cat === 'leilao' && pessoa.avisos_leilao === false) return false;
  if (cat === 'conta' && pessoa.avisos_conta === false) return false;
  return true;
}

/**
 * Já foi enviado (pessoa, tipo, chave) em `ultimoEnvio`? Decide se sai de novo.
 * @param {string} tipo
 * @param {string|null|undefined} ultimoEnvio  ISO do último envio, ou nulo
 * @param {number} agora  ms
 */
export function podeRepetir(tipo, ultimoEnvio, agora = Date.now()) {
  if (!ultimoEnvio) return true;
  if (!TIPOS_QUE_REPETEM.includes(tipo)) return false;
  const t = new Date(ultimoEnvio).getTime();
  if (!Number.isFinite(t)) return true;
  return agora - t >= DEBOUNCE_SUPERADO_MS;
}

/**
 * Última hora: leilões que encerram entre 45 e 75 min a partir de agora
 * (o cron roda a cada 15 min — a janela de 30 min garante que cada leilão
 * cai em UMA rodada, e o registro 1x por pessoa segura a repetição).
 */
export function janelaUltimaHora(agora = Date.now()) {
  return { de: new Date(agora + 45 * 60000).toISOString(), ate: new Date(agora + 75 * 60000).toISOString() };
}

/**
 * "Pedido a caminho" (28/09/2026): a tela de pedidos (updateOrderStatus) marca
 * o envio pelo status principal ('shipped'/'saiu_entrega') OU pela Jornada da
 * Entrega ('enviado'/'saiu_entrega'). Qualquer um dos dois = saiu.
 * 'entregue' não conta: quem já recebeu não precisa do "a caminho".
 */
export const ETAPAS_A_CAMINHO = Object.freeze(['shipped', 'saiu_entrega', 'enviado']);
export function pedidoSaiu(status, fulfillment) {
  return ETAPAS_A_CAMINHO.includes(String(status || '')) || ETAPAS_A_CAMINHO.includes(String(fulfillment || ''));
}

// O tracking_code nasce com o NÚMERO DO PEDIDO ("LZ" loja / "AR" arremate + 8
// primeiros do id) e só vira rastreio de verdade quando o painel grava o código
// da transportadora (ex.: AD966744131BR). Sem esta régua, o "a caminho" diria
// "Código de rastreio: ARF861797D" — que não rastreia nada.
const CODIGO_INTERNO = /^(LZ|AR)[0-9A-F]{8}$/i;
export function codigoDeRastreio(trackingCode) {
  const t = String(trackingCode || '').trim();
  return t && !CODIGO_INTERNO.test(t) ? t : '';
}
/** O número que o cliente vê na tela ("LZ42C79347"), igual para confirmado e enviado. */
export function numeroDoPedido({ id, kind, tracking_code: tc } = {}) {
  if (CODIGO_INTERNO.test(String(tc || '').trim())) return String(tc).trim().toUpperCase();
  const base = String(id || '').slice(0, 8).toUpperCase();
  return base ? `${kind === 'arremate' ? 'AR' : 'LZ'}${base}` : '';
}

/**
 * PIX pendente (28/09/2026): PIX gerado entre 60 e 75 min atrás e ainda não
 * pago. O cron roda a cada 15 min — a janela de 15 min põe cada PIX em UMA
 * rodada só, e o registro 1x (chave = id da venda) segura a repetição.
 */
export function janelaPixPendente(agora = Date.now()) {
  return { de: new Date(agora - 75 * 60000).toISOString(), ate: new Date(agora - 60 * 60000).toISOString() };
}

/**
 * Este PIX ainda merece lembrete? Não, se a pessoa gerou OUTRO depois (do
 * mesmo tipo — refez o PIX, o lembrete seria do código velho) ou se já pagou
 * outro depois. Os dados reais: 9 dos 40 PIX de depósito abandonados em
 * setembro tinham outro pago logo em seguida.
 * @param {{id:string, created_date:string}} venda
 * @param {Array<{id:string, created_date:string}>} outrasDaPessoa  mesmas pessoa e kind
 */
export function pixMereceLembrete(venda, outrasDaPessoa = []) {
  const t = new Date(venda?.created_date).getTime();
  if (!venda?.id || !Number.isFinite(t)) return false;
  return !outrasDaPessoa.some((o) => o && o.id !== venda.id && new Date(o.created_date).getTime() > t);
}

/**
 * Arremate sem saldo (07/10/2026, DIR-205): o cron de liquidação tenta a cada
 * 10 min e, enquanto falta saldo, o vencedor recebe e-mail 1h depois do
 * encerramento e de novo 24h depois — 1x cada (chave = `${leilao}:${etapa}`).
 * Devolve a etapa que vale agora ('1h' | '24h') ou null se ainda é cedo.
 */
export function etapaDoLembreteDeArremate(encerrouEm, agora = Date.now()) {
  if (!encerrouEm) return null; // new Date(null) seria a época zero — e lembraria de tudo
  const t = new Date(encerrouEm).getTime();
  if (!Number.isFinite(t)) return null;
  const horas = (agora - t) / 3600000;
  if (horas >= 24) return '24h';
  if (horas >= 1) return '1h';
  return null;
}
