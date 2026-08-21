// sessao — CRACHÁ ASSINADO DO USUÁRIO (21/08/2026, autorizado pelo dono).
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE ESTE ARQUIVO EXISTE
// ══════════════════════════════════════════════════════════════════════════════
// Até hoje NENHUMA rota deste projeto tinha autenticação. Nenhuma. O login
// conferia a senha (bcrypt) ou o token do Google, devolvia o usuário, e o
// navegador guardava em localStorage.currentUser. Daí em diante toda chamada
// mandava só o `user_id` no CORPO da requisição — e o servidor acreditava.
//
// O que isso permitia, sem senha, direto do navegador, para quem soubesse o id
// de outra pessoa (e os ids voltam nas respostas normais da API — autor de
// mensagem no chat do leilão, vencedor, indicador):
//   • dar lance no lugar dela, gastando o saldo dela      (submitAtomicBid)
//   • comprar com o saldo dela                            (payWithBalance)
//   • pedir saque no lugar dela                           (requestWithdrawal)
//   • cancelar/apagar leilão e produto com o id de um admin (entityWrite)
//
// A auditoria de 20/08 apontou isso dentro do risco #03. O buraco específico
// (gasto duplo) foi fechado; a PORTA continuou sem fechadura. Este arquivo é a
// fechadura.
//
// ══════════════════════════════════════════════════════════════════════════════
// COMO FUNCIONA
// ══════════════════════════════════════════════════════════════════════════════
// No login o servidor emite um CRACHÁ: um texto com o id da pessoa e a validade,
// assinado com uma chave que só o servidor conhece (HMAC-SHA256). O navegador
// guarda e manda esse crachá em toda chamada, no cabeçalho `x-sessao`.
//
// O crachá NÃO é segredo e NÃO precisa ser guardado em lugar nenhum do servidor:
// ele se prova sozinho. Mexeu um caractere, a assinatura não fecha. Não dá pra
// fabricar um crachá para outro id sem ter a chave.
//
// ⚠️ O QUE ELE NÃO RESOLVE: quem roubar o crachá de alguém (malware na máquina,
// extensão maliciosa) age como aquela pessoa até a validade acabar. É a mesma
// limitação de qualquer cookie de sessão do mundo. O que ele resolve é o que
// existe hoje: qualquer um agir como qualquer um só sabendo o id.
//
// ══════════════════════════════════════════════════════════════════════════════
// LIGAÇÃO EM DUAS ETAPAS — igual ao webhook do Mercado Pago (deu certo hoje)
// ══════════════════════════════════════════════════════════════════════════════
//   etapa 1 (agora): as rotas CONFEREM e ANOTAM no log quem chamou sem crachá.
//                    Nada é recusado. Serve pra ver, com tráfego real, se sobrou
//                    alguma tela do site que ainda não manda o crachá.
//   etapa 2 (depois): publicar SESSAO_MODO=bloquear na Vercel. Aí chamada sem
//                    crachá válido vira 401.
//
// Ligar direto seria repetir o erro que eu quase cometi no webhook: derrubar o
// site inteiro por causa de uma tela esquecida.
//
// ⚠️ IMPORT: este arquivo vive em api/_lib/. Rotas que JÁ importam de ../_lib/
// podem importá-lo. As rotas de LANCE são autocontidas por lei (import de 2
// níveis já derrubou o lance em produção — ver o cabeçalho de submitAtomicBid.js):
// lá a conferência é feita inline, com uma cópia curta desta mesma lógica.
import crypto from 'crypto';

/** Nome do cabeçalho onde o crachá viaja. */
export const SESSAO_HEADER = 'x-sessao';

/** Validade padrão: 30 dias. Depois disso a pessoa faz login de novo. */
const HORAS_VALIDADE = 24 * 30;

// A chave de assinatura. SESSAO_SECRET é o lugar certo; sem ela, cai na chave de
// serviço do Supabase — que já é secreta e só existe no servidor — pra que a
// proteção funcione desde o primeiro deploy, sem depender de configuração nova.
// O prefixo 'sessao-v1|' separa o uso: mesmo compartilhando a chave, a assinatura
// de sessão nunca colide com nenhum outro uso dela.
// ⚠️ Trocar a chave (publicar SESSAO_SECRET depois) invalida os crachás emitidos:
// todo mundo é deslogado uma vez e faz login de novo. Nada além disso.
function chave() {
  return process.env.SESSAO_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function assinar(texto) {
  return b64url(crypto.createHmac('sha256', chave()).update(`sessao-v1|${texto}`).digest());
}

/**
 * Emite o crachá de quem acabou de entrar. Chamado pelas rotas de login/cadastro.
 * @param {string} userId
 * @returns {string|null} o crachá, ou null se não há chave (aí o login segue sem).
 */
export function emitirSessao(userId) {
  const uid = String(userId || '').trim();
  if (!uid || !chave()) return null;
  const corpo = b64url(JSON.stringify({ u: uid, x: Date.now() + HORAS_VALIDADE * 3600 * 1000 }));
  return `v1.${corpo}.${assinar(corpo)}`;
}

/**
 * Confere o crachá que veio na requisição.
 * @returns {{ok: boolean, userId: string|null, motivo: string}}
 *   ok=true  → crachá válido, userId é de quem realmente está chamando
 *   ok=false → motivo diz o porquê ('sem_cracha', 'formato', 'assinatura', 'vencido')
 */
export function conferirSessao(req) {
  try {
    if (!chave()) return { ok: false, userId: null, motivo: 'sem_chave_no_servidor' };
    const h = req?.headers;
    const bruto = h
      ? (typeof h.get === 'function' ? h.get(SESSAO_HEADER) : (h[SESSAO_HEADER] || h[SESSAO_HEADER.toUpperCase()]))
      : '';
    const cracha = String(bruto || '').trim();
    if (!cracha) return { ok: false, userId: null, motivo: 'sem_cracha' };

    const partes = cracha.split('.');
    if (partes.length !== 3 || partes[0] !== 'v1') return { ok: false, userId: null, motivo: 'formato' };

    // Comparação em tempo constante: tamanhos diferentes explodiriam timingSafeEqual.
    const esperado = Buffer.from(assinar(partes[1]), 'utf8');
    const veio = Buffer.from(partes[2], 'utf8');
    if (esperado.length !== veio.length || !crypto.timingSafeEqual(esperado, veio)) {
      return { ok: false, userId: null, motivo: 'assinatura' };
    }

    const dados = JSON.parse(deB64url(partes[1]).toString('utf8'));
    if (!dados?.u) return { ok: false, userId: null, motivo: 'formato' };
    if (!(Number(dados.x) > Date.now())) return { ok: false, userId: String(dados.u), motivo: 'vencido' };
    return { ok: true, userId: String(dados.u), motivo: 'ok' };
  } catch (e) {
    return { ok: false, userId: null, motivo: `erro:${e?.message}` };
  }
}

/**
 * A trava que as rotas usam. Em ETAPA 1 (padrão) só anota no log; em ETAPA 2
 * (SESSAO_MODO=bloquear) recusa de verdade.
 *
 * @param req            a requisição
 * @param idDoCorpo      o user_id/actorId que a rota leu do corpo, para comparar
 * @param rota           nome da rota, só pro log
 * @param {boolean} [permitirAdmin] se true, um crachá de OUTRA pessoa não é
 *        recusado quando a rota já faz a própria checagem de admin (entityWrite).
 * @returns {{liberado: boolean, userId: string|null, motivo: string, http: number}}
 */
export function exigirSessao(req, idDoCorpo, rota, permitirAdmin = false) {
  const bloqueia = String(process.env.SESSAO_MODO || '').toLowerCase() === 'bloquear';
  const s = conferirSessao(req);
  const alvo = String(idDoCorpo || '').trim();

  let motivo = s.motivo;
  let bate = s.ok;
  if (s.ok && alvo && s.userId !== alvo && !permitirAdmin) {
    bate = false;
    motivo = 'cracha_de_outra_pessoa';
  }

  if (bate) return { liberado: true, userId: s.userId, motivo: 'ok', http: 200 };

  if (!bloqueia) {
    console.warn(`[SESSAO] ${rota}: chamada SEM crachá válido (${motivo}) para o id ${alvo || '?'} — ETAPA 1, nada foi bloqueado.`);
    return { liberado: true, userId: s.userId, motivo, http: 200 };
  }
  console.error(`[SESSAO] ${rota}: RECUSADA (${motivo}) para o id ${alvo || '?'}.`);
  return { liberado: false, userId: null, motivo, http: 401 };
}
