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
/**
 * As caixas, na ordem em que aparecem no relatório.
 *   bate                  dinheiro liberado lá, venda paga aqui, mesmo valor (ou valor + taxa do cartão por fora)
 *   dinheiro_saiu         devolvido / chargeback / disputa / retido / alterado — e existe venda aqui
 *   pago_la_nao_pago_aqui liberado lá, venda aqui ainda pendente ou cancelada
 *   valor_diferente       liberado lá e pago aqui, mas o valor não é o cobrado (nem com a taxa do cartão)
 *   saida_conta           a NOSSA conta pagou alguém (conta de luz, taxa, boleto): dinheiro saindo, não entrando
 *   venda_fora_do_app     entrou pelo Mercado Livre (a mesma conta recebe as vendas de lá): não é depósito
 *   sem_venda             entrou lá e não há venda aqui nem explicação (PIX direto na conta, link, maquininha)
 *   sem_dinheiro          pendente/cancelado lá: nunca entrou (conta, não lista)
 */
export const CLASSES = Object.freeze(['bate', 'dinheiro_saiu', 'pago_la_nao_pago_aqui', 'valor_diferente', 'saida_conta', 'venda_fora_do_app', 'sem_venda', 'sem_dinheiro']);
/** Taxa do cartão em recarga de carteira, cobrada por fora (a mesma de createMPWalletDeposit.js). */
export const TAXA_CARTAO = 0.0499;
/** Caixas em que o dinheiro ENTROU para o aplicativo (as que somam em bruto/líquido/taxas). */
export const ENTRADAS_DO_APP = Object.freeze(['bate', 'pago_la_nao_pago_aqui', 'valor_diferente']);

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
const ehCartao = (p) => ['credit_card', 'debit_card', 'prepaid_card'].includes(String(p?.payment_type_id || '').toLowerCase());
const igual = (a, b) => Math.abs(a - b) <= 0.009;

/** O valor do gateway bate com o que a venda cobrou? (direto, ou total + taxa do cartão quando a venda não guardou o cobrado) */
function valorBate(p, venda) {
  const valor = num(p.transaction_amount);
  const total = num(venda.total_amount);
  if (igual(valor, valorCobrado(venda)) || igual(valor, total)) return { bate: true, taxa_por_fora: !igual(valor, total) };
  if (ehCartao(p) && igual(valor, Math.round(total * (1 + TAXA_CARTAO) * 100) / 100)) return { bate: true, taxa_por_fora: true };
  return { bate: false, taxa_por_fora: false };
}

/**
 * Cada pagamento do gateway numa caixa (ver CLASSES), contra as vendas que casaram
 * (por `mp_payment_id` ou por `id` = external_reference do pagamento).
 * `nossoId` é o id da nossa conta no gateway: pagamento cujo recebedor não somos nós
 * é a conta pagando alguém (saída), não entrada. Puro. Nunca lança.
 */
export function classificarPagamentos(pagamentos = [], vendas = [], { nossoId = null } = {}) {
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
    // só o que entrou PARA O APLICATIVO (bate / pago lá não aqui / valor diferente) e foi liberado
    bruto_liberado: 0, liquido_liberado: 0, taxas_liberado: 0,
    // dinheiro do app que o gateway segurou ou devolveu
    saiu: 0,
    // o que não é do aplicativo: a conta pagando (contas, taxas) e vendas do Mercado Livre
    saidas_conta: 0, vendas_fora_do_app: 0, sem_venda: 0,
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
    const recebedor = p.collector_id != null ? String(p.collector_id) : null;
    const nossa = !nossoId || !recebedor || recebedor === String(nossoId);
    const mercadoLivre = String(p.order?.type || '').toLowerCase() === 'mercadolibre' || String(p.marketplace || '').toUpperCase() === 'MELI';
    let classe = 'sem_dinheiro';
    let taxaPorFora = false;
    if (temDinheiro) {
      totais.com_dinheiro += 1;
      if (venda) {
        if (SITUACOES_DINHEIRO_SAIU.includes(situacao)) classe = 'dinheiro_saiu';
        else if (!PAGOS.includes(String(venda.status))) classe = 'pago_la_nao_pago_aqui';
        else {
          const vb = valorBate(p, venda);
          classe = vb.bate ? 'bate' : 'valor_diferente';
          taxaPorFora = vb.taxa_por_fora;
        }
      } else if (!nossa) classe = 'saida_conta';
      else if (mercadoLivre) classe = 'venda_fora_do_app';
      else classe = 'sem_venda';

      if (ENTRADAS_DO_APP.includes(classe) || classe === 'dinheiro_saiu') {
        if (situacao === 'liberado') {
          totais.bruto_liberado = soma(totais.bruto_liberado, valor);
          totais.liquido_liberado = soma(totais.liquido_liberado, liquido);
          totais.taxas_liberado = soma(totais.taxas_liberado, taxa);
        } else {
          totais.saiu = soma(totais.saiu, valor);
        }
      } else if (classe === 'saida_conta') totais.saidas_conta = soma(totais.saidas_conta, valor);
      else if (classe === 'venda_fora_do_app') totais.vendas_fora_do_app = soma(totais.vendas_fora_do_app, valor);
      else if (classe === 'sem_venda') totais.sem_venda = soma(totais.sem_venda, valor);
      conta(totais.por_situacao, situacao, valor);
      conta(totais.por_meio, String(p.payment_method_id || p.payment_type_id || ''), valor);
    }
    conta(totais.por_classe, classe, temDinheiro ? valor : 0);
    linhas.push({
      id: String(p.id), classe, situacao, valor, liquido, taxa, taxa_por_fora: taxaPorFora,
      quando: p.date_approved || p.date_created || null,
      meio: String(p.payment_method_id || p.payment_type_id || ''),
      tipo: String(p.payment_type_id || ''),
      operacao: String(p.operation_type || '') || null,
      recebedor, pagador_id: p.payer?.id != null ? String(p.payer.id) : null,
      pagador: String(p.payer?.first_name || '').trim() || null,
      descricao: String(p.description || '').slice(0, 80) || null,
      referencia: ref || null,
      pedido: p.order?.id != null ? { tipo: String(p.order.type || ''), id: String(p.order.id) } : null,
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
