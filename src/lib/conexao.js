// conexao — prova REAL de conexão (DIR-35, 01/09/2026). O `navigator.onLine`
// do navegador mente (VPN, proxy, troca de adaptador) e já trancou o app na
// tela "Sem conexão" com a rede funcionando. Aqui a regra é: offline só se
// declara com PROVA — uma busca no PRÓPRIO domínio que acabou de servir a
// página. `/version.json` existe em todo deploy (carimbo do build), pesa
// bytes e tem `Cache-Control: no-store` no vercel.json.
export const URL_PROVA_CONEXAO = '/version.json';

/**
 * Prova a conexão buscando /version.json no próprio domínio.
 * Mesma origem de propósito: sem CORS, sem DNS extra, sem depender de outro
 * site — se ESTA origem responder, o app tem tudo de que precisa pra viver.
 * @param fetchImpl injetável pra teste; em produção é o fetch do navegador
 * @returns true se a rede respondeu (qualquer status), false se a busca falhou
 */
export async function provarConexao(fetchImpl = globalThis.fetch) {
  try {
    // 8s de teto: conexão "buraco negro" (portal cativo, proxy morto) não pode
    // deixar o botão "Tentar novamente" pendurado pra sempre.
    const sinal = (typeof AbortSignal !== 'undefined' && AbortSignal.timeout)
      ? AbortSignal.timeout(8000)
      : undefined;
    await fetchImpl(`${URL_PROVA_CONEXAO}?t=${Date.now()}`, { cache: 'no-store', signal: sinal });
    return true;
  } catch {
    return false;
  }
}
