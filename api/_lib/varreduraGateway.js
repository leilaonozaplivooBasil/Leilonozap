// 🔭 VARREDURA DO GATEWAY — o que entrou LÁ e não existe AQUI (07/10/2026, DIR-206).
//
// Dono: "acho que teve depósito e não foi constado… isso não pode falhar".
// A conciliação (DIR-195) confere pagamento por pagamento — mas só os que
// NASCERAM no aplicativo (a venda aponta para o pagamento). Um PIX mandado
// direto para a conta do gateway, sem gerar o QR aqui, entrava lá e não
// aparecia em lugar nenhum. Esta varredura fecha essa porta: pergunta ao
// gateway "o que você recebeu desde ontem?" e acusa o que não tem venda.
//
// 🔒 SÓ LEITURA. Não cria venda, não credita carteira, não mexe no gateway.
// Quem decide o que fazer com o dinheiro sem dono é gente (o vigia avisa).
import { situacaoDoPagamento } from './conferenciaMercadoPago.js';

const MP = 'https://api.mercadopago.com';
const PAGINA = 100;
const MAX_PAGINAS = 10;
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };

/** Da meia-noite de ONTEM (Brasília) até agora: aviso atrasado do gateway não escapa. */
export function janelaDaVarredura(agora = Date.now()) {
  const hoje = new Date(agora).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD
  const ontem = new Date(`${hoje}T12:00:00Z`); ontem.setUTCDate(ontem.getUTCDate() - 1);
  // meia-noite de Brasília = 03:00Z (o horário de verão acabou em 2019; a regra é fixa)
  return { de: `${ontem.toISOString().slice(0, 10)}T03:00:00.000Z`, ate: new Date(agora).toISOString() };
}

/** Situações em que DINHEIRO passou pela conta (entrou, ou entrou e saiu). */
export const SITUACOES_COM_DINHEIRO = Object.freeze(['liberado', 'retido', 'devolvido', 'devolvido_parcial', 'chargeback', 'disputa', 'alterado']);

/**
 * Dos pagamentos do gateway, quais NÃO têm venda aqui. Puro.
 * @param {Array<object>} pagamentos  objetos de pagamento do gateway
 * @param {Array<{id:string, mp_payment_id?:string|null}>} vendas  as nossas vendas que podem casar
 */
export function pagamentosSemVenda(pagamentos = [], vendas = []) {
  const porPagamento = new Set(vendas.map((v) => String(v?.mp_payment_id || '')).filter(Boolean));
  const porVenda = new Set(vendas.map((v) => String(v?.id || '')).filter(Boolean));
  const fora = [];
  for (const p of Array.isArray(pagamentos) ? pagamentos : []) {
    if (!p || p.id == null) continue;
    const situacao = situacaoDoPagamento(p);
    if (!SITUACOES_COM_DINHEIRO.includes(situacao)) continue; // pendente/cancelado: nunca entrou
    const id = String(p.id);
    const ref = String(p.external_reference || '');
    if (porPagamento.has(id) || (ref && porVenda.has(ref))) continue;
    fora.push({
      id, situacao, valor: num(p.transaction_amount), quando: p.date_approved || p.date_created || null,
      meio: String(p.payment_method_id || p.payment_type_id || ''), referencia: ref || null,
      descricao: String(p.description || '').slice(0, 80) || null,
      pagador: String(p.payer?.first_name || '').trim() || null,
    });
  }
  return fora;
}

/** Lista o que o gateway recebeu na janela, página a página. Nunca lança. */
export async function listarPagamentosDoGateway({ de, ate, token, fetchImpl = fetch }) {
  if (!token) return { ok: false, pagamentos: [], erro: 'MP_ACCESS_TOKEN ausente' };
  const pagamentos = [];
  try {
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
      const q = new URLSearchParams({ sort: 'date_created', criteria: 'desc', range: 'date_created', begin_date: de, end_date: ate, limit: String(PAGINA), offset: String(pagina * PAGINA) });
      const r = await fetchImpl(`${MP}/v1/payments/search?${q}`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json().catch(() => null);
      if (!r.ok || !Array.isArray(j?.results)) return { ok: false, pagamentos, erro: `http ${r.status}`, http: r.status };
      pagamentos.push(...j.results);
      const total = Number(j?.paging?.total);
      if (j.results.length < PAGINA || (Number.isFinite(total) && pagamentos.length >= total)) break;
    }
    return { ok: true, pagamentos };
  } catch (e) {
    return { ok: false, pagamentos, erro: String(e?.message || e) };
  }
}

/**
 * A varredura inteira: gateway → nossas vendas → o que sobrou.
 * `sb(path)` é o leitor do banco (service role); devolve um resumo serializável.
 */
export async function varrerGateway({ sb, token, agora = Date.now(), fetchImpl = fetch }) {
  const { de, ate } = janelaDaVarredura(agora);
  const lista = await listarPagamentosDoGateway({ de, ate, token, fetchImpl });
  if (!lista.ok) return { de, ate, ok: false, erro: lista.erro, pagamentos: lista.pagamentos.length, sem_venda: [] };
  const comDinheiro = lista.pagamentos.filter((p) => SITUACOES_COM_DINHEIRO.includes(situacaoDoPagamento(p)));
  if (!comDinheiro.length) return { de, ate, ok: true, pagamentos: lista.pagamentos.length, com_dinheiro: 0, sem_venda: [] };
  const ids = [...new Set(comDinheiro.map((p) => String(p.id)))];
  const refs = [...new Set(comDinheiro.map((p) => String(p.external_reference || '')).filter((s) => /^[A-Za-z0-9_-]{1,64}$/.test(s)))];
  const vendas = [];
  const lerLote = async (filtro) => {
    const r = await sb(`catalog_sales?select=id,mp_payment_id&${filtro}&limit=1000`);
    const j = await r.json().catch(() => []);
    if (Array.isArray(j)) vendas.push(...j);
  };
  for (let i = 0; i < ids.length; i += 200) await lerLote(`mp_payment_id=in.(${encodeURIComponent(ids.slice(i, i + 200).map((s) => `"${s}"`).join(','))})`);
  for (let i = 0; i < refs.length; i += 200) await lerLote(`id=in.(${encodeURIComponent(refs.slice(i, i + 200).map((s) => `"${s}"`).join(','))})`);
  return { de, ate, ok: true, pagamentos: lista.pagamentos.length, com_dinheiro: comDinheiro.length, sem_venda: pagamentosSemVenda(comDinheiro, vendas) };
}

const reais = (v) => 'R$ ' + num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quandoBR = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
};

/** Um alerta no formato do vigia para UM pagamento sem venda (um aviso por pagamento, sem repetir). */
export function alertaDoPagamentoSemVenda(p) {
  if (!p || !p.id) return null;
  return {
    codigo: `gateway_sem_venda_${p.id}`, gravidade: 'vermelho',
    titulo: `Pagamento de ${reais(p.valor)} no gateway sem venda no aplicativo`,
    detalhe: `${quandoBR(p.quando)} · ${p.situacao}${p.meio ? ` · ${p.meio}` : ''}${p.pagador ? ` · ${p.pagador}` : ''}${p.descricao ? ` · "${p.descricao}"` : ''} · pagamento ${p.id}. Ninguém foi creditado por isso aqui. Conferir no gateway e decidir: a quem pertence?`,
  };
}
