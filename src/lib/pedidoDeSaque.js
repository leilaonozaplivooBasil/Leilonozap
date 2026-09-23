// 💸 PEDIDO DE SAQUE — a regra da tela, testável sem navegador.
//
// 🔴 POR QUE ISTO EXISTE (23/09/2026 — "Verônica / saque: hoje ninguém consegue sacar")
// O modal do Painel do Vendedor estava quebrado de QUATRO jeitos ao mesmo tempo,
// e nenhum aparecia pra quem clicava — só "Erro ao solicitar saque":
//   1. chamava `requestSellerWithdrawal`, rota que NÃO EXISTE (a real é requestWithdrawal);
//   2. lia `response.data.success` — o cliente da casa devolve o JSON direto, então
//      `data` era sempre undefined e TODA resposta virava erro, até as de sucesso;
//   3. mandava `amount`/`pix_key`; a rota quer `user_id`/`valor` e IGNORA a chave PIX
//      (antifraude: o saque só vai pro PIX do CPF validado no KYC). Os campos de
//      chave eram teatro — a pessoa digitava o telefone e o dinheiro iria pro CPF;
//   4. não olhava o KYC: quem não validou identidade só descobria pela mensagem
//      genérica, sem saber o que fazer.
// E por cima disso tudo, o painel carregava de `getSellerDashboardData`, que
// também não existe — então o botão de saque nem chegava a aparecer.
//
// Esta regra é o que o modal e o painel obedecem. A rota do servidor continua
// sendo a fechadura de verdade (KYC + PIX=CPF + reserva atômica); aqui é só não
// mandar pedido que vai voltar, e traduzir o que voltou.

export const MOTIVOS = Object.freeze({ KYC: 'kyc', VALOR: 'valor', SALDO: 'saldo' });

const num = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const cent = (n) => Math.round(n * 100) / 100;

/**
 * Dá pra pedir? Na ordem em que a pessoa consegue resolver: identidade primeiro
 * (é o que trava tudo), depois o valor, depois o saldo.
 */
export function podePedirSaque({ kycStatus, saldo, valor } = {}) {
  if (kycStatus !== 'aprovado') return { ok: false, motivo: MOTIVOS.KYC };
  const v = cent(num(valor));
  if (v <= 0) return { ok: false, motivo: MOTIVOS.VALOR };
  if (v > cent(num(saldo))) return { ok: false, motivo: MOTIVOS.SALDO };
  return { ok: true, motivo: null, valor: v };
}

/**
 * O que a rota respondeu, traduzido pra tela.
 * Cobre os TRÊS formatos que já circularam: o JSON direto (o de hoje), o
 * `{ data: {...} }` do cliente antigo (que era o que o modal lia), e a resposta
 * de rota inexistente `{ ok:false, error:'not_implemented' }`.
 */
export function lerRespostaDoSaque(r) {
  const corpo = r && typeof r === 'object' && r.data && typeof r.data === 'object' ? r.data : r;
  if (!corpo || typeof corpo !== 'object') {
    return { ok: false, precisaKyc: false, mensagem: 'Sem resposta do servidor. Tente de novo.' };
  }
  if (corpo.error === 'not_implemented') {
    return { ok: false, precisaKyc: false, mensagem: 'O saque está indisponível no momento. Avise o suporte.' };
  }
  if (corpo.success === true) {
    return { ok: true, precisaKyc: false, mensagem: corpo.message || 'Pedido de saque enviado.' };
  }
  return {
    ok: false,
    precisaKyc: corpo.need_kyc === true,
    mensagem: corpo.error || corpo.message || 'Erro ao solicitar saque',
  };
}

/**
 * Um saque no formato que o SellerWithdrawalsHistoryModal lê.
 * getMyWallet devolve `valor/requested_at/status`; o histórico foi escrito pra
 * `amount/created_date/pix_key`. Sem esta tradução a lista aparece em branco —
 * e como o PIX é SEMPRE o CPF (antifraude do servidor), a chave é fixa.
 */
export function saqueParaHistorico(s, i = 0) {
  return {
    id: s?.id || `${s?.requested_at || 'sem-data'}-${i}`,
    amount: cent(num(s?.valor ?? s?.amount)),
    created_date: s?.requested_at || s?.created_date || null,
    status: s?.status || 'pending',
    pix_key: s?.pix_key || 'CPF do titular',
    pix_key_type: 'CPF',
    reject_reason: s?.reject_reason || null,
  };
}

/** O que o painel mostra, a partir do getMyWallet (a rota que EXISTE). */
export function saldoDoPainel(w) {
  const brutos = Array.isArray(w?.withdrawals) ? w.withdrawals : [];
  const saques = brutos.map(saqueParaHistorico);
  const pendentes = saques.filter((s) => s.status === 'pending');
  return {
    kycStatus: w?.kyc_status || 'nao_iniciado',
    cpf: w?.cpf || null,
    // o sacável é a comissão liberada — o mesmo número que a Carteira usa pra sacar
    saldoSacavel: cent(num(w?.commission_balance)),
    emAnalise: cent(pendentes.reduce((s, x) => s + x.amount, 0)),
    saques,
  };
}
