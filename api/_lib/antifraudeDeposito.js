// 🛡️ ANTIFRAUDE DE DEPÓSITO — a espera antes do crédito (08/10/2026, DIR-211)
//
// Dono (item 6 das oito automações): "depósito grande de conta nova, ou vários PIX
// seguidos, entram em espera de 1 hora com aviso para a Beatriz aprovar".
//
// Caso que provou (Diogo, 02/10): 4 PIX aprovados à tarde, R$ 3.300 creditados na
// hora, "cancelamento de liberação de dinheiro" no gateway 2 horas depois. O bloqueio
// da DIR-198 recuperou só o que ainda não tinha virado lance. A espera dá tempo para
// o gateway se manifestar ANTES de o dinheiro virar lance.
//
// Como funciona:
//   • o mpWebhook, com o pagamento aprovado e a venda ainda 'pending_payment', pede
//     aqui a avaliação (avaliarDeposito). Com motivo, grava antifraude_* na venda e
//     responde 200 "em_espera" — sem virar 'paid', sem creditar, sem 10% de indicação,
//     sem cupom, sem e-mail de "depósito confirmado". O gateway para de reenviar.
//   • quem libera é o PRÓPRIO webhook, chamado de dentro (x-interno): pela Beatriz
//     (Painel do Investidor → Conciliação → "Liberar agora"), pelo cron da conciliação
//     (*/30, só o motivo que libera sozinho) ou pelo poll da tela de pagamento.
//   • "Devolver pelo Mercado Pago" num depósito em espera grava a decisão 'recusado'
//     e devolve pelo gateway; o aviso 'refunded' do gateway cancela a venda.
//
// As duas regras (medidas em 60 dias de depósitos pagos, 110 no total):
//   R1 conta_nova_valor_alto — conta criada há menos de 24h E valor ≥ R$ 1.000.
//      5 casos/60d. Só sai da espera com decisão humana (a Beatriz é lembrada 1x/dia).
//   R2 sequencia_de_depositos — 3º ou mais depósito da mesma pessoa (mesmo buyer_id ou
//      mesmo CPF em outra conta) em 24h, com a soma das 24h ≥ R$ 1.000, e a pessoa
//      ainda sem histórico (menos de 3 depósitos pagos há mais de 7 dias, ou algum
//      contestado). Sem o piso de valor e sem a isenção de veterano a regra pegava 23
//      depósitos/60d, quase todos lances de quem recarrega R$ 100 em leilão ao vivo
//      (um só cliente responde por 11). Com elas: ~10/60d, e os dois PIX do Diogo
//      entre eles. Libera sozinha aos 60 min se ninguém decidir.
//   A espera é contada do ÚLTIMO depósito suspeito da pessoa: cada novo reinicia os
//   que ainda esperam.
//
// Falha ABERTA de propósito: se não der para ler o contexto do comprador, o depósito
// segue o caminho de sempre (console.error no webhook). Um soluço do banco não pode
// prender dinheiro de cliente; a conciliação/bloqueio da DIR-198 continuam de rede.
//
// Este arquivo tem duas metades: a de cima é pura (os testes leem); a de baixo fala
// com o banco e com o próprio webhook, sempre por `sb`/`fetch` passados ou do ambiente.
import { SITUACOES_DINHEIRO_SAIU } from './conferenciaMercadoPago.js';

export const VALOR_ALTO = 1000;
export const CONTA_NOVA_H = 24;
export const SEQUENCIA_N = 3;
export const SEQUENCIA_JANELA_H = 24;
export const SEQUENCIA_SOMA_MIN = 1000;
export const VETERANO_DEPOSITOS = 3;
export const VETERANO_DIAS = 7;
export const ESPERA_MIN = 60;
export const MOTIVOS = Object.freeze({ CONTA_NOVA: 'conta_nova_valor_alto', SEQUENCIA: 'sequencia_de_depositos', GATEWAY: 'dinheiro_saiu_no_gateway' });
/** Motivos que liberam sozinhos quando a espera vence. Os outros só com decisão humana. */
export const AUTO_LIBERA_MOTIVOS = Object.freeze([MOTIVOS.SEQUENCIA]);
export const DECISOES = Object.freeze(['liberado', 'auto', 'recusado']);
export const DECISOES_QUE_LIBERAM = Object.freeze(['liberado', 'auto']);
/** Os kinds que viram saldo de lance/compra: depósito comum, Passaporte (mesma carteira + cupom) e carteira de comissões. */
export const KINDS_DE_DEPOSITO = Object.freeze(['wallet_deposit', 'passaporte', 'commission_deposit']);
/** Status em que um depósito aprovado ainda pode ser segurado: pendente, ou QR cancelado pelo cliente e pago tarde (PONTO 121). */
export const STATUS_SEGURAVEIS = Object.freeze(['pending_payment', 'canceled', 'cancelado', 'cancelled']);
const KINDS = KINDS_DE_DEPOSITO.join(',');
const STATUS = STATUS_SEGURAVEIS.join(',');
/** Zumbi: QR cancelado cuja devolução no gateway já aconteceu — não há mais o que decidir nem liberar. */
const SEM_ZUMBI = '&or=(status.eq.pending_payment,gateway->>situacao.is.null,gateway->>situacao.not.in.(devolvido,devolvido_parcial,chargeback))';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const enc = (v) => encodeURIComponent(String(v));
export const soDigitos = (s) => String(s || '').replace(/\D+/g, '');
export const reais = (n) => 'R$ ' + round2(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const horaBR = (iso) => {
  const d = new Date(iso); if (!iso || Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(d);
};

export const liberaSozinho = (motivo) => AUTO_LIBERA_MOTIVOS.includes(String(motivo || ''));
/** O gateway já disse que o dinheiro deste pagamento saiu (retido/devolvido/contestado/alterado)? Lê catalog_sales.gateway. */
export const dinheiroSaiu = (sale) => SITUACOES_DINHEIRO_SAIU.includes(String(sale?.gateway?.situacao || ''));

/** ISO do fim da espera. */
export function esperaAte(agora = Date.now(), minutos = ESPERA_MIN) {
  return new Date(agora + minutos * 60000).toISOString();
}

/** "conta criada há 2h com depósito de R$ 1.500" / "3º depósito em 24h (soma R$ 2.800)" */
export function rotuloDoMotivo(motivo, det = {}) {
  if (motivo === MOTIVOS.CONTA_NOVA) {
    const h = Number(det?.conta_horas);
    const n = Number(det?.depositos_24h) || 1;
    return `conta criada há ${Number.isFinite(h) ? (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${Math.round(h)}h`) : 'menos de 24h'} com ${n > 1 ? `${reais(det?.soma_24h)} em ${n} depósitos` : `depósito de ${reais(det?.valor)}`}`;
  }
  if (motivo === MOTIVOS.SEQUENCIA) {
    const n = Number(det?.depositos_24h) || SEQUENCIA_N;
    return `${n}º depósito em 24h (soma ${reais(det?.soma_24h)})`;
  }
  if (motivo === MOTIVOS.GATEWAY) return `o gateway já marcou o pagamento como ${det?.situacao || 'retido'}`;
  return String(motivo || 'em conferência');
}

/**
 * A régua. Pura: recebe o que foi lido do banco e diz se há motivo para esperar.
 * @param {object} p
 * @param {object} p.sale               a venda (total_amount, id)
 * @param {object|null} p.comprador     app_users do comprador (created_date/created_at)
 * @param {string[]} [p.contas]         ids da mesma pessoa (buyer_id + mesmo CPF)
 * @param {object[]} [p.depositosRecentes]  depósitos pagos-ou-em-espera dessas contas nas últimas 24h (pode incluir a própria venda)
 * @param {object[]} [p.depositosAntigos]   depósitos pagos dessas contas há mais de 7 dias (com gateway)
 * @returns {{motivo: string|null, detalhes: object}}
 */
export function avaliarDeposito({ sale, comprador = null, contas = [], depositosRecentes = [], depositosAntigos = [], agora = Date.now() } = {}) {
  const valor = round2(Number(sale?.total_amount ?? sale?.sale_price) || 0);
  const t = comprador ? new Date(comprador.created_date || comprador.created_at || NaN).getTime() : NaN;
  const contaHoras = Number.isFinite(t) ? Math.max(0, (agora - t) / 3600000) : null;
  const recentes = (Array.isArray(depositosRecentes) ? depositosRecentes : []).filter((d) => d && d.id !== sale?.id && d.antifraude_decisao !== 'recusado');
  const soma = round2(recentes.reduce((s, d) => s + (Number(d.total_amount) || 0), 0) + valor);
  const antigos = Array.isArray(depositosAntigos) ? depositosAntigos : [];
  const contestados = antigos.filter((d) => SITUACOES_DINHEIRO_SAIU.includes(String(d?.gateway?.situacao || ''))).length;
  const veterano = antigos.length >= VETERANO_DEPOSITOS && contestados === 0;
  const detalhes = {
    valor, conta_horas: contaHoras == null ? null : Math.round(contaHoras * 10) / 10,
    depositos_24h: recentes.length + 1, soma_24h: soma,
    veterano, depositos_antigos: antigos.length, contestados, contas: Math.max(1, (contas || []).length),
  };
  let motivo = null;
  // o gateway já disse que o dinheiro saiu (approved, mas money_release_status revertido): nunca credita sozinho
  if (dinheiroSaiu(sale)) { motivo = MOTIVOS.GATEWAY; detalhes.situacao = String(sale.gateway.situacao); }
  else if (contaHoras !== null && contaHoras < CONTA_NOVA_H && (valor >= VALOR_ALTO || (recentes.length + 1 < SEQUENCIA_N && soma >= VALOR_ALTO))) motivo = MOTIVOS.CONTA_NOVA;
  else if (!veterano && recentes.length + 1 >= SEQUENCIA_N && soma >= SEQUENCIA_SOMA_MIN) motivo = MOTIVOS.SEQUENCIA;
  return { motivo, detalhes };
}

/**
 * O que o webhook faz com uma venda 'pending_payment' aprovada no gateway.
 *   'avaliar'      — nunca passou por aqui: rodar avaliarDeposito
 *   'passar'       — decisão 'liberado' ou 'auto': virar 'paid' e creditar
 *   'segurar'      — em espera (prazo não venceu, ou motivo que só humano libera)
 *   'auto_liberar' — prazo venceu e o motivo libera sozinho: gravar 'auto' e passar
 *   'recusado'     — a Beatriz mandou devolver: não creditar nunca
 *   'retido'       — o gateway já diz que o dinheiro saiu (retido/devolvido/contestado):
 *                    não credita nem com decisão de liberar; só humano, olhando o gateway
 */
export function decisaoDoPortao(sale, agora = Date.now()) {
  if (!sale?.antifraude_espera_ate) return 'avaliar';
  const dec = sale.antifraude_decisao;
  if (dec === 'recusado') return 'recusado';
  if (dinheiroSaiu(sale)) return 'retido';
  if (DECISOES_QUE_LIBERAM.includes(dec)) return 'passar';
  const fim = new Date(sale.antifraude_espera_ate).getTime();
  if (Number.isFinite(fim) && agora >= fim && liberaSozinho(sale.antifraude_motivo)) return 'auto_liberar';
  return 'segurar';
}

/** Extrato da Carteira: 'em_analise' enquanto espera (ou recusado), 'pending' quando é só QR não pago. */
export function statusNoExtrato(sale) {
  if (sale?.status !== 'pending_payment') return null;
  if (sale.antifraude_espera_ate) return 'em_analise';
  return 'pending';
}

// ── textos para o administrador (WhatsApp) ──────────────────────────────────
const meio = (sale) => (String(sale?.payment_method || '').includes('card') ? 'cartão' : 'PIX');

export function textoParaAdmin(sale, avaliacao, esperaAteISO) {
  const auto = liberaSozinho(avaliacao?.motivo);
  return `🟡 *Depósito em conferência (antifraude)*\n\n${sale?.buyer_name || 'Cliente'} · ${reais(sale?.total_amount)} · ${meio(sale)}\n`
    + `Motivo: ${rotuloDoMotivo(avaliacao?.motivo, avaliacao?.detalhes)}.\n`
    + (auto ? `Entra na Carteira sozinho às ${horaBR(esperaAteISO)} se ninguém decidir antes.\n` : 'Só entra na Carteira com a sua decisão.\n')
    + '\nDecidir: Painel do Investidor → Conciliação → "Liberar agora" ou "Devolver pelo Mercado Pago".';
}

export function textoLembreteAdmin(sale) {
  return `🟡 *Depósito ainda em conferência*\n\n${sale?.buyer_name || 'Cliente'} · ${reais(sale?.total_amount)} · ${meio(sale)} · desde ${horaBR(sale?.antifraude_avaliado_em || sale?.created_date)}\n`
    + `Motivo: ${rotuloDoMotivo(sale?.antifraude_motivo, sale?.antifraude_detalhes)}. Só entra na Carteira com a sua decisão.\n`
    + '\nDecidir: Painel do Investidor → Conciliação.';
}

// ── a metade que fala com o banco ───────────────────────────────────────────
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilaonozap.net';

/** Cabeçalhos de uma chamada interna ao webhook (o próprio servidor liberando). */
export function cabecalhosInternos() {
  const h = { 'Content-Type': 'application/json' };
  if (process.env.CRON_SECRET) h['x-interno'] = `Bearer ${process.env.CRON_SECRET}`;
  return h;
}

/** Re-dispara o webhook para um pagamento, por dentro. Devolve o JSON da resposta (+ http). Nunca lança. */
export async function dispararWebhookInterno(paymentId, origem = 'interno') {
  try {
    const r = await fetch(`${BASE_URL}/api/functions/mpWebhook`, {
      method: 'POST', headers: cabecalhosInternos(),
      body: JSON.stringify({ type: 'payment', data: { id: String(paymentId) }, origem }),
      signal: AbortSignal.timeout(25000),
    });
    const j = await r.json().catch(() => null);
    return { http: r.status, ...(j && typeof j === 'object' ? j : {}) };
  } catch (e) {
    return { http: 0, ok: false, error: String(e?.message || e).slice(0, 120) };
  }
}

const cpfFormatado = (d) => (d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d);

/** Lê o que a régua precisa: comprador, outras contas do mesmo CPF, depósitos das 24h e os antigos. */
export async function lerContextoDoComprador(sb, sale, agora = Date.now()) {
  const buyerId = sale?.buyer_id ? String(sale.buyer_id) : '';
  if (!buyerId) return { comprador: null, contas: [], depositosRecentes: [], depositosAntigos: [] };
  const u = await (await sb(`app_users?select=id,cpf,created_date,created_at&id=eq.${enc(buyerId)}&limit=1`)).json();
  const comprador = Array.isArray(u) ? u[0] || null : null;
  const contas = [buyerId];
  const cpf = soDigitos(comprador?.cpf);
  if (cpf.length === 11) {
    const irmas = await (await sb(`app_users?select=id&or=(cpf.eq.${enc(cpf)},cpf.eq.${enc(cpfFormatado(cpf))})&id=neq.${enc(buyerId)}&limit=10`)).json().catch(() => []);
    for (const x of Array.isArray(irmas) ? irmas : []) if (x?.id && !contas.includes(String(x.id))) contas.push(String(x.id));
  }
  const ids = contas.map(enc).join(',');
  const desde = new Date(agora - SEQUENCIA_JANELA_H * 3600000).toISOString();
  // pelo momento do PAGAMENTO: pago_em (flip do webhook) ou antifraude_avaliado_em (segurado no aviso aprovado);
  // linha antiga sem carimbo cai no created_date. Quem gera três QR hoje e paga amanhã conta amanhã.
  const recentes = await (await sb(`catalog_sales?select=id,total_amount,status,created_date,pago_em,antifraude_decisao,antifraude_espera_ate&kind=in.(${KINDS})&buyer_id=in.(${ids})&or=(pago_em.gte.${enc(desde)},antifraude_avaliado_em.gte.${enc(desde)},and(pago_em.is.null,antifraude_avaliado_em.is.null,status.eq.paid,created_date.gte.${enc(desde)}))&limit=50`)).json();
  const antes = new Date(agora - VETERANO_DIAS * 864e5).toISOString();
  const antigos = await (await sb(`catalog_sales?select=id,gateway&kind=in.(${KINDS})&buyer_id=in.(${ids})&status=eq.paid&or=(pago_em.lt.${enc(antes)},and(pago_em.is.null,created_date.lt.${enc(antes)}))&order=created_date.desc&limit=10`)).json();
  if (!Array.isArray(recentes) || !Array.isArray(antigos)) throw new Error('contexto_ilegivel');
  // contestado conta mesmo fora dos 7 dias e mesmo cancelado pelo gateway (refund/chargeback viram
  // status 'cancelado' e sumiriam do filtro status=eq.paid): quem já teve dinheiro devolvido não é veterano.
  const contestado = await (await sb(`catalog_sales?select=id,gateway&kind=in.(${KINDS})&buyer_id=in.(${ids})&gateway->>situacao=in.(${SITUACOES_DINHEIRO_SAIU.join(',')})&limit=1`)).json().catch(() => []);
  const c = Array.isArray(contestado) ? contestado[0] : null;
  if (c && !antigos.some((a) => a.id === c.id)) antigos.push(c);
  return { comprador, contas, depositosRecentes: recentes, depositosAntigos: antigos };
}

/**
 * Segura a venda: grava antifraude_* SÓ se ainda não foi segurada (o webhook chega em
 * dobro). Devolve { segurou, esperaAte }. Quem recebe segurou=true é quem avisa.
 */
export async function segurarDeposito(sb, sale, avaliacao, { agora = Date.now(), paymentId = null, contas = [] } = {}) {
  const fim = esperaAte(agora);
  const r = await sb(`catalog_sales?id=eq.${enc(sale.id)}&status=in.(${STATUS})&antifraude_espera_ate=is.null`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      antifraude_motivo: avaliacao.motivo, antifraude_espera_ate: fim, antifraude_avaliado_em: new Date(agora).toISOString(),
      antifraude_detalhes: avaliacao.detalhes || null,
      ...(paymentId ? { mp_payment_id: String(paymentId) } : {}),
    }),
  });
  const rows = await r.json().catch(() => []);
  // r.ok e 0 linhas = corrida (o outro webhook segurou, ou a venda já mudou): segue em espera.
  // !r.ok = o banco recusou o PATCH: NÃO é espera — quem chama deixa o depósito passar (falha aberta),
  // senão responderíamos 200 "em_espera" sem nada gravado e o gateway nunca mais reenviaria.
  const segurou = r.ok && Array.isArray(rows) && rows.length === 1;
  if (!r.ok) return { segurou: false, esperaAte: fim, erro: `http_${r.status}` };
  if (segurou && contas.length) {
    // a espera reinicia para os outros depósitos da mesma pessoa que ainda esperam
    await sb(`catalog_sales?buyer_id=in.(${contas.map(enc).join(',')})&id=neq.${enc(sale.id)}&status=in.(${STATUS})&antifraude_espera_ate=not.is.null&antifraude_decisao=is.null`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ antifraude_espera_ate: fim }),
    }).catch(() => {});
  }
  return { segurou, esperaAte: fim };
}

/**
 * Grava a decisão SÓ se ainda não havia uma (corrida Beatriz × cron × poll). Devolve true se gravou.
 * `de`: a única troca permitida é recusado → liberado, quando a devolução no gateway não aconteceu.
 */
export async function marcarDecisao(sb, saleId, decisao, por, { de = null } = {}) {
  if (!DECISOES.includes(decisao)) return false;
  if (de && !(de === 'recusado' && decisao === 'liberado')) return false;
  const r = await sb(`catalog_sales?id=eq.${enc(saleId)}&antifraude_espera_ate=not.is.null&antifraude_decisao=${de ? `eq.${enc(de)}` : 'is.null'}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ antifraude_decisao: decisao, antifraude_decidido_em: new Date().toISOString(), antifraude_decidido_por: String(por || '').slice(0, 200) || null }),
  });
  const rows = await r.json().catch(() => []);
  return r.ok && Array.isArray(rows) && rows.length === 1;
}

const COLS = 'id,mp_payment_id,created_date,created_at,kind,status,total_amount,sale_price,buyer_id,buyer_name,buyer_email,payment_method,gateway,antifraude_motivo,antifraude_espera_ate,antifraude_avaliado_em,antifraude_decisao,antifraude_decidido_em,antifraude_decidido_por,antifraude_detalhes';

/**
 * A lista da Beatriz: depósitos em espera (decisão nula), os recusados cuja devolução no
 * gateway ainda não aconteceu, e os liberados que ainda não viraram 'paid' (o crédito
 * falhou; o cron insiste). No formato das pendências do painel_conciliacao.
 */
export async function listarDepositosEmAnalise(sb, { agora = Date.now() } = {}) {
  const rows = await (await sb(`catalog_sales?select=${COLS}&kind=in.(${KINDS})&status=in.(${STATUS})&antifraude_espera_ate=not.is.null&order=antifraude_espera_ate.asc&limit=50${SEM_ZUMBI}`)).json();
  const lista = (Array.isArray(rows) ? rows : []).filter((s) => s.antifraude_decisao !== 'recusado' || !['devolvido', 'devolvido_parcial', 'chargeback'].includes(String(s.gateway?.situacao || '')));
  if (!lista.length) return [];
  const ids = [...new Set(lista.map((s) => String(s.buyer_id || '')).filter(Boolean))];
  const [pessoas, acoes] = await Promise.all([
    ids.length ? sb(`app_users?select=id,phone,email&id=in.(${ids.map(enc).join(',')})`).then((r) => r.json()).catch(() => []) : [],
    sb(`gateway_acoes?select=sale_id,acao,status,criada_em&status=eq.pendente&sale_id=in.(${lista.map((s) => enc(s.id)).join(',')})`).then((r) => r.json()).catch(() => []),
  ]);
  const pessoa = new Map((Array.isArray(pessoas) ? pessoas : []).map((p) => [String(p.id), p]));
  const acao = new Map((Array.isArray(acoes) ? acoes : []).map((a) => [String(a.sale_id), a]));
  return lista.map((s) => {
    const p = pessoa.get(String(s.buyer_id)) || {};
    const fim = new Date(s.antifraude_espera_ate).getTime();
    const auto = liberaSozinho(s.antifraude_motivo);
    return {
      sale_id: s.id, payment_id: s.mp_payment_id, quando: s.created_date || s.created_at, kind: s.kind, status: s.status,
      valor: round2(Number(s.total_amount ?? s.sale_price) || 0), situacao: s.gateway?.situacao || 'liberado',
      divergencia: s.antifraude_decisao === 'recusado' ? 'recusado_sem_devolucao' : DECISOES_QUE_LIBERAM.includes(s.antifraude_decisao) ? 'liberado_sem_credito' : 'em_analise',
      gateway: s.gateway ? { ...s.gateway, bruto: undefined, investigacao: undefined } : null,
      nome: s.buyer_name, buyer_id: s.buyer_id, telefone: p.phone || null, email: s.buyer_email || p.email || null,
      bloqueado: 0, acao_pendente: acao.get(String(s.id)) ? { acao: acao.get(String(s.id)).acao, status: 'pendente', criada_em: acao.get(String(s.id)).criada_em } : null,
      antifraude: {
        motivo: s.antifraude_motivo, rotulo: rotuloDoMotivo(s.antifraude_motivo, s.antifraude_detalhes), espera_ate: s.antifraude_espera_ate,
        vencida: Number.isFinite(fim) && agora >= fim, automatico: auto, retido: dinheiroSaiu(s), decisao: s.antifraude_decisao, decidido_em: s.antifraude_decidido_em, decidido_por: s.antifraude_decidido_por,
        meio: meio(s), detalhes: s.antifraude_detalhes || null,
      },
    };
  });
}

/**
 * O cron (a cada 30 min): os depósitos cuja espera venceu e que liberam sozinhos são
 * re-disparados no webhook; os que só humano libera lembram a Beatriz 1x/dia.
 * Com orçamento de tempo: a conciliação roda depois, na mesma função.
 */
export async function liberarDepositosVencidos({ sb, limite = 5, orcamentoMs = 15000, agora = Date.now(), disparar = dispararWebhookInterno, lembrar = null } = {}) {
  const inicio = Date.now();
  const rows = await (await sb(`catalog_sales?select=${COLS}&kind=in.(${KINDS})&status=in.(${STATUS})&antifraude_espera_ate=not.is.null&antifraude_decisao=is.null&antifraude_espera_ate=lte.${enc(new Date(agora).toISOString())}&order=antifraude_espera_ate.asc&limit=${Math.max(1, Math.min(20, limite))}${SEM_ZUMBI}`)).json();
  const lista = Array.isArray(rows) ? rows : [];
  // decididos (liberado/auto) há mais de 5 min e ainda pendentes: a liberação não creditou
  // (CAS do crédito, 5xx, função congelada) e o gateway não reenvia — o cron insiste.
  const decididos = await (await sb(`catalog_sales?select=${COLS}&kind=in.(${KINDS})&status=in.(${STATUS})&antifraude_espera_ate=not.is.null&antifraude_decisao=in.(liberado,auto)&antifraude_decidido_em=lte.${enc(new Date(agora - 5 * 60000).toISOString())}&order=antifraude_decidido_em.asc&limit=5${SEM_ZUMBI}`)).json().catch(() => []);
  const r = { vencidos: lista.length, decididos_sem_credito: Array.isArray(decididos) ? decididos.length : 0, liberados: 0, falhas: 0, aguardando_humano: 0, lembretes: 0, restantes: 0, detalhes: [] };
  for (const s of (Array.isArray(decididos) ? decididos : [])) {
    if (Date.now() - inicio > orcamentoMs) { r.restantes += 1; continue; }
    if (dinheiroSaiu(s)) { r.aguardando_humano += 1; continue; }
    if (!s.mp_payment_id) { r.falhas += 1; r.detalhes.push({ sale_id: s.id, erro: `sem_payment_id` }); continue; }
    const j = await disparar(s.mp_payment_id, `cron_decidido`);
    const ok = !!(j?.paid || j?.already_paid);
    if ([401, 403].includes(Number(j?.http))) r.config_erro = true;
    if (ok) r.liberados += 1; else r.falhas += 1;
    r.detalhes.push({ sale_id: s.id, decidido: s.antifraude_decisao, ok, http: j?.http, resposta: ok ? `creditado` : (j?.error || j?.erro || j?.motivo || `falha`) });
  }
  for (const s of lista) {
    if (Date.now() - inicio > orcamentoMs) { r.restantes += 1; continue; }
    if (!liberaSozinho(s.antifraude_motivo) || dinheiroSaiu(s)) {
      r.aguardando_humano += 1;
      if (typeof lembrar === 'function') { const l = await lembrar(`antifraude_${s.id}`, textoLembreteAdmin(s), { sb, horas: 24 }).catch(() => ({ enviado: false })); if (l?.enviado) r.lembretes += 1; }
      continue;
    }
    if (!s.mp_payment_id) { r.falhas += 1; r.detalhes.push({ sale_id: s.id, erro: 'sem_payment_id' }); continue; }
    const j = await disparar(s.mp_payment_id, 'cron');
    const ok = !!(j?.paid || j?.already_paid);
    if ([401, 403].includes(Number(j?.http))) r.config_erro = true;
    if (ok) r.liberados += 1; else r.falhas += 1;
    r.detalhes.push({ sale_id: s.id, ok, http: j?.http, resposta: ok ? 'creditado' : (j?.error || j?.erro || (j?.em_espera ? 'ainda_em_espera' : 'falha')) });
  }
  if (r.config_erro) {
    // o próprio webhook recusou a chamada interna (401/403): é CRON_SECRET faltando ou diferente entre as
    // funções, com MP_WEBHOOK_MODO=bloquear. Sem isso nenhuma liberação sai — e o gateway não reenvia.
    console.error('[ANTIFRAUDE] o webhook recusou a chamada interna (401/403): confira CRON_SECRET (x-interno) na Vercel. Nenhum depósito em espera é liberado até isso ser resolvido.');
    if (typeof lembrar === 'function') await lembrar('antifraude_config', '🔴 *Antifraude: a liberação de depósitos está travada*\n\nO webhook recusou a chamada interna (401/403). Falta CRON_SECRET na Vercel, ou ele difere entre as funções. Nenhum depósito em conferência sai até isso ser publicado.', { sb, horas: 24 }).catch(() => {});
  }
  return r;
}
