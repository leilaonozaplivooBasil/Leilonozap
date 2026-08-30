// 🧭 CRM unificado — visão ADMIN completa da movimentação real da plataforma.
// Junta 3 fontes automáticas + cadastro manual numa lista só, sem duplicar
// a mesma pessoa:
//   1) AppUser (TODOS os cadastrados) → base da lista, com o "Tipo" real
//      derivado do cadastro (Vendedor, Licenciado, Influencer, Investidor,
//      Leiloeiro, Arrematante ou Cliente comum).
//   2) CatalogSale (compras na Loja Virtual) → somado por buyer_id (conta
//      real) ou, se o comprador não tem conta, entra como "avulso".
//   3) Auction com winner_id (arremates em Leilões) → somado por winner_id.
//   4) Customer (cadastro manual) → só entra se a pessoa não tiver conta
//      nem aparecer em nenhuma das fontes automáticas.
// Chave primária das fontes automáticas 1+3: AppUser.id (join direto).
// Fallback de dedupe (fonte 2 sem conta, e fonte 4): e-mail/telefone.

const normKey = (email, phone) => {
  const e = (email || '').trim().toLowerCase();
  const p = (phone || '').replace(/\D/g, '');
  return e || (p ? `tel:${p}` : null);
};

const PURCHASE_STATUS_MAP = {
  pending_payment: 'aguardando_pagamento',
  paid: 'pago',
  shipped: 'enviado',
  delivered: 'entregue',
  canceled: 'cancelado',
};

// 🔴 Achado 30/08/2026 — total_spent somava QUALQUER catalog_sales, inclusive
// pending_payment/canceled. Mesmo defeito de conceito já corrigido em
// financial_income (DIR-7) e no filtro isPaga do NetworkOverview.jsx — venda
// não paga não é dinheiro que entrou. Mesmo conjunto de status "já pago" já
// usado em api/functions/updateOrderStatus.js (JA_PAGO) e
// src/pages/CatalogOrdersAdmin.jsx (STATUS_PAGO), inclui os dois idiomas
// (o banco tem status em inglês e em português misturados — PONTO 116).
const STATUS_PAGO = new Set(['paid', 'entregue', 'enviado', 'confirmado', 'pago', 'concluido', 'preparando', 'saiu_entrega', 'shipped', 'delivered']);
export const isSalePago = (s) => STATUS_PAGO.has(String(s.status || '').toLowerCase());

// 🔴 DIR-24 (30/08/2026) — "Gasto Total" do cliente é MERCADORIA, não
// movimentação: depósito em carteira, adesão de cargo e aporte de parceiro
// NÃO são gasto de compra (o depósito vira compra quando é usado — somar os
// dois conta o mesmo real duas vezes, defeito já morto nos cards grandes na
// DIR-14 e que sobrevivia aqui na linha do cliente). Linha sem `kind` é dado
// legado (anterior à coluna) — conta como mercadoria pra não zerar histórico.
const KINDS_MERCADORIA = new Set(['loja', 'produto', 'arremate']);
export const isVendaMercadoria = (s) => !s.kind || KINDS_MERCADORIA.has(s.kind);

export const ROLE_LABEL = {
  vendedor: 'Vendedor',
  licenciado: 'Licenciado',
  influencer: 'Influencer',
  investidor: 'Investidor',
  leiloeiro: 'Leiloeiro',
  arrematante: 'Arrematante',
  cliente: 'Cliente',
};

// 🌳 Rede "de mim para baixo" — percorre referred_by_id/recruited_by_id a
// partir do usuário logado e devolve o Set de IDs de todos os descendentes
// (indicados, sub-indicados, vendedores recrutados, etc). O CRM só deve
// mostrar quem está dentro deste Set — nunca a base inteira do aplicativo.
export function getNetworkDescendantIds(appUsers, rootId) {
  const childrenByParent = new Map();
  appUsers.forEach((u) => {
    [u.referred_by_id, u.recruited_by_id].filter(Boolean).forEach((parentId) => {
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId).push(u.id);
    });
  });
  const result = new Set();
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift();
    (childrenByParent.get(current) || []).forEach((childId) => {
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
      }
    });
  }
  return result;
}

// Deriva o "Tipo" de rede a partir do cadastro real (role, cargos e contextos).
// 🔴 DIR-10 (27/08/2026) — "arrematante" checava `u.arrematante_context?.enabled`,
// mas essa coluna nasce TEXT no banco (não JSONB) — chega como string crua no JS,
// nunca como objeto, então `.enabled` é sempre undefined. Ninguém nunca escreve esse
// campo, então a checagem morreu antes de nascer. Quem realmente arrematou um leilão
// (Auction.winner_id) é promovido a 'arrematante' depois, em buildUnifiedCustomers —
// dado real, não um campo de contexto que nada preenche.
export function deriveRoleType(u) {
  const levels = Array.isArray(u.career_levels) ? u.career_levels : [];
  if (u.role === 'leiloeiro') return 'leiloeiro';
  if (u.role === 'investidor') return 'investidor';
  if (levels.includes('influenciador') || levels.includes('influencer')) return 'influencer';
  if (u.is_seller || levels.includes('vendedor')) return 'vendedor';
  if (levels.includes('licenciado_catalogo') || levels.includes('licenciado_aplicativo')) return 'licenciado';
  return 'cliente';
}

export function buildUnifiedCustomers({ appUsers = [], catalogSales = [], auctions = [], manualCustomers = [] }) {
  const byId = new Map();
  // Nome de quem indicou cada usuário — para o funil "Indicado por"
  const nameById = new Map(appUsers.map((u) => [u.id, u.full_name || u.nickname || 'Sem nome']));

  // 1) Base: todos os usuários cadastrados (já filtrados pela rede de quem está vendo)
  appUsers.forEach((u) => {
    if (!u.id) return;
    const address = [u.address_street, u.address_number, u.address_city, u.address_state, u.address_zip_code]
      .filter(Boolean).join(', ');
    byId.set(u.id, {
      id: `u_${u.id}`,
      user_id: u.id,
      origin_type: 'auto',
      full_name: u.full_name || u.nickname || 'Sem nome',
      email: u.email || '',
      phone: u.phone || '',
      cpf: u.cpf || '',
      address,
      role_type: deriveRoleType(u),
      status: 'lead',
      purchase_status: 'sem_compra',
      source: 'cadastro',
      assigned_seller: '',
      last_contact: u.created_date,
      registered_at: u.created_date,
      referred_by_name: u.referred_by_id ? (nameById.get(u.referred_by_id) || null) : null,
      total_spent: 0,
      purchase_count: 0,
      auctions_won: 0,
      purchases: [],
      auctions_list: [],
    });
  });

  // 2) Compras da Loja Virtual — soma por conta real (buyer_id); sem conta, entra avulso.
  // 🔴 DIR-24 — só venda de MERCADORIA (loja/produto/arremate) toca gasto,
  // contador, status de compra e linha do tempo; depósito/adesão/aporte são
  // ignorados aqui (têm seus próprios painéis, com o critério oficial).
  const guestBuyers = new Map();
  catalogSales.forEach((s) => {
    if (!isVendaMercadoria(s)) return;
    const amount = Number(s.total_amount) || 0;
    const pago = isSalePago(s);
    const target = s.buyer_id && byId.get(s.buyer_id);
    if (target) {
      if (pago) { target.total_spent += amount; target.purchase_count += 1; }
      target.status = 'cliente';
      const mapped = PURCHASE_STATUS_MAP[s.status];
      if (mapped) target.purchase_status = mapped;
      if (!target.source.includes('loja_virtual')) target.source = `${target.source}+loja_virtual`;
      if (!target.last_contact || new Date(s.created_date) > new Date(target.last_contact)) target.last_contact = s.created_date;
      target.purchases.push({ id: s.id, product_title: s.product_title, amount, status: s.status, date: s.created_date });
      return;
    }
    const key = normKey(s.buyer_email, s.buyer_phone);
    if (!key) return;
    const existing = guestBuyers.get(key);
    const address = [s.buyer_address, s.buyer_cep].filter(Boolean).join(' · ');
    if (existing) {
      // 🔴 DIR-24 — convidado recorrente somava só o valor: contador e linha
      // do tempo paravam na 1ª compra. Agora acumula igual à conta real.
      if (pago) { existing.total_spent += amount; existing.purchase_count += 1; }
      const mapped = PURCHASE_STATUS_MAP[s.status];
      if (mapped) existing.purchase_status = mapped;
      if (!existing.last_contact || new Date(s.created_date) > new Date(existing.last_contact)) existing.last_contact = s.created_date;
      existing.purchases.push({ id: s.id, product_title: s.product_title, amount, status: s.status, date: s.created_date });
    } else {
      guestBuyers.set(key, {
        id: `cs_${s.id}`,
        origin_type: 'auto',
        full_name: s.buyer_name || 'Sem nome',
        email: s.buyer_email || '',
        phone: s.buyer_phone || '',
        cpf: '',
        address,
        role_type: 'cliente',
        status: 'cliente',
        purchase_status: PURCHASE_STATUS_MAP[s.status] || 'sem_compra',
        source: 'loja_virtual',
        assigned_seller: '',
        last_contact: s.created_date,
        registered_at: null,
        referred_by_name: null,
        total_spent: pago ? amount : 0,
        purchase_count: pago ? 1 : 0,
        auctions_won: 0,
        purchases: [{ id: s.id, product_title: s.product_title, amount, status: s.status, date: s.created_date }],
        auctions_list: [],
      });
    }
  });

  // 3) Leilões vencidos — contagem e linha do tempo por conta real (winner_id).
  // 🔴 DIR-24 — o VALOR não soma mais daqui: winner_id sozinho não prova
  // pagamento (mesma inflação que a DIR-15 matou no painel). O dinheiro do
  // leilão entra pela venda kind='arremate' PAGA (bloco 2, fonte única);
  // aqui fica só o fato de ter vencido (contagem + histórico).
  auctions.forEach((a) => {
    if (!a.winner_id) return;
    const target = byId.get(a.winner_id);
    if (!target) return;
    target.status = 'cliente';
    target.auctions_won += 1;
    // 🔴 DIR-10 — promove a 'arrematante' com dado real de arremate, só se nenhum
    // papel de cargo (leiloeiro/investidor/influencer/vendedor/licenciado) já se
    // aplicar — arrematante nunca deveria "roubar" um papel mais específico.
    if (target.role_type === 'cliente') target.role_type = 'arrematante';
    if (!target.source.includes('leilao')) target.source = `${target.source}+leilao`;
    if (a.end_time && (!target.last_contact || new Date(a.end_time) > new Date(target.last_contact))) target.last_contact = a.end_time;
    target.auctions_list.push({ id: a.id, title: a.title, amount: Number(a.current_price) || 0, date: a.end_time });
  });

  const autoList = [...byId.values(), ...guestBuyers.values()];
  const autoByKey = new Map();
  autoList.forEach((c) => {
    const key = normKey(c.email, c.phone);
    if (key && !autoByKey.has(key)) autoByKey.set(key, c);
  });

  // 4) Cadastro manual — quem também existe numa fonte automática é FUNDIDO
  // na linha automática (🔴 DIR-24: antes era descartado, e as anotações, o
  // vendedor atribuído e o follow-up sumiam do CRM junto). Só vira linha
  // própria quem não existe em nenhuma fonte automática.
  const manualSoltos = [];
  manualCustomers.forEach((c) => {
    const alvo = autoByKey.get(normKey(c.email, c.phone));
    if (alvo) {
      alvo.manual_id = c.id;
      if (c.notes) alvo.notes = c.notes;
      if (c.assigned_seller) alvo.assigned_seller = c.assigned_seller;
      if (c.follow_up_date) alvo.follow_up_date = c.follow_up_date;
      if (c.next_steps) alvo.next_steps = c.next_steps;
      if (c.cpf && !alvo.cpf) alvo.cpf = c.cpf;
      alvo.raw = c;
      return;
    }
    manualSoltos.push(c);
  });
  const manualList = manualSoltos
    .map((c) => ({
      id: c.id,
      origin_type: 'manual',
      full_name: c.full_name || 'Sem nome',
      email: c.email || '',
      phone: c.phone || '',
      cpf: c.cpf || '',
      address: [c.address_street, c.address_number, c.address_city, c.address_state, c.address_zip_code]
        .filter(Boolean).join(', '),
      role_type: 'cliente',
      status: c.status || 'lead',
      purchase_status: c.purchase_status || 'sem_compra',
      source: c.source || 'outro',
      assigned_seller: c.assigned_seller || '',
      last_contact: c.last_contact,
      registered_at: c.created_date,
      referred_by_name: null,
      total_spent: c.total_spent || 0,
      purchase_count: c.total_purchases || 0,
      auctions_won: 0,
      purchases: [],
      auctions_list: [],
      notes: c.notes,
      follow_up_date: c.follow_up_date || null,
      next_steps: c.next_steps || '',
      manual_id: c.id,
      raw: c,
    }));

  return [...autoList, ...manualList];
}