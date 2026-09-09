// 📅 GOOGLE AGENDA — a conexão que não pode atrapalhar (DIR-103, 09/09/2026).
//
// Relato do dono: "a conexão com o Google deve ficar mais fluida, justamente
// para evitar que os usuários tentem agendar reunião e, ao invés de usar a
// conta do Google principal, optem por usar outra. Nesse meio tempo de
// reconexão, dá erro."
//
// ══════════════════════════════════════════════════════════════════════════
// AS CINCO CAUSAS QUE SE SOMAVAM (medidas no CrmMetodo.jsx antes desta peça)
// ══════════════════════════════════════════════════════════════════════════
// 1. O token vivia em `useState` do componente. Trocar de aba, recarregar ou
//    o componente remontar = token perdido = janela do Google DE NOVO. Ele
//    vale ~1 hora; a tela jogava fora em segundos.
// 2. `initTokenClient` era chamado SEM `hint`. Sem dizer qual conta, o Google
//    abre o seletor — e é ali, no meio do agendamento, que a pessoa clica na
//    conta errada. Era a causa direta do que o dono descreveu.
// 3. QUALQUER erro fazia `setGoogleToken(null)`. Um 500 do Google, ou a
//    internet oscilando, jogava fora um token perfeitamente válido e obrigava
//    a nova autorização. Só 401/403 significam "sua autorização acabou".
// 4. O client era recriado a cada chamada, em vez de uma vez só.
// 5. Duas chamadas próximas podiam anexar DOIS `<script>` do Google.
//
// ══════════════════════════════════════════════════════════════════════════
// O QUE MUDA
// ══════════════════════════════════════════════════════════════════════════
// A conta autorizada é LEMBRADA (só o e-mail, no aparelho) e vira o `hint` das
// próximas vezes: o Google vai direto naquela conta, sem seletor. E a primeira
// tentativa é SILENCIOSA — quem já autorizou não vê janela nenhuma.
//
// ⚠️ O TOKEN NUNCA É GUARDADO EM DISCO. Ele vive na memória deste módulo e
// morre quando a aba fecha. O que vai pro localStorage é só o e-mail, que não
// é segredo e é exatamente o que conserta o seletor aparecendo do nada.

const CHAVE_CONTA = 'nz_google_conta';
const ESCOPO = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';

// memória do módulo: sobrevive a remontagem de componente, morre com a aba
let token = null;            // { valor, expiraEm }
let clienteToken = null;     // o tokenClient do GSI, criado UMA vez
let scriptGsi = null;        // a promessa do <script>, reaproveitada
let pendente = null;         // { resolver, rejeitar } da autorização em curso

/** Só pros testes. */
export function _limparEstadoDoGoogle() {
  token = null; clienteToken = null; scriptGsi = null; pendente = null;
}

// ── regra pura (testável sem navegador) ────────────────────────────────────

/**
 * Quando o token expira, com 60s de folga.
 *
 * A folga existe porque a requisição leva tempo: um token que vence em 3
 * segundos passa nesta conta e chega vencido no Google — e aí a pessoa vê um
 * erro que não é dela.
 */
export function expiraEmDe(resposta, agora = Date.now()) {
  const seg = Number(resposta?.expires_in);
  if (!Number.isFinite(seg) || seg <= 0) return agora + 5 * 60 * 1000; // conservador
  return agora + Math.max(0, seg - 60) * 1000;
}

export const tokenAindaVale = (t, agora = Date.now()) => !!t?.valor && Number(t.expiraEm) > agora;

/**
 * Este erro significa "sua autorização acabou", ou só "deu ruim agora"?
 *
 * 🔴 A distinção é o conserto da causa 3. Jogar o token fora num 500 do Google
 * transformava uma falha passageira numa nova janela de autorização — e é na
 * janela que a pessoa erra a conta.
 */
export const ehErroDeAutorizacao = (status) => status === 401 || status === 403;

/** A conta que a pessoa já autorizou neste aparelho. */
export function contaLembrada() {
  try { return localStorage.getItem(CHAVE_CONTA) || null; } catch { return null; }
}

export function lembrarConta(email) {
  try { if (email) localStorage.setItem(CHAVE_CONTA, String(email)); } catch { /* sem storage */ }
}

/** Esquecer a conta: é o "trocar de conta" da tela. */
export function esquecerConta() {
  try { localStorage.removeItem(CHAVE_CONTA); } catch { /* sem storage */ }
  token = null;
}

// ── o navegador ────────────────────────────────────────────────────────────

function carregarGsi() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  // UMA promessa pro script. Sem isto, duas chamadas próximas anexavam dois
  // <script> — causa 5.
  if (!scriptGsi) {
    scriptGsi = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = res;
      s.onerror = () => { scriptGsi = null; rej(new Error('não carregou o script do Google')); };
      document.head.appendChild(s);
    });
  }
  return scriptGsi;
}

async function garantirCliente() {
  if (clienteToken) return clienteToken;
  // import tardio de propósito: sem ele, este arquivo arrastaria o cliente
  // da plataforma inteiro só pra ser lido — e as regras puras aqui de cima
  // deixariam de ser testáveis fora do navegador.
  const { plataforma } = await import('@/api/plataformaClient');
  const r = await plataforma.functions.invoke('getGoogleClientId', {});
  const clientId = r?.clientId;
  if (!clientId) throw new Error('login Google não configurado');
  await carregarGsi();
  if (!window.google?.accounts?.oauth2) throw new Error('Google indisponível neste navegador');

  // O client é criado UMA vez (causa 4); o `prompt` e o `hint` são passados
  // por chamada, no requestAccessToken.
  clienteToken = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: ESCOPO,
    callback: (resp) => {
      const p = pendente; pendente = null;
      if (!p) return;
      if (resp?.access_token) p.resolver(resp); else p.rejeitar(new Error(resp?.error || 'sem autorização'));
    },
    error_callback: (e) => {
      const p = pendente; pendente = null;
      p?.rejeitar(new Error(e?.type === 'popup_closed' ? 'janela do Google fechada' : (e?.message || 'autorização cancelada')));
    },
  });
  return clienteToken;
}

/**
 * Descobre QUAL conta autorizou — sem pedir escopo novo.
 *
 * O id do calendário principal É o e-mail da conta, e a permissão de calendário
 * a gente já tem. Pedir `email`/`profile` só pra saber isso alargaria o consentimento
 * à toa.
 */
async function descobrirConta(valor) {
  try {
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
      headers: { Authorization: `Bearer ${valor}` },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.id || null;
  } catch { return null; }
}

function pedir(cliente, override) {
  return new Promise((resolver, rejeitar) => {
    pendente = { resolver, rejeitar };
    try { cliente.requestAccessToken(override); } catch (e) { pendente = null; rejeitar(e); }
  });
}

/**
 * O token do Google, com o mínimo de atrito possível.
 *
 * A ORDEM É O CONSERTO:
 *   1. token na memória e ainda válido → devolve, sem tocar no Google
 *   2. já sei a conta → tenta SILENCIOSO com `hint` (sem janela, sem seletor)
 *   3. só então abre a janela — e ainda assim já com a conta certa sugerida
 *
 * @param {boolean} [interativo] false = só tenta o silencioso; usado pra
 *        aquecer a conexão ANTES de a pessoa precisar dela.
 */
export async function tokenDoGoogle({ interativo = true } = {}) {
  if (tokenAindaVale(token)) return token.valor;

  const cliente = await garantirCliente();
  const conta = contaLembrada();

  // 2) silencioso: quem já autorizou não vê janela nenhuma
  if (conta) {
    try {
      const resp = await pedir(cliente, { prompt: '', hint: conta });
      token = { valor: resp.access_token, expiraEm: expiraEmDe(resp) };
      return token.valor;
    } catch {
      // consentimento vencido/revogado, ou o Google decidiu perguntar:
      // cai pro interativo abaixo, ainda com a conta certa no `hint`
      if (!interativo) return null;
    }
  }
  if (!interativo) return null;

  // 3) janela — com `hint` quando existe, pra abrir JÁ na conta certa em vez
  //    do seletor onde a pessoa clica na errada
  const resp = await pedir(cliente, conta ? { hint: conta } : {});
  token = { valor: resp.access_token, expiraEm: expiraEmDe(resp) };

  // e a partir de agora este aparelho sabe qual conta é
  const email = await descobrirConta(token.valor);
  if (email) lembrarConta(email);
  return token.valor;
}

/**
 * O erro de uma resposta do Google, COM o status preso nele.
 *
 * Sem isto o status virava texto ("Google respondeu 401") e quem tratava o erro
 * tinha que adivinhar por regex — e adivinhação errada é o que faz um soluço
 * de rede parecer autorização vencida.
 */
export function erroDoGoogle(resp) {
  const e = new Error(`Google respondeu ${resp?.status ?? '?'}`);
  e.status = resp?.status;
  return e;
}

/** O status guardado no erro; `0` quando foi falha de rede (sem resposta). */
export const statusDoErro = (e) => Number(e?.status) || 0;

/**
 * Joga o token fora — SÓ quando o Google disse que a autorização acabou.
 *
 * Chamar isto em erro de rede ou 5xx é o que transformava soluço em nova
 * janela de autorização (causa 3).
 */
export function invalidarTokenSePreciso(status) {
  if (ehErroDeAutorizacao(status)) { token = null; return true; }
  return false;
}
