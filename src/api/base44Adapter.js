/**
 * Adapter Base44 SDK → Supabase.
 * Exporta um objeto `base44` com a mesma interface do SDK original
 * para que TODAS as páginas continuem funcionando sem mudança.
 *
 * Métodos suportados nas entidades:
 *   - list(orderBy, limit)
 *   - filter(filters, orderBy, limit)
 *   - get(id)
 *   - create(data)
 *   - update(id, data)
 *   - delete(id)
 *   - bulkCreate(rows)
 *   - subscribe(callback) [realtime]
 *
 * Functions: redirecionadas para /api/functions/<name> (Vercel) ou Edge Functions.
 */
import { supabase } from './supabaseClient';

// Mapa Entidade → tabela (snake_case plural)
const TABLE_MAP = {
  AppUser: 'app_users',
  Arrematante: 'arrematantes',
  AsaasOrder: 'asaas_payments',
  AsaasPayment: 'asaas_payments',
  Auction: 'auctions',
  AuctionMessage: 'auction_messages',
  AuctionView: 'auction_views',
  BannerImage: 'banner_images',
  BatchRegistration: 'batch_registrations',
  Bid: 'bids',
  CashRegister: 'cash_registers',
  CatalogProduct: 'products',
  CatalogSale: 'catalog_sales',
  CatalogSettings: 'catalog_settings',
  CatalogVisit: 'catalog_visits',
  Category: 'categories',
  CommissionRecord: 'commission_records',
  ComparaiLog: 'comparai_logs',
  Customer: 'customers',
  DepositPackage: 'deposit_packages',
  DigitalWallet: 'digital_wallets',
  DigitalWalletTransaction: 'digital_wallet_transactions',
  FavoriteAuction: 'favorite_auctions',
  FeaturedProduct: 'featured_products',
  FinancialExpense: 'financial_expenses',
  FooterSettings: 'footer_settings',
  FreteSettings: 'frete_settings',
  InfluencerLead: 'influencer_leads',
  InfluencerPurchase: 'influencer_purchases',
  LicenseeLead: 'licensee_leads',
  LiveSession: 'live_sessions',
  LoteCota: 'lotes_recebidos',
  LoteRecebido: 'lotes_recebidos',
  LuxuryAccessCode: 'luxury_access_codes',
  LuxuryAuction: 'luxury_auctions',
  Negotiation: 'negotiations',
  PartnerPlanPurchase: 'partner_plan_purchases',
  Payment: 'payments',
  PaymentSettings: 'payment_settings',
  PriceHistory: 'price_history',
  PricingFormula: 'pricing_formulas',
  Product: 'products',
  ProductOperation: 'product_operations',
  Sale: 'sales',
  SaleCommission: 'sale_commissions',
  Seller: 'sellers',
  Store: 'stores',
  SystemLog: 'system_logs',
  TaxSettings: 'tax_settings',
  User: 'app_users',
  UserPreference: 'user_preferences',
  Wallet: 'wallets',
  WalletTransaction: 'wallet_transactions',
  WithdrawalRequest: 'withdrawal_requests',
};

// Campos renomeados durante migração (entidade → { old: new })
const FIELD_MAP = {
  BannerImage: { order: 'sort_order' },
  FeaturedProduct: { order: 'sort_order' },
};

const INVERSE_FIELD_MAP = Object.fromEntries(
  Object.entries(FIELD_MAP).map(([e, m]) => [e, Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]))])
);

function mapToDB(entity, data) {
  if (!data || typeof data !== 'object') return data;
  const fmap = FIELD_MAP[entity] || {};
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[fmap[k] || k] = v;
  }
  return out;
}

function mapFromDB(entity, row) {
  if (!row || typeof row !== 'object') return row;
  const fmap = INVERSE_FIELD_MAP[entity] || {};
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'raw_base44') continue; // não expor coluna interna
    out[fmap[k] || k] = v;
  }
  return out;
}

function parseOrderBy(orderBy) {
  if (!orderBy) return null;
  if (typeof orderBy === 'string') {
    const desc = orderBy.startsWith('-');
    return { column: desc ? orderBy.slice(1) : orderBy, ascending: !desc };
  }
  return null;
}

function applyOrderBy(query, orderBy) {
  const o = parseOrderBy(orderBy);
  if (o) query = query.order(o.column, { ascending: o.ascending });
  return query;
}

function applyFilters(query, entity, filters) {
  if (!filters || typeof filters !== 'object') return query;
  const fmap = FIELD_MAP[entity] || {};
  for (const [key, value] of Object.entries(filters)) {
    const col = fmap[key] || key;
    if (value === null || value === undefined) {
      query = query.is(col, null);
    } else if (Array.isArray(value)) {
      query = query.in(col, value);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Operadores Base44: { $gt: 5 }, { $lt: 10 }
      for (const [op, opVal] of Object.entries(value)) {
        if (op === '$gt') query = query.gt(col, opVal);
        else if (op === '$gte') query = query.gte(col, opVal);
        else if (op === '$lt') query = query.lt(col, opVal);
        else if (op === '$lte') query = query.lte(col, opVal);
        else if (op === '$ne') query = query.neq(col, opVal);
        else if (op === '$in') query = query.in(col, opVal);
        else if (op === '$like' || op === '$contains') query = query.ilike(col, `%${opVal}%`);
        else query = query.eq(col, opVal);
      }
    } else {
      query = query.eq(col, value);
    }
  }
  return query;
}

function entityProxy(entity) {
  const table = TABLE_MAP[entity];
  if (!table) {
    console.warn(`[base44Adapter] Entidade desconhecida: ${entity}`);
    return null;
  }

  return {
    async list(orderBy, limit) {
      let q = supabase.from(table).select('*');
      q = applyOrderBy(q, orderBy);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data.map((r) => mapFromDB(entity, r));
    },

    async filter(filters, orderBy, limit) {
      let q = supabase.from(table).select('*');
      q = applyFilters(q, entity, filters);
      q = applyOrderBy(q, orderBy);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data.map((r) => mapFromDB(entity, r));
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? mapFromDB(entity, data) : null;
    },

    async create(data) {
      const { data: row, error } = await supabase
        .from(table)
        .insert(mapToDB(entity, data))
        .select()
        .single();
      if (error) throw error;
      return mapFromDB(entity, row);
    },

    async update(id, data) {
      const { data: row, error } = await supabase
        .from(table)
        .update(mapToDB(entity, data))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return mapFromDB(entity, row);
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    async bulkCreate(rows) {
      const payload = (rows || []).map((r) => mapToDB(entity, r));
      const { data, error } = await supabase.from(table).insert(payload).select();
      if (error) throw error;
      return data.map((r) => mapFromDB(entity, r));
    },

    subscribe(callback) {
      const channel = supabase
        .channel(`realtime:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          callback(payload);
        })
        .subscribe();
      return () => supabase.removeChannel(channel);
    },
  };
}

// Construir objeto entities como Proxy lazy
const entities = new Proxy(
  {},
  {
    get(_target, name) {
      if (typeof name !== 'string') return undefined;
      return entityProxy(name);
    },
  }
);

// Functions: redireciona pra /api/functions/<name> (Vercel API routes que adicionamos depois)
async function invokeFunction(name, body, options = {}) {
  const url = `/api/functions/${name}`;
  const resp = await fetch(url, {
    method: options.method || 'POST',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Function ${name} failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

const functions = new Proxy(
  {
    invoke: invokeFunction,
  },
  {
    get(target, name) {
      if (name in target) return target[name];
      // Compat: base44.functions.someFunction(body) ou base44.functions.invoke(name, body)
      return (body, opts) => invokeFunction(name, body, opts);
    },
  }
);

// Integrations.Core (UploadFile e similares)
const integrations = {
  Core: {
    async UploadFile({ file, path }) {
      const bucket = 'public-assets';
      const finalPath =
        path ||
        `uploads/${Date.now()}_${(file?.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error } = await supabase.storage.from(bucket).upload(finalPath, file, {
        upsert: true,
        contentType: file?.type,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(finalPath);
      return { file_url: pub.publicUrl, url: pub.publicUrl, path: finalPath };
    },
  },
};

// Auth (Base44 tinha ações específicas — vamos delegar pro Supabase Auth)
const auth = {
  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async logout() {
    return supabase.auth.signOut();
  },
  async getUser() {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  },
};

// Service role (alias) — usado por functions server-side; no client cai no mesmo
const asServiceRole = { entities, functions, integrations };

export const base44 = {
  entities,
  functions,
  integrations,
  auth,
  asServiceRole,
  // Mantém referência ao raw supabase pra quem quiser usar direto
  __supabase: supabase,
};

export default base44;
