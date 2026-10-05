/**
 * sessaoCliente — o crachá de sessão do lado do navegador.
 *
 * 🔴 POR QUE ESTE ARQUIVO EXISTE (21/08/2026)
 * Quando o crachá foi criado, eu escrevi que "todas as chamadas do site passam
 * por invokeFunction, então a mudança é só num lugar". ESTAVA ERRADO, e o log de
 * produção provou em minutos: 9 mil linhas de `[SESSAO] entityWrite: chamada SEM
 * crachá válido`.
 *
 * Existem SEIS chamadas que falam com /api/functions/ direto, sem passar pelo
 * invokeFunction — entre elas o entityWrite, que é justamente a rota por onde
 * TODA escrita de admin e de estoque passa. Ou seja: a rota mais sensível do
 * conjunto era a que ficava de fora.
 *
 * Agora o crachá mora aqui, num lugar só, e todo mundo importa daqui. Se
 * amanhã aparecer uma sétima chamada direta, ela também importa daqui.
 *
 * Toda leitura e escrita é protegida: navegador anônimo, modo privativo ou
 * storage bloqueado não podem derrubar chamada nenhuma.
 */
export const CHAVE_SESSAO = 'sessaoToken';

/** Lê o crachá guardado. Devolve '' quando não há (ou quando o storage falha). */
export function lerCracha() {
  try { return localStorage.getItem(CHAVE_SESSAO) || ''; } catch { return ''; }
}

/** Guarda o crachá devolvido por qualquer rota de login/cadastro. */
export function guardarCracha(t) {
  try { if (t) localStorage.setItem(CHAVE_SESSAO, t); } catch { /* sem storage: segue sem crachá */ }
}

/** Apaga o crachá (usado no logout). */
export function apagarCracha() {
  try { localStorage.removeItem(CHAVE_SESSAO); } catch { /* nada a fazer */ }
}

/**
 * Devolve os cabeçalhos com o crachá junto. Use em TODA chamada a
 * /api/functions/*, inclusive nas que usam fetch direto.
 *   fetch(url, { headers: cabecalhosSessao({ 'Content-Type': 'application/json' }) })
 */
export function cabecalhosSessao(base = {}) {
  const c = lerCracha();
  return c ? { ...base, 'x-sessao': c } : { ...base };
}

/**
 * 🔴 26/09/2026 — "SUA SESSÃO EXPIROU" NA HORA DO LANCE (chamado do Paim, cliente Lilian).
 *
 * O crachá vale 30 dias (api/_lib/sessao.js). Quem se cadastrou e nunca mais
 * fez login continua "logado" pelo localStorage.currentUser, que não vence —
 * mas o crachá venceu. Resultado: a pessoa deposita (rota ainda em observação),
 * entra na sala, e SÓ na cotação do frete descobre que precisa entrar de novo.
 * Esta função lê a validade que está DENTRO do crachá (campo `x`), sem chamar
 * o servidor, para o site avisar antes e oferecer o botão "Entrar de novo".
 *
 * @returns {'ok'|'sem_cracha'|'formato'|'vencido'}
 */
export function situacaoDoCracha(cracha = lerCracha(), agora = Date.now()) {
  const c = String(cracha || '');
  if (!c) return 'sem_cracha';
  const partes = c.split('.');
  if (partes.length !== 3 || partes[0] !== 'v1') return 'formato';
  try {
    const b64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function'
      ? decodeURIComponent(Array.from(atob(b64), (ch) => '%' + ch.charCodeAt(0).toString(16).padStart(2, '0')).join(''))
      : Buffer.from(b64, 'base64').toString('utf8');
    const dados = JSON.parse(json);
    if (!dados?.u) return 'formato';
    return Number(dados.x) > agora ? 'ok' : 'vencido';
  } catch {
    return 'formato';
  }
}

/** Marca que o próximo login é uma RENOVAÇÃO de sessão: a tela recarrega ao entrar. */
export const CHAVE_RELOGIN = 'nz_relogin';

/**
 * Sessão vencida → sai da conta local e abre o modal de login, na mesma tela.
 * Não redireciona: a pessoa entra de novo e volta exatamente onde estava.
 */
export function pedirNovoLogin() {
  apagarCracha();
  try {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.setItem(CHAVE_RELOGIN, '1');
  } catch { /* sem storage: só abre o login */ }
  try { window.dispatchEvent(new CustomEvent('openLoginModal')); } catch { /* fora do navegador */ }
}
