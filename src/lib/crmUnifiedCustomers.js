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

export const ROLE_LABEL = {
  vendedor: 'Vendedor',
  licenciado: 'Licenciado',
  influencer: 'Influencer',
  investidor: 'Investidor',
  leiloeiro: 'Leiloeiro',
  arrematante: 'Arrematante',
  cliente: 'Cliente',
};

// Deriva o "Tipo" de rede a partir do cadastro real (role, cargos e contextos)
export function deriveRoleType(u) {
  const levels = Array.isArray(u.career_levels) ? u.career_levels : [];
  if (u.role === 'leiloeiro') return 'leiloeiro';
  if (u.role === 'investidor') return 'investidor';
  if (levels.includes('influenciador') || levels.includes('influencer')) return 'influencer';
  if (u.is_seller || levels.includes('vendedor')) return 'vendedor';
  if (u.licenciado_context?.enabled || levels.includes('licenciado_catalogo') || levels.includes('licenciado_aplicativo')) return 'licenciado';
  if (u.arrematante_context?.enabled) return 'arrematante';
  return 'cliente';
}

export function buildUnifiedCustomers({ appUsers = [], catalogSales = [], auctions = [], manualCustomers = [] }) {
  const byId = new Map();

  // 1) Base: todos os usuários cadastrados
  appUsers.forEach((u) => {
    if (!u.id) return;
    const address = [u.address_street, u.address_number, u.address_city, u.address_state, u.address_zip_code]
      .filter(Boolean).join(', ');
    byId.set(u.id, {
      id: `u_${u.id}`,
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
      total_spent: 0,
      auctions_won: 0,
    });
  });

  // 2) Compras da Loja Virtual — soma por conta real (buyer_id); sem conta, entra avulso
  const guestBuyers = new Map();
  catalogSales.forEach((s) => {
    const amount = Number(s.total_amount) || 0;
    const target = s.buyer_id && byId.get(s.buyer_id);
    if (target) {
      target.total_spent += amount;
      target.status = 'cliente';
      const mapped = PURCHASE_STATUS_MAP[s.status];
      if (mapped) target.purchase_status = mapped;
      if (!target.source.includes('loja_virtual')) target.source = `${target.source}+loja_virtual`;
      if (!target.last_contact || new Date(s.created_date) > new Date(target.last_contact)) target.last_contact = s.created_date;
      return;
    }
    const key = normKey(s.buyer_email, s.buyer_phone);
    if (!key) return;
    const existing = guestBuyers.get(key);
    const address = [s.buyer_address, s.buyer_cep].filter(Boolean).join(' · ');
    if (existing) {
      existing.total_spent += amount;
      const mapped = PURCHASE_STATUS_MAP[s.status];
      if (mapped) existing.purchase_status = mapped;
      if (!existing.last_contact || new Date(s.created_date) > new Date(existing.last_contact)) existing.last_contact = s.created_date;
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
        total_spent: amount,
        auctions_won: 0,
      });
    }
  });

  // 3) Arremates em Leilões — soma por conta real (winner_id)
  auctions.forEach((a) => {
    if (!a.winner_id) return;
    const target = byId.get(a.winner_id);
    if (!target) return;
    target.total_spent += Number(a.current_price) || 0;
    target.status = 'cliente';
    target.auctions_won += 1;
    if (!target.source.includes('leilao')) target.source = `${target.source}+leilao`;
    if (a.end_time && (!target.last_contact || new Date(a.end_time) > new Date(target.last_contact))) target.last_contact = a.end_time;
  });

  const autoList = [...byId.values(), ...guestBuyers.values()];
  const autoKeys = new Set(autoList.map((c) => normKey(c.email, c.phone)).filter(Boolean));

  // 4) Cadastro manual — só entra se a pessoa não existir em nenhuma fonte automática
  const manualList = manualCustomers
    .filter((c) => !autoKeys.has(normKey(c.email, c.phone)))
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
      total_spent: c.total_spent || 0,
      auctions_won: 0,
      notes: c.notes,
      raw: c,
    }));

  return [...autoList, ...manualList];
}