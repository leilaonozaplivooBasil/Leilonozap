// linhaDoTempoCliente — a CRONOLOGIA do cliente (DIR-36, 01/09/2026): a
// história inteira numa lista só, em ordem, pro vendedor decidir o próximo
// passo em segundos. Costura dados que o CRM JÁ tem: cadastro, depósitos
// reais, compras, arremates, oportunidades da esteira (criação e cada
// movimento de estágio) e o follow-up combinado (futuro, no topo).
import { isVendaReal } from './dinheiroReal.js';
import { estagioDe } from './esteiraCaptacao.js';

const ordemDesc = (a, b) => new Date(b.em || 0) - new Date(a.em || 0);

/**
 * @param cliente  linha do buildUnifiedCustomers (purchases, auctions_list,
 *                 registered_at, user_id, email, follow_up_date, next_steps)
 * @param sales    catalog_sales do MESMO escopo (pros depósitos reais)
 * @param oportunidades oportunidades da esteira JÁ do escopo de quem vê
 * @returns { futuros, passados } — eventos {em, tipo, titulo, detalhe?, valor?}
 */
export function linhaDoTempoCliente({ cliente, sales = [], oportunidades = [] } = {}) {
  if (!cliente) return { futuros: [], passados: [] };
  const email = String(cliente.email || '').toLowerCase();
  const doCliente = (buyerId, buyerEmail) =>
    (cliente.user_id && buyerId === cliente.user_id)
    || (email && String(buyerEmail || '').toLowerCase() === email);

  const passados = [];

  if (cliente.registered_at) {
    passados.push({ em: cliente.registered_at, tipo: 'cadastro', titulo: 'Entrou no app' });
  }

  // Depósitos REAIS na carteira (dinheiro que entrou e ainda não virou compra)
  sales.forEach((s) => {
    if (s.kind !== 'wallet_deposit' || !isVendaReal(s) || !doCliente(s.buyer_id, s.buyer_email)) return;
    passados.push({ em: s.created_date, tipo: 'deposito', titulo: 'Depósito na carteira', valor: Number(s.total_amount) || 0 });
  });

  (cliente.purchases || []).forEach((p) => {
    passados.push({ em: p.date, tipo: 'compra', titulo: p.product_title || 'Compra na Loja', valor: Number(p.amount) || 0, detalhe: p.status === 'paid' ? null : 'aguardando pagamento' });
  });
  (cliente.auctions_list || []).forEach((a) => {
    passados.push({ em: a.date, tipo: 'arremate', titulo: a.title || 'Arremate de leilão', valor: Number(a.amount) || 0 });
  });

  // Esteira: criação + cada movimento gravado no histórico
  oportunidades.forEach((o) => {
    if (!doCliente(o.cliente_user_id, o.cliente_email)) return;
    if (o.created_date) {
      // estágio de nascimento = primeiro registro do histórico (sem `de`);
      // sem histórico, usa o estágio atual
      const nasceuEm = (Array.isArray(o.historico) && o.historico[0]?.para) || o.estagio;
      passados.push({ em: o.created_date, tipo: 'oportunidade', titulo: 'Entrou na esteira de captação', detalhe: estagioDe(nasceuEm).label, valor: Number(o.valor_previsto) || 0 });
    }
    (Array.isArray(o.historico) ? o.historico : []).forEach((h) => {
      if (!h?.em || !h?.de) return; // primeiro registro (criação) já entrou acima
      passados.push({ em: h.em, tipo: 'oportunidade', titulo: `Esteira: ${estagioDe(h.de).label} → ${estagioDe(h.para).label}`, detalhe: h.por || null });
    });
  });

  const futuros = [];
  if (cliente.follow_up_date) {
    futuros.push({ em: cliente.follow_up_date, tipo: 'followup', titulo: 'Voltar a falar', detalhe: cliente.next_steps || null });
  }
  oportunidades.forEach((o) => {
    if (!doCliente(o.cliente_user_id, o.cliente_email)) return;
    if (o.reuniao_em && o.estagio !== 'fechado_100' && o.estagio !== 'sem_interesse') {
      futuros.push({ em: o.reuniao_em, tipo: 'reuniao', titulo: `Reunião — ${estagioDe(o.estagio).label}` });
    }
    if (o.recontato_em && o.estagio === 'interesse_futuro') {
      futuros.push({ em: o.recontato_em, tipo: 'recontato', titulo: 'Recontato combinado' });
    }
  });

  return {
    futuros: futuros.sort((a, b) => new Date(a.em || 0) - new Date(b.em || 0)),
    passados: passados.sort(ordemDesc),
  };
}
