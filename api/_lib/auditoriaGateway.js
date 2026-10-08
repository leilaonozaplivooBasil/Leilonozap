// 🧾 AUDITORIA DO GATEWAY — os dois lados do extrato, pagamento por pagamento (08/10/2026).
//
// Dono: "quero uma auditoria em todos os depósitos dos últimos 30 dias… listagem e
// conferência com a plataforma; isso é sério e precisa estar tudo batendo".
//
// O que já existia só olhava um lado de cada vez: a conciliação (DIR-195) confere cada
// venda NOSSA no gateway; a varredura (DIR-206) olha o que o gateway recebeu desde
// ontem. Faltava a visão inteira de um período: TUDO que o gateway recebeu no
// intervalo × TUDO que foi pago aqui no mesmo intervalo, com cada pagamento
// classificado numa de sete caixas. Este arquivo é PURO (régua e contas, testável no
// Node); quem lê o gateway e o banco é api/functions/auditoriaGateway.js.
//
// 🔒 SÓ LEITURA. Não cria venda, não credita carteira, não mexe no gateway.
import { situacaoDoPagamento, SITUACOES_DINHEIRO_SAIU } from './conferenciaMercadoPago.js';
import { SITUACOES_COM_DINHEIRO } from './varreduraGateway.js';

/** Teto do período, em dias. Acima disso o gateway devolve páginas demais para uma chamada. */
export const MAX_DIAS = 62;
/** Status de venda que significam "pago aqui" (a mesma lista da conciliação). */
export const PAGOS = Object.freeze(['paid', 'pago', 'entregue', 'shipped', 'delivered', 'preparando', 'saiu_entrega', 'confirmado', 'concluido']);
/** As sete caixas, na ordem em que aparecem no relatório. */
export const CLASSES = Object.freeze(['bate', 'dinheiro_saiu', 'sem_venda', 'pago_la_nao_pago_aqui', 'valor_diferente', 'sem_dinheiro']);

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };
const soma = (a, b) => Math.round((a + b) * 100) / 100;
const DIA_MS = 86400000;
const diaBR = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD
const meiaNoiteBR = (dia) => `${dia}T03:00:00.000Z`; // o horário de verão acabou em 2019; a regra é fixa
const ehDia = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && Number.isFinite(Date.parse(`${s}T12:00:00Z`));

/**
 * O período da auditoria, em dias de Brasília.
 * - `de`/`ate` como 'AAAA-MM-DD': do início de `de` ao fim de `ate` (ou até agora, o que vier antes).
 * - Sem `de`: os últimos `dias` (padrão 30, teto MAX_DIAS) até agora.
 * Nunca lança; entrada inválida cai no padrão.
 */
export function janelaDaAuditoria({ de, ate, dias, agora = Date.now() } = {}) {
  const hoje = diaBR(agora);
  const nDias = Math.min(MAX_DIAS, Math.max(1, parseInt(dias, 10) || 30));
  // "últimos N dias" = N dias de calendário contando hoje
  const padrao = () => Date.parse(meiaNoiteBR(hoje)) - (nDias - 1) * DIA_MS;
  let inicio = ehDia(de) ? Date.parse(meiaNoiteBR(de)) : padrao();
  let fim = agora;
  if (ehDia(ate)) fim = Math.min(agora, Date.parse(meiaNoiteBR(ate)) + DIA_MS - 1);
  if (!(fim > inicio)) { inicio = padrao(); fim = agora; }
  // dias de calendário (Brasília) cobertos, contando o primeiro e o último
  const diasEntre = () => Math.round((Date.parse(meiaNoiteBR(diaBR(fim))) - Date.parse(meiaNoiteBR(diaBR(inicio)))) / DIA_MS) + 1;
  // teto: o período não passa de MAX_DIAS — encurta pelo começo e avisa
  let cortado = false;
  if (diasEntre() > MAX_DIAS) { inicio = Date.parse(meiaNoiteBR(diaBR(fim))) - (MAX_DIAS - 1) * DIA_MS; cortado = true; }
  return { de: new Date(inicio).toISOString(), ate: new Date(fim).toISOString(), dias: diasEntre(), cortado };
}

/** Quanto a venda cobrou de fato: no cartão a taxa vai por fora (raw_base44.amount_charged); no PIX é o total. */
function valorCobrado(venda) {
  const cobrado = num(venda?.amount_charged ?? venda?.raw_base44?.amount_charged);
  return cobrado > 0 ? cobrado : num(venda?.total_amount);
}

/**
 * Cada pagamento do gateway numa caixa, contra as vendas que casaram
 * (por `mp_payment_id` ou por `id` = external_reference do pagamento).
 *   bate                  dinheiro liberado lá, venda paga aqui, mesmo valor
 *   dinheiro_saiu         devolvido / chargeback / disputa / retido / alterado — e existe venda aqui
 *   sem_venda             entrou lá e não há venda aqui (PIX direto na conta, link, maquininha)
 *   pago_la_nao_pago_aqui liberado lá, venda aqui ainda pendente ou cancelada
 *   valor_diferente       liberado lá e pago aqui, mas o valor não é o cobrado
 *   sem_dinheiro          pendente/cancelado lá: nunca entrou (conta, não lista)
 * Puro. Nunca lança.
 */
export function classificarPagamentos(pagamentos = [], vendas = []) {
  const porPagamento = new Map();
  const porVenda = new Map();
  for (const v of Array.isArray(vendas) ? vendas : []) {
    if (!v || !v.id) continue;
    if (v.mp_payment_id) porPagamento.set(String(v.mp_payment_id), v);
    porVenda.set(String(v.id), v);
  }
  const zero = () => ({ n: 0, valor: 0 });
  const totais = {
    pagamentos: 0, com_dinheiro: 0,
    por_classe: Object.fromEntries(CLASSES.map((c) => [c, zero()])),
    por_situacao: {}, por_meio: {},
    bruto_liberado: 0, liquido_liberado: 0, taxas_liberado: 0, saiu: 0,
  };
  const conta = (mapa, chave, valor) => { const k = chave || '?'; mapa[k] = mapa[k] || zero(); mapa[k].n += 1; mapa[k].valor = soma(mapa[k].valor, valor); };
  const linhas = [];
  for (const p of Array.isArray(pagamentos) ? pagamentos : []) {
    if (!p || p.id == null) continue;
    totais.pagamentos += 1;
    const situacao = situacaoDoPagamento(p);
    const valor = num(p.transaction_amount);
    const liquido = num(p.transaction_details?.net_received_amount);
    const taxa = num(Array.isArray(p.fee_details) ? p.fee_details.reduce((s, f) => s + num(f?.amount), 0) : 0);
    const ref = String(p.external_reference || '');
    const venda = porPagamento.get(String(p.id)) || (ref ? porVenda.get(ref) : null) || null;
    const temDinheiro = SITUACOES_COM_DINHEIRO.includes(situacao);
    let classe = 'sem_dinheiro';
    if (temDinheiro) {
      totais.com_dinheiro += 1;
      if (!venda) classe = 'sem_venda';
      else if (SITUACOES_DINHEIRO_SAIU.includes(situacao)) classe = 'dinheiro_saiu';
      else if (!PAGOS.includes(String(venda.status))) classe = 'pago_la_nao_pago_aqui';
      else if (Math.abs(valor - valorCobrado(venda)) > 0.009 && Math.abs(valor - num(venda.total_amount)) > 0.009) classe = 'valor_diferente';
      else classe = 'bate';
      if (situacao === 'liberado') {
        totais.bruto_liberado = soma(totais.bruto_liberado, valor);
        totais.liquido_liberado = soma(totais.liquido_liberado, liquido);
        totais.taxas_liberado = soma(totais.taxas_liberado, taxa);
      } else {
        totais.saiu = soma(totais.saiu, valor);
      }
      conta(totais.por_situacao, situacao, valor);
      conta(totais.por_meio, String(p.payment_method_id || p.payment_type_id || ''), valor);
    }
    conta(totais.por_classe, classe, temDinheiro ? valor : 0);
    linhas.push({
      id: String(p.id), classe, situacao, valor, liquido, taxa,
      quando: p.date_approved || p.date_created || null,
      meio: String(p.payment_method_id || p.payment_type_id || ''),
      pagador: String(p.payer?.first_name || '').trim() || null,
      descricao: String(p.description || '').slice(0, 80) || null,
      referencia: ref || null,
      venda: venda ? { id: venda.id, kind: venda.kind ?? null, status: venda.status ?? null, buyer_name: venda.buyer_name ?? null, total_amount: num(venda.total_amount), cobrado: valorCobrado(venda), created_date: venda.created_date ?? null } : null,
    });
  }
  // mais recente primeiro, para a lista ler como extrato
  linhas.sort((a, b) => String(b.quando || '').localeCompare(String(a.quando || '')));
  return { linhas, totais };
}

/**
 * O outro lado: vendas PAGAS aqui, com pagamento do gateway, cujo pagamento não
 * apareceu na lista do gateway com dinheiro (nem pelo id, nem pela referência).
 * Pode ser pagamento criado antes do período, id trocado, ou dinheiro que nunca entrou.
 * Venda paga com saldo (sem mp_payment_id) fica de fora: não passou pelo gateway.
 */
export function vendasPagasSemPagamento(vendasPagas = [], pagamentos = []) {
  const comDinheiro = (Array.isArray(pagamentos) ? pagamentos : []).filter((p) => p && p.id != null && SITUACOES_COM_DINHEIRO.includes(situacaoDoPagamento(p)));
  const ids = new Set(comDinheiro.map((p) => String(p.id)));
  const refs = new Set(comDinheiro.map((p) => String(p.external_reference || '')).filter(Boolean));
  const fora = [];
  for (const v of Array.isArray(vendasPagas) ? vendasPagas : []) {
    if (!v || !v.id || !v.mp_payment_id) continue;
    if (!PAGOS.includes(String(v.status))) continue;
    if (ids.has(String(v.mp_payment_id)) || refs.has(String(v.id))) continue;
    fora.push({ id: v.id, kind: v.kind ?? null, status: v.status, buyer_name: v.buyer_name ?? null, total_amount: num(v.total_amount), created_date: v.created_date ?? null, mp_payment_id: String(v.mp_payment_id), payment_method: v.payment_method ?? null });
  }
  return fora;
}
