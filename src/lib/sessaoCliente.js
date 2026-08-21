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
