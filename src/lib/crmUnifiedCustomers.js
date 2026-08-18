// 🧭 CRM unificado (18/08/2026) — antes só existiam clientes cadastrados à mão
// (entidade Customer). Agora a lista "Clientes" soma 3 fontes automáticas:
//   1) AppUser com referred_by_id = eu → quem se cadastrou pelo meu link (rede/app/leilão)
//   2) CatalogSale com licensee_id = eu → quem comprou na minha Loja Virtual
//   3) Customer (cadastro manual) → leads que ainda não compraram nem se cadastraram
// Dedupe por email/telefone: a mesma pessoa nas fontes 1+2 vira UMA linha só.

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

export function buildUnifiedCustomers({ appUsers = [], catalogSales = [], manualCustomers = [] }) {
  const byKey = new Map();

  const upsert = (key, patch) => {
    if (!key) return null;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...patch });
      return byKey.get(key);
    }
    // Mescla: mantém o que já existe, só completa o que faltar / soma o que acumula.
    if (!existing.address && patch.address) existing.address = patch.address;
    if (!existing.assigned_seller && patch.assigned_seller) existing.assigned_seller = patch.assigned_seller;
    existing.total_spent = (existing.total_spent || 0) + (patch.total_spent || 0);
    if (patch.total_spent > 0) existing.status = 'cliente';
    if (patch.purchase_status && patch.purchase_status !== 'sem_compra') existing.purchase_status = patch.purchase_status;
    if (patch.last_contact && (!existing.last_contact || new Date(patch.last_contact) > new Date(existing.last_contact))) {
      existing.last_contact = patch.last_contact;
    }
    if (patch.source && !existing.source.includes(patch.source)) {
      existing.source = `${existing.source}+${patch.source}`;
    }
    return existing;
  };

  // 1) Indicados (rede/app/leilão)
  appUsers.forEach((u) => {
    const key = normKey(u.email, u.phone);
    if (!key) return;
    const address = [u.address_street, u.address_number, u.address_city, u.address_state, u.address_zip_code]
      .filter(Boolean).join(', ');
    upsert(key, {
      id: `au_${u.id}`,
      origin_type: 'auto',
      full_name: u.full_name || u.nickname || 'Sem nome',
      email: u.email || '',
      phone: u.phone || '',
      cpf: u.cpf || '',
      address,
      status: 'lead',
      purchase_status: 'sem_compra',
      source: 'indicacao',
      assigned_seller: '',
      last_contact: u.created_date,
      total_spent: 0,
    });
  });

  // 2) Compras da Loja Virtual
  catalogSales.forEach((s) => {
    const key = normKey(s.buyer_email, s.buyer_phone);
    if (!key) return;
    const address = [s.buyer_address, s.buyer_cep].filter(Boolean).join(' · ');
    upsert(key, {
      id: `cs_${s.id}`,
      origin_type: 'auto',
      full_name: s.buyer_name || 'Sem nome',
      email: s.buyer_email || '',
      phone: s.buyer_phone || '',
      cpf: '',
      address,
      status: 'cliente',
      purchase_status: PURCHASE_STATUS_MAP[s.status] || 'sem_compra',
      source: 'loja_virtual',
      assigned_seller: '',
      last_contact: s.created_date,
      total_spent: Number(s.total_amount) || 0,
    });
  });

  const autoList = Array.from(byKey.values());
  const autoKeys = new Set(byKey.keys());

  // 3) Cadastro manual — só entra se não já existir uma linha automática pra mesma pessoa
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
      status: c.status || 'lead',
      purchase_status: c.purchase_status || 'sem_compra',
      source: c.source || 'outro',
      assigned_seller: c.assigned_seller || '',
      last_contact: c.last_contact,
      total_spent: c.total_spent || 0,
      notes: c.notes,
      raw: c,
    }));

  return [...autoList, ...manualList];
}