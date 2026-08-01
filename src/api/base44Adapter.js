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
  Passaporte: 'passaportes',
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
  // 🩹 Tabela real de saques usa nomes diferentes da entidade/legado
  WithdrawalRequest: { influencer_id: 'user_id', amount: 'valor', created_date: 'created_at', pix_key_type: 'pix_tipo' },
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
  // 🛡️ Sanitiza campos numéricos nulos para Auction (evita crash .toFixed no AuctionRoom)
  if (entity === 'Auction') {
    if (out.starting_price === null || out.starting_price === undefined) out.starting_price = 0;
    if (out.increment === null || out.increment === undefined) out.increment = 0;
    if (out.current_price === null || out.current_price === undefined) out.current_price = out.starting_price || 0;
    if (out.buy_now_price === null || out.buy_now_price === undefined) out.buy_now_price = 0;
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

function applyOrderBy(query, orderBy, entity) {
  const o = parseOrderBy(orderBy);
  if (o) {
    const fmap = FIELD_MAP[entity] || {};
    query = query.order(fmap[o.column] || o.column, { ascending: o.ascending });
  }
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

// 🆕 Escritas de OPERADOR (admin/super_admin OU cargo de estoque) passam por rota service_role
// (anon não persiste por RLS). Usuário comum mantém o comportamento atual (sem escalonar privilégio).
const _OP_STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];
function _operatorActor() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const u = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!u?.id) return null;
    const isOp = ['admin', 'super_admin'].includes(u.role) ||
      (Array.isArray(u.career_levels) && u.career_levels.some((c) => _OP_STOCK.includes(c)));
    return isOp ? u : null;
  } catch { return null; }
}
async function _routeWrite(table, action, id, payload) {
  const op = _operatorActor();
  if (!op) return { _skip: true };
  try {
    const resp = await fetch('/api/functions/entityWrite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId: op.id, table, action, id, payload }),
    });
    return await resp.json();
  } catch (e) { return { success: false, error: String(e?.message || e) }; }
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
      q = applyOrderBy(q, orderBy, entity);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data.map((r) => mapFromDB(entity, r));
    },

    async filter(filters, orderBy, limit, offset) {
      let q = supabase.from(table).select('*');
      q = applyFilters(q, entity, filters);
      q = applyOrderBy(q, orderBy, entity);
      if (offset != null && limit) q = q.range(offset, offset + limit - 1);
      else if (limit) q = q.limit(limit);
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
      const payload = mapToDB(entity, data);
      const w = await _routeWrite(table, 'create', null, payload);
      if (!w._skip) { // operador: a rota é autoritativa (não cai no anon)
        if (w.success && w.rows?.[0]) return mapFromDB(entity, w.rows[0]);
        throw new Error(w.error || w.details || 'Falha ao salvar (servidor)');
      }
      const { data: row, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return mapFromDB(entity, row);
    },

    async update(id, data) {
      const payload = mapToDB(entity, data);
      const w = await _routeWrite(table, 'update', id, payload);
      if (!w._skip) {
        if (w.success) return mapFromDB(entity, w.rows?.[0] || { id, ...payload });
        throw new Error(w.error || w.details || 'Falha ao salvar (servidor)');
      }
      const { data: row, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return mapFromDB(entity, row);
    },

    async delete(id) {
      const w = await _routeWrite(table, 'delete', id, null);
      if (!w._skip) {
        if (w.success) return { success: true };
        throw new Error(w.error || w.details || 'Falha ao excluir (servidor)');
      }
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    async bulkCreate(rows) {
      const payload = (rows || []).map((r) => mapToDB(entity, r));
      const w = await _routeWrite(table, 'bulkCreate', null, payload);
      if (!w._skip && w.success && Array.isArray(w.rows)) return w.rows.map((r) => mapFromDB(entity, r));
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

// Functions: redireciona pra /api/functions/<name> (Vercel API routes).
// Tolerante a "not implemented": se a function não existir como API route,
// retorna { ok: false, error: 'not_implemented' } em vez de throw — mantém
// a UI viva enquanto a migração das ~190 functions Base44 está em andamento.
async function invokeFunction(name, body, options = {}) {
  const url = `/api/functions/${name}`;
  try {
    const resp = await fetch(url, {
      method: options.method || 'POST',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (resp.status === 404 || resp.status === 405 || resp.status === 501) {
      // 405 = POST caiu no rewrite do index.html (function ainda não existe como API route)
      if (typeof console !== 'undefined') console.warn(`[base44.functions] '${name}' não implementada ainda (${resp.status}) — stub`);
      return { ok: false, error: 'not_implemented', name, status: resp.status };
    }
    // 🩹 CAUSA-RAIZ do "Erro ao enviar lance.": as functions (submitAtomicBid,
    // reserveBidBalance, etc.) já respondem com JSON detalhado (success:false,
    // conflict, message) mesmo em status 400/401/409/500 — mas aqui isso virava
    // um throw genérico, perdendo a mensagem real e pulando a lógica de
    // tratamento (atomicData?.conflict / atomicData?.message) que as telas já têm.
    // Se o corpo é um JSON válido, devolve ele; só lança erro genérico se não for.
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Function ${name} failed: ${resp.status} ${text}`);
      }
    }
    return resp.json();
  } catch (err) {
    if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
      if (typeof console !== 'undefined') console.warn(`[base44.functions] '${name}' fetch falhou — stub`, err.message);
      return { ok: false, error: 'network_or_not_implemented', name };
    }
    throw err;
  }
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

// Integrations.Core — UploadFile usa Supabase Storage. InvokeLLM/SendEmail/etc.
// caem no shim de functions (`/api/integrations/<name>`) ou retornam stub.
async function invokeIntegration(name, body) {
  const url = `/api/integrations/${name}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (resp.status === 404) {
      if (typeof console !== 'undefined') console.warn(`[base44.integrations.Core] '${name}' não implementada — stub`);
      return { ok: false, error: 'not_implemented', name };
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Integration ${name} failed: ${resp.status} ${text}`);
    }
    return resp.json();
  } catch (err) {
    if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
      if (typeof console !== 'undefined') console.warn(`[base44.integrations.Core] '${name}' fetch falhou — stub`, err.message);
      return { ok: false, error: 'network_or_not_implemented', name };
    }
    throw err;
  }
}

const CoreImpl = {
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
};

const Core = new Proxy(CoreImpl, {
  get(target, name) {
    if (name in target) return target[name];
    if (typeof name === 'symbol') return undefined;
    // base44.integrations.Core.InvokeLLM(body) etc → POST /api/integrations/<name>
    return (body) => invokeIntegration(name, body);
  },
});

const integrations = { Core };

// Auth (Base44 tinha ações específicas — vamos delegar pro Supabase Auth)
// me() é alias de getUser() pra compat com código legado (User.me()).
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
  async me() {
    // Compat Base44: User.me() retornava o user logado OU lançava erro.
    // Hoje: tenta localStorage (LoginModal salva lá); fallback Supabase Auth.
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('currentUser') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id && parsed?.email) return parsed;
      }
    } catch { /* ignora */ }
    const { data } = await supabase.auth.getUser();
    if (data?.user) return data.user;
    const err = new Error('Not authenticated');
    err.status = 401;
    throw err;
  },
  // Base44 SDK redirecionava pra /login da plataforma; aqui é no-op (LoginModal cobre).
  redirectToLogin() { /* no-op */ },
};

// Analytics: stub (Base44 mandava pra plataforma deles; aqui é no-op).
// Pra ter analytics real, plugar PostHog/Mixpanel aqui depois.
const analytics = {
  track() { return Promise.resolve({ ok: true }); },
  identify() { return Promise.resolve({ ok: true }); },
  page() { return Promise.resolve({ ok: true }); },
};

// Service role (alias) — usado por functions server-side; no client cai no mesmo
const asServiceRole = { entities, functions, integrations };

export const base44 = {
  entities,
  functions,
  integrations,
  auth,
  analytics,
  asServiceRole,
  // Mantém referência ao raw supabase pra quem quiser usar direto
  __supabase: supabase,
};

export default base44;