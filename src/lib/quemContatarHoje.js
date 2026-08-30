// quemContatarHoje — a FILA DE AÇÃO do CRM (DIR-24 Fase 4, 30/08/2026).
// A vantagem que nenhum CRM de mercado tem aqui dentro: o sistema SABE quem
// gerou pedido e não pagou, quem depositou e não comprou, quem arrematou e
// não pagou, quem tem follow-up marcado e quem sumiu — e transforma isso
// numa lista diária de "fale com essa pessoa AGORA", com o motivo e o valor
// em jogo. Ordena pelo dinheiro: quem tem mais valor parado aparece primeiro.
import { isPosMarco, isVendaReal } from './dinheiroReal.js';
import { isVendaMercadoria } from './crmUnifiedCustomers.js';

export const MOTIVOS = {
  follow_up: { label: 'Follow-up marcado', prioridade: 0 },
  pedido_nao_pago: { label: 'Pedido gerado e não pago', prioridade: 1 },
  arremate_nao_pago: { label: 'Arremate aguardando pagamento', prioridade: 2 },
  deposito_sem_compra: { label: 'Depositou e não comprou', prioridade: 3 },
  sumido_30d: { label: 'Cliente sumido há 30+ dias', prioridade: 4 },
};

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Monta a fila de contato do dia a partir das fontes JÁ ESCOPADAS.
 * @param unifiedCustomers lista do buildUnifiedCustomers (escopo de quem vê)
 * @param sales catalog_sales do MESMO escopo
 * @param ref Date de "hoje" (parâmetro pra ser testável)
 * @returns itens {key, motivo, label, cliente, valor, desde, detalhe} ordenados
 */
export function quemContatarHoje({ unifiedCustomers = [], sales = [], ref = new Date() } = {}) {
  const itens = [];
  const hojeStr = ref.toISOString().slice(0, 10);
  const corte30d = new Date(ref.getTime() - 30 * DIA_MS);
  const porBuyerId = new Map();
  const porEmail = new Map();
  unifiedCustomers.forEach((c) => {
    if (c.user_id) porBuyerId.set(c.user_id, c);
    if (c.email) porEmail.set(c.email.toLowerCase(), c);
  });
  const acharCliente = (s) => (s.buyer_id && porBuyerId.get(s.buyer_id))
    || (s.buyer_email && porEmail.get(String(s.buyer_email).toLowerCase()))
    || null;

  // 1) Follow-up vencido ou de hoje (anotado no CRM — palavra dada ao cliente)
  unifiedCustomers.forEach((c) => {
    if (!c.follow_up_date) return;
    if (String(c.follow_up_date).slice(0, 10) > hojeStr) return;
    itens.push({
      key: `fu_${c.id}`,
      motivo: 'follow_up',
      cliente: c,
      valor: 0,
      desde: c.follow_up_date,
      detalhe: c.next_steps || 'Retorno combinado para hoje ou antes.',
    });
  });

  // 2) Pedido de Loja gerado e NÃO pago (pós-marco) — o carrinho que virou
  // pedido e parou; é a venda mais quente que existe.
  // 3) Arremate aguardando pagamento — ganhou o leilão e não pagou.
  const jaTem = new Set();
  sales.forEach((s) => {
    if (s.status !== 'pending_payment' || !isPosMarco(s)) return;
    const ehLoja = ['loja', 'produto'].includes(s.kind);
    const ehArremate = s.kind === 'arremate';
    if (!ehLoja && !ehArremate) return;
    const cliente = acharCliente(s);
    if (!cliente || jaTem.has(`${s.kind}_${cliente.id}`)) return;
    jaTem.add(`${s.kind}_${cliente.id}`);
    itens.push({
      key: `pp_${s.id}`,
      motivo: ehArremate ? 'arremate_nao_pago' : 'pedido_nao_pago',
      cliente,
      valor: Number(s.total_amount) || 0,
      desde: s.created_date,
      detalhe: s.product_title || (ehArremate ? 'Arremate de leilão' : 'Pedido da Loja'),
    });
  });

  // 4) Depositou dinheiro real e nunca comprou mercadoria — saldo parado.
  const depositouPorCliente = new Map();
  sales.forEach((s) => {
    if (s.kind !== 'wallet_deposit' || !isVendaReal(s)) return;
    const cliente = acharCliente(s);
    if (!cliente) return;
    depositouPorCliente.set(cliente.id, (depositouPorCliente.get(cliente.id) || 0) + (Number(s.total_amount) || 0));
  });
  depositouPorCliente.forEach((valor, clienteId) => {
    const cliente = unifiedCustomers.find((c) => c.id === clienteId);
    if (!cliente || cliente.purchase_count > 0) return;
    itens.push({
      key: `dep_${clienteId}`,
      motivo: 'deposito_sem_compra',
      cliente,
      valor,
      desde: null,
      detalhe: 'Depósito confirmado na carteira e nenhuma compra ainda.',
    });
  });

  // 5) Cliente que JÁ comprou e sumiu há 30+ dias — reativação.
  unifiedCustomers.forEach((c) => {
    if (!c.purchase_count || !c.last_contact) return;
    if (new Date(c.last_contact) >= corte30d) return;
    itens.push({
      key: `sum_${c.id}`,
      motivo: 'sumido_30d',
      cliente: c,
      valor: Number(c.total_spent) || 0,
      desde: c.last_contact,
      detalhe: `Já gastou de verdade e está sem movimento desde ${new Date(c.last_contact).toLocaleDateString('pt-BR')}.`,
    });
  });

  // Uma pessoa aparece UMA vez, no motivo mais urgente; empate decide por valor.
  const porCliente = new Map();
  for (const item of itens) {
    const atual = porCliente.get(item.cliente.id);
    if (!atual
      || MOTIVOS[item.motivo].prioridade < MOTIVOS[atual.motivo].prioridade
      || (MOTIVOS[item.motivo].prioridade === MOTIVOS[atual.motivo].prioridade && item.valor > atual.valor)) {
      porCliente.set(item.cliente.id, item);
    }
  }
  return [...porCliente.values()]
    .map((i) => ({ ...i, label: MOTIVOS[i.motivo].label }))
    .sort((a, b) => (MOTIVOS[a.motivo].prioridade - MOTIVOS[b.motivo].prioridade) || (b.valor - a.valor));
}

/** Mensagem de WhatsApp pronta por motivo — o vendedor só clica e fala. */
export function mensagemWhatsApp(item) {
  const nome = (item.cliente.full_name || '').split(' ')[0] || 'tudo bem';
  switch (item.motivo) {
    case 'pedido_nao_pago':
      return `Olá ${nome}! Vi que seu pedido "${item.detalhe}" ficou guardado aqui esperando o pagamento. Posso te ajudar a finalizar? Qualquer dúvida estou por aqui! 🛒`;
    case 'arremate_nao_pago':
      return `Parabéns pelo arremate, ${nome}! 🎉 Falta só o pagamento pra gente liberar "${item.detalhe}". Precisa de ajuda pra concluir?`;
    case 'deposito_sem_compra':
      return `Olá ${nome}! Seu saldo já está disponível na carteira 💰 Quer uma ajuda pra escolher? Temos produtos com desconto de verdade te esperando.`;
    case 'sumido_30d':
      return `Olá ${nome}, sentimos sua falta por aqui! 👋 Chegaram produtos novos com preço de fábrica — quer dar uma olhada?`;
    case 'follow_up':
      return `Olá ${nome}! Conforme combinado, estou retornando. ${item.detalhe && item.detalhe !== 'Retorno combinado para hoje ou antes.' ? item.detalhe : 'Podemos falar?'}`;
    default:
      return `Olá ${nome}! Aqui é do Leilão NoZap, tudo bem?`;
  }
}

/** Link wa.me com DDI 55 e a mensagem do motivo — null se não tem telefone. */
export function linkWhatsApp(item) {
  const digitos = String(item.cliente.phone || '').replace(/\D/g, '');
  if (!digitos) return null;
  const numero = digitos.length <= 11 ? `55${digitos}` : digitos;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagemWhatsApp(item))}`;
}
