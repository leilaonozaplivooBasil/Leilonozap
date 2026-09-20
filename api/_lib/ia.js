// 🤖 O ACESSO À IA — um lugar só (DIR-84.2 → 84.5).
//
// Toda rota que fala com o Claude passa por aqui: qual chave existe, por
// onde ir, e como transformar um erro do SDK em algo que a tela e o log
// entendem. Nasceu no validador da X-Game (xgameValidarPrint) e virou
// compartilhado quando o InvokeLLM (9 telas) precisou do mesmo caminho —
// duplicar isto seria plantar o próximo "erro escondido".
//
// DOIS CAMINHOS, escolhidos pela chave que existir (sem redeploy):
//   1. ANTHROPIC_API_KEY (env ou cofre `anthropic_api_key`) → api.anthropic.com
//      direto. Prioridade quando existe. Modelos SEM prefixo (claude-opus-5).
//   2. AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN (env ou cofre `ai_gateway_key`)
//      → AI Gateway da Vercel, que fala a Messages API da Anthropic
//      (baseURL ai-gateway.vercel.sh, caminho documentado pela Vercel).
//      Modelos COM prefixo (anthropic/claude-opus-5). Exige crédito PAGO no
//      gateway — no free tier o Claude devolve 403 (achado de 07/09).
//      Aceita um modelo reserva do próprio gateway.
import Anthropic from '@anthropic-ai/sdk';
import { segredo } from './cofre.js';

export const GATEWAY = 'https://ai-gateway.vercel.sh';

// cache de 5 min das chaves do cofre: não bater no banco a cada chamada
let _cacheCofre = { valor: null, ate: 0 };
async function chavesDoCofre() {
  if (_cacheCofre.ate > Date.now()) return _cacheCofre.valor;
  const [anthropic, gateway] = await Promise.all([segredo('anthropic_api_key'), segredo('ai_gateway_key')]);
  _cacheCofre = { valor: { anthropic_api_key: anthropic || '', ai_gateway_key: gateway || '' }, ate: Date.now() + 5 * 60 * 1000 };
  return _cacheCofre.valor;
}

/**
 * Qual IA usar agora.
 * @param {{modelDireto:string, modelGateway:string, reserva?:string|null}} modelos
 * @returns {Promise<{via:'anthropic'|'gateway', apiKey:string, model:string, reserva:string|null}|null>} null = sem chave nenhuma
 */
export async function resolverIA({ modelDireto, modelGateway, reserva = null }) {
  const env = process.env;
  let anthropic = env.ANTHROPIC_API_KEY || '';
  let gateway = env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN || '';
  if (!anthropic && !gateway) {
    const cofre = await chavesDoCofre();
    anthropic = cofre.anthropic_api_key;
    gateway = cofre.ai_gateway_key;
  }
  if (anthropic) return { via: 'anthropic', apiKey: anthropic, model: modelDireto, reserva: null };
  if (gateway) return { via: 'gateway', apiKey: gateway, model: modelGateway, reserva: reserva || null };
  return null;
}

/** O cliente do SDK oficial, já apontado pro caminho certo. */
export function clienteIA(ia, { timeout = 40_000, maxRetries = 1 } = {}) {
  // maxRetries 1: o SDK já refaz 429/5xx/queda de rede uma vez; mais que isso
  // estoura o tempo da função com a pessoa esperando.
  return new Anthropic({ apiKey: ia.apiKey, ...(ia.via === 'gateway' ? { baseURL: GATEWAY } : {}), timeout, maxRetries });
}

/** Extensão do AI Gateway: se o modelo principal falhar, ele tenta o reserva. Vazio fora do gateway. */
export function opcoesDeReserva(ia) {
  return ia?.via === 'gateway' && ia.reserva ? { providerOptions: { gateway: { models: [ia.reserva] } } } : {};
}

// 🚨 DIR-146 (14/09/2026) — INCIDENTE: o gateway ficou em $0,00 de crédito
// sem NINGUÉM saber até a validação começar a falhar de verdade, de manhã
// cedo. Dono, ao vivo: "o crédito quando estiver acabando precisa ter um
// aviso, pra não ocorrer mais isso." Abaixo deste valor (dólares), o ADM
// mostra aviso — dá tempo de recarregar (vercel.com/.../ai?modal=top-up)
// antes de virar 402 de verdade pra alguém validando às 5h da manhã.
export const SALDO_BAIXO_USD = Number(process.env.AI_GATEWAY_SALDO_BAIXO_USD) || 10;

/**
 * O saldo de crédito do AI Gateway, em dólares — `null` quando não dá pra
 * saber (fora do gateway, ou a própria checagem de saldo falhou: aí o ADM
 * mostra "não consegui checar" em vez de inventar um número).
 * GET /v1/credits documentado pela Vercel: {balance, total_used}.
 */
export async function saldoGateway(ia) {
  if (ia?.via !== 'gateway') return null;
  try {
    const r = await fetch(`${GATEWAY}/v1/credits`, { headers: { Authorization: `Bearer ${ia.apiKey}` } });
    if (!r.ok) return null;
    const j = await r.json();
    const saldo = Number(j?.balance);
    return Number.isFinite(saldo) ? saldo : null;
  } catch {
    return null;
  }
}

/**
 * O erro do SDK em `details` legível — e o motivo certo: 404 é modelo que não
 * existe (foi o caso do gemini), 401 é chave, 403 é permissão/plano (free
 * tier do gateway), 429 é limite, 5xx/529 é a IA fora, rede é rede.
 */
// 🔴 O CORTE EM 400 ESCONDIA O DIAGNÓSTICO (19/09/2026).
//
// Um membro da equipe ficou 3 dias sem conseguir comprovar tarefa. O log dizia:
//   status: 400, tipo: 'AI_APICallError',
//   mensagem: '400 {"error":{...},"providerMetadata":{"gateway":{"routing":{...
// e PARAVA AÍ — exatamente onde começaria o motivo. O corte de 400 caracteres
// consumia o envelope do gateway inteiro e deixava de fora a mensagem do
// provedor, que é a única parte que diz o que está errado.
//
// 1200 dá folga para o envelope + o motivo. Não é ilimitado de propósito:
// isto vai para o log da Vercel e para `details` na resposta.
const TETO_DA_MENSAGEM = 1200;

export function detalhesDoErro(e) {
  if (e instanceof Anthropic.APIConnectionError) return { status: 0, tipo: 'rede', mensagem: String(e.message || '').slice(0, TETO_DA_MENSAGEM) };
  if (e instanceof Anthropic.APIError) return { status: e.status ?? 0, tipo: e.type || e.name || 'api', mensagem: String(e.message || '').slice(0, TETO_DA_MENSAGEM) };
  return { status: 0, tipo: 'desconhecido', mensagem: String(e?.message || e).slice(0, TETO_DA_MENSAGEM) };
}

export { Anthropic };
