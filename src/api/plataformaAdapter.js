/**
 * ══════════════════════════════════════════════════════════════════════════
 * 📜 MEMÓRIA DO PROJETO — leia antes de mexer aqui (21/08/2026)
 * ══════════════════════════════════════════════════════════════════════════
 * A Leilão NoZap NASCEU na Base44 — plataforma de criar app com IA, a
 * primeira IA do projeto, a que montou a base inicial. Fica registrado aqui
 * de propósito: não é vergonha, é história.
 *
 * O app cortou o cordão com os SERVIDORES da Base44 (SDK, plugin, mídia —
 * tudo saiu de lá). Só ficou a FORMA da API (`.entities`, `.functions.invoke`,
 * `.auth`), porque centenas de telas já chamavam esse formato. Este arquivo é
 * esse adapter: por fora parece o SDK antigo, por dentro fala só com o
 * Supabase e as rotas da Vercel do próprio projeto — a pasta `base44/` na
 * raiz do repo guarda os arquivos originais como espelho histórico.
 *
 * O identificador chamava-se `base44`; virou `plataforma` em 21/08/2026 a
 * pedido do dono — o nome antigo confundia, parecendo dependência viva do
 * servidor de terceiro, quando só o nome tinha ficado velho.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Adapter da API estilo Base44 → Supabase.
 * Exporta um objeto `plataforma` com a mesma interface do SDK original
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

import { lerCracha, guardarCracha, cabecalhosSessao } from '@/lib/sessaoCliente';
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
  CaptacaoOportunidade: 'captacao_oportunidades',
  MetodoPerfil: 'metodo_perfil', // 📖 DIR-43 — sonhos, rotina, script, apresentação
  MetodoTarefa: 'metodo_tarefas', // 📖 DIR-43 — Master Task diário
  Customer: 'customers',
  DepositPackage: 'deposit_packages',
  DigitalWallet: 'digital_wallets',
  DigitalWalletTransaction: 'digital_wallet_transactions',
  FavoriteAuction: 'favorite_auctions',
  FeaturedProduct: 'featured_products',
  FinancialExpense: 'financial_expenses',
  FinancialIncome: 'financial_income',
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
  // 🔓 raw_base44 só é ocultado de usuários comuns. Operador (admin/super_admin/
  // cargo de estoque) precisa dela — é onde vive o frete/etiqueta da Melhor Envio
  // usado no CatalogOrdersAdmin. Reusa a mesma checagem já usada pros escritos.
  const isOperator = !!_operatorActor();
  for (const [k, v] of Object.entries(row)) {
    if (k === 'raw_base44' && !isOperator) continue; // não expor coluna interna a não-operadores
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
    // 🔴 NULO NUNCA NA FRENTE (03/09/2026) — no Postgres, `ORDER BY x DESC` põe
    // NULL PRIMEIRO. Um lance com `created_date` nulo aparecia como o MAIS
    // RECENTE em "Últimos lances", na frente de lances de verdade. O dono viu:
    // R$ 1,60 (o mais antigo) no topo, e ainda marcado "há 57 anos" — a Época
    // do Unix. `nullsFirst: false` vale para toda consulta do app: linha sem
    // data vai para o FIM, tanto em asc quanto em desc.
    query = query.order(fmap[o.column] || o.column, { ascending: o.ascending, nullsFirst: false });
  }
  // 🔒 DESEMPATE ESTÁVEL (Ponto 93, 19/08/2026) — sem uma 2ª coluna, empate na coluna
  // principal (ex.: created_date IDÊNTICO em centenas de produtos de um mesmo lote
  // importado de uma vez) faz o Postgres reordenar os empatados a cada consulta.
  // Efeito prático: paginação por LIMIT/OFFSET (Catalog.jsx → loadMore) pula produto
  // de uma página pra outra — ele existe, está ativo, mas nunca aparece navegando
  // (só a busca acha, porque roda numa consulta só, sem paginar). id é sempre único:
  // garante a MESMA ordem em toda consulta, então nenhuma linha some entre páginas.
  query = query.order('id', { ascending: true });
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
    // 💼 DIR-32 — admin_financeiro é operador (lança receita/despesa etc.)
    const isOp = ['admin', 'super_admin', 'admin_financeiro'].includes(u.role) ||
      (Array.isArray(u.career_levels) && u.career_levels.some((c) => _OP_STOCK.includes(c)));
    return isOp ? u : null;
  } catch { return null; }
}
// 🛡️ FREIO DE RATE LIMIT — /api/functions/entityWrite (12/08/2026)
// Todo escrita de operador (admin/estoque) passa por este único endpoint. Sem
// proteção, uma rajada de escritas (ex: várias telas admin salvando ao mesmo
// tempo) estourava o limite do servidor (HTTP 429) sem nenhum recuo — cada
// chamada seguinte tentava de novo na mesma hora e prolongava o bloqueio.
// Agora: 1 x 429 → pausa 90s SEM nem tentar de novo; 429 repetido → dobra a
// pausa (até 5min). Sucesso → volta ao normal.
const ENTITY_WRITE_BASE_COOLDOWN_MS = 90000; // 90s
const ENTITY_WRITE_MAX_COOLDOWN_MS = 300000; // 5min
let _entityWriteBlockedUntil = 0;
let _entityWriteCooldownMs = ENTITY_WRITE_BASE_COOLDOWN_MS;

// ══════════════════════════════════════════════════════════════════════════════
// 🚨 FREIO DE RAJADA — corta ANTES de sair do navegador (21/08/2026)
// ══════════════════════════════════════════════════════════════════════════════
// O freio logo acima (12/08) só reage DEPOIS que o servidor devolve 429: a
// rajada já saiu, já custou execução na Vercel e já entupiu o log. Em 20/08 o
// log de produção registrou 9 MIL chamadas desta rota em meia hora, milhares
// delas no mesmo segundo, do mesmo usuário. Não foi ataque: é alguma tela
// disparando escrita em laço — o padrão de `array.forEach(x => Entity.update(x))`
// sem esperar, que enfileira tudo de uma vez.
//
// Este freio conta as chamadas dos últimos 60s. Passou do teto, para de mandar.
//
// O TETO É ALTO DE PROPÓSITO: operação legítima em massa tem que passar. Gerar
// 3.000 produtos de um lote faz ~126 chamadas (o gerador grava de 25 em 25),
// então 200/min deixa passar com folga. Quem bate nesse teto não é trabalho
// normal — é laço.
//
// E o mais útil: ao travar, ele grava UMA linha em system_logs dizendo QUAL
// tabela e QUAL ação dominaram a rajada. Aviso no console do navegador some
// quando a aba fecha; esta linha fica no banco e aparece no log da Vercel. É o
// que vai identificar a tela culpada sem ninguém precisar adivinhar.
const RAJADA_JANELA_MS = 60000;
const RAJADA_TETO = 200;
let _rajadaEventos = [];      // [{ t, rotulo }]
let _rajadaJaAvisou = false;

function _registraEContaRajada(rotulo) {
  const agora = Date.now();
  _rajadaEventos = _rajadaEventos.filter((e) => agora - e.t < RAJADA_JANELA_MS);
  _rajadaEventos.push({ t: agora, rotulo });
  if (_rajadaEventos.length <= RAJADA_TETO) _rajadaJaAvisou = false;
  return _rajadaEventos.length;
}

/** Quem dominou a rajada, em ordem: "products/update x812, orders/update x40". */
function _resumoRajada() {
  const c = {};
  for (const e of _rajadaEventos) c[e.rotulo] = (c[e.rotulo] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} x${v}`).join(', ');
}

// Grava o aviso no banco passando POR FORA do freio (senão o próprio aviso seria
// barrado). Uma vez por rajada, best-effort: falhar aqui não pode atrapalhar nada.
async function _avisaRajada(actorId) {
  if (_rajadaJaAvisou) return;
  _rajadaJaAvisou = true;
  const resumo = _resumoRajada();
  console.error(`[RAJADA] ${_rajadaEventos.length} escritas em 60s — bloqueado no navegador. Origem: ${resumo}`);
  try {
    await fetch('/api/functions/entityWrite', {
      method: 'POST',
      headers: cabecalhosSessao({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        actorId, table: 'system_logs', action: 'create',
        payload: {
          component_name: 'freioRajadaEntityWrite',
          step: 'RAJADA_BLOQUEADA',
          status: 'warning',
          message: `${_rajadaEventos.length} escritas em 60s pelo mesmo navegador. Origem: ${resumo}. Tela: ${typeof location !== 'undefined' ? location.pathname : '?'}`,
          created_date: new Date().toISOString(),
        },
      }),
    });
  } catch { /* best effort: o console já registrou */ }
}

async function _routeWrite(table, action, id, payload) {
  const op = _operatorActor();

  // ══════════════════════════════════════════════════════════════════════════
  // 🔴 PONTO 130 (25/08/2026) — CLIENTE COMUM NÃO CONSEGUIA SALVAR O PRÓPRIO
  //    CADASTRO. NEM O ENDEREÇO, NEM O TELEFONE, NEM O CEP.
  // ══════════════════════════════════════════════════════════════════════════
  // Sem operador, esta função devolvia `_skip` e a escrita ia direto do
  // NAVEGADOR para o Supabase com a chave pública. Em `app_users` isso é no-op
  // silencioso — está escrito no topo de api/functions/adminUpdateUser.js:
  //
  //     "UPDATE direto via PostgREST dá no-op silencioso
  //      (RLS de escrita é só pra 'authenticated')"
  //
  // Como o adapter ainda chama `.select().single()` depois, zero linhas viram
  // erro do PostgREST — e a pessoa via, no print de 25/08:
  //
  //     "Erro ao atualizar perfil: Cannot coerce the result to a single JSON object"
  //
  // Foi isso que prendeu os clientes novos no leilão: sem CEP no cadastro, a
  // sala nunca conseguia cotar o frete, e a tela de Perfil também não salvava.
  //
  // Agora quem não é operador salva O PRÓPRIO cadastro por uma rota de servidor,
  // com lista fechada de campos e identidade tirada do crachá de sessão.
  if (!op && table === 'app_users' && action === 'update') {
    let eu = null;
    try { eu = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { /* sem cache */ }
    // Só o próprio cadastro. Editar o de outra pessoa continua sendo coisa de
    // operador — e o servidor recusa de qualquer jeito, pelo crachá.
    if (!eu?.id || String(eu.id) !== String(id)) return { _skip: true };
    try {
      const resp = await fetch('/api/functions/atualizarMeuCadastro', {
        method: 'POST', headers: cabecalhosSessao({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ user_id: id, updates: payload }),
      });
      const j = await resp.json();
      if (j.success) return { success: true, rows: [j.user] };
      return { success: false, error: j.error, details: j.detalhe || j.motivo };
    } catch (e) { return { success: false, error: String(e?.message || e) }; }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 🔴 02/09/2026 — "ERRO AO SALVAR CLIENTE" NO CRM, PRA QUEM NÃO É ADMIN
  // ══════════════════════════════════════════════════════════════════════════
  // Mesma armadilha do PONTO 130 acima, um andar adiante. Em 30/08 o CRM foi
  // aberto pra toda a Central de Vendas (DIR-24 Fase 2, CrmClientesTab.jsx) —
  // mas só a LEITURA passou. Salvar continuava caindo no `_skip` daqui, indo do
  // navegador direto ao PostgREST como `anon`. E a RLS de `customers` é:
  //     SELECT → anon + authenticated   ← por isso a lista APARECE
  //     INSERT → só authenticated       ← e o site não usa Supabase Auth,
  //                                       o navegador é SEMPRE anon
  // Medido em 02/09: a tabela `customers` inteira tem 4 linhas — três de
  // fevereiro, da era Base44, e UMA criada desde então, por um admin. Ninguém
  // sem cargo de operador jamais salvou um cliente neste sistema.
  //
  // As tabelas do CRM passam a usar a mesma rota de servidor dos operadores.
  // Aqui é só ROTEAMENTO: quem decide a permissão é o servidor (entityWrite),
  // que lê o cargo do banco e limita a edição às linhas da própria pessoa.
  // `delete` fica de fora de propósito — apagar cliente segue sendo de operador.
  // Só `customers` — o servidor recusa o resto. `negotiations` ficaria de fora
  // de qualquer jeito: sem coluna de dono, não dá pra limitar a edição.
  const TABELAS_CRM = ['customers'];
  let ator = op;
  if (!ator && TABELAS_CRM.includes(table) && action !== 'delete') {
    try { ator = JSON.parse(localStorage.getItem('currentUser') || 'null') || null; } catch { ator = null; }
    if (!ator?.id) ator = null;
  }
  if (!ator) return { _skip: true };
  // 🩹 app_users tem rota dedicada (adminUpdateUser) — entityWrite recusa essa tabela
  // de propósito (dados sensíveis de usuário/cargo). create continua no fallback
  // anon/Supabase direto, pois adminUpdateUser não cobre criação.
  if (table === 'app_users') {
    if (action === 'create') return { _skip: true };
    if (action === 'update') {
      try {
        const resp = await fetch('/api/functions/adminUpdateUser', {
          method: 'POST', headers: cabecalhosSessao({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ userId: id, updates: payload, actorId: op.id }),
        });
        const j = await resp.json();
        if (j.success) return { success: true, rows: [j.user] };
        return { success: false, error: j.error, details: j.details };
      } catch (e) { return { success: false, error: String(e?.message || e) }; }
    }
    // delete: mantém o comportamento atual (fora de escopo desta correção)
  }
  // 🚨 Freio de rajada: corta antes de sair do navegador (ver bloco acima).
  const quantas = _registraEContaRajada(`${table}/${action}`);
  if (quantas > RAJADA_TETO) {
    _avisaRajada(ator.id);
    return { success: false, error: 'rajada_local', details: `Muitas escritas seguidas (${quantas} em 60s). Bloqueado para proteger o servidor.` };
  }

  // Em cooldown (rate limit recente): não tenta de novo, só devolve o erro.
  const agora = Date.now();
  if (agora < _entityWriteBlockedUntil) {
    return { success: false, error: 'rate_limit_cooldown', details: `Aguardando ${Math.ceil((_entityWriteBlockedUntil - agora) / 1000)}s antes de tentar novamente` };
  }
  try {
    const resp = await fetch('/api/functions/entityWrite', {
      method: 'POST', headers: cabecalhosSessao({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ actorId: ator.id, table, action, id, payload }),
    });
    if (resp.status === 429) {
      _entityWriteBlockedUntil = Date.now() + _entityWriteCooldownMs;
      _entityWriteCooldownMs = Math.min(_entityWriteCooldownMs * 2, ENTITY_WRITE_MAX_COOLDOWN_MS);
      return { success: false, error: 'rate_limit', details: 'Limite de escritas atingido — aguardando antes de tentar novamente' };
    }
    // Sucesso: recupera o intervalo de pausa pro valor base
    _entityWriteCooldownMs = ENTITY_WRITE_BASE_COOLDOWN_MS;
    return await resp.json();
  } catch (e) { return { success: false, error: String(e?.message || e) }; }
}

function entityProxy(entity) {
  const table = TABLE_MAP[entity];
  if (!table) {
    console.warn(`[plataformaAdapter] Entidade desconhecida: ${entity}`);
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
// ─────────────────────────────────────────────────────────────
// 🕵️ PONTO 88 (FASE 1) — REGISTRO DE FALHA DE SERVIDOR
//
// Este é o FUNIL ÚNICO de todas as chamadas de servidor do app (~190 funções).
// Antes desta data, TODA falha de servidor era engolida aqui: 404/501 virava
// stub, erro 500 era devolvido como JSON que ninguém conferia, e falha de rede
// virava stub. Nenhuma deixava rastro — inclusive nos fluxos de dinheiro
// (pagamento, comissão, lance, frete, carteira).
//
// ⚠️ POR QUE O IMPORT É SOB DEMANDA (e não no topo do arquivo):
// `logDedupe` importa `plataforma`, que é ESTE arquivo → import no topo cria
// DEPENDÊNCIA CIRCULAR e pode quebrar o carregamento do app inteiro.
// Carregar só no momento do erro corta o ciclo. NÃO mover para o topo.
//
// 🔒 REGRA INVIOLÁVEL: registrar NUNCA pode mudar o comportamento. Se o log
// falhar, falha calado — o valor de retorno de invokeFunction é idêntico ao
// de antes em todos os casos.
// ─────────────────────────────────────────────────────────────
function _logarFalhaServidor(dados) {
  try {
    import('@/lib/logDedupe')
      .then((m) => { try { m.registrarLog(dados); } catch (_) {} })
      .catch(() => {});
  } catch (_) { /* jamais propaga */ }
}

const APP_ID = '68d536db3c26ff51f79c4137';

// 🔐 CRACHÁ DE SESSÃO (21/08/2026) — ver api/_lib/sessao.js.
// Até hoje o site provava quem era mandando o `user_id` dentro do corpo, e o
// servidor acreditava. Agora o login devolve um crachá assinado e ele viaja no
// cabeçalho `x-sessao` de TODA chamada. Este é o único lugar do front que fala
// com /api/functions — por isso a mudança é só aqui, e nenhuma tela precisou
// ser alterada uma por uma.
// Leitura e escrita protegidas: navegador anônimo, modo privativo ou storage
// bloqueado não podem derrubar chamada nenhuma.
// 🔴 CORREÇÃO 21/08/2026 — eu tinha escrito que TODAS as chamadas passavam por
// aqui. Não passam: existem seis `fetch('/api/functions/...')` diretos no site,
// dois deles neste mesmo arquivo (adminUpdateUser e entityWrite). O log de
// produção mostrou 9 mil chamadas de entityWrite sem crachá por causa disso.
// O crachá agora mora em src/lib/sessaoCliente.js e todos importam de lá.

async function invokeFunction(name, body, options = {}) {
  const url = `/api/functions/${name}`;
  try {
    const cracha = lerCracha();
    const resp = await fetch(url, {
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID,
        ...(cracha ? { 'x-sessao': cracha } : {}),
        ...(options.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await resp.text().catch(() => '');
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { parsed = null; }

    // Qualquer rota que faça login/cadastro devolve `sessao`. Guardar aqui, no
    // caminho comum, faz as cinco telas de entrada do site funcionarem sem
    // precisar mexer em nenhuma delas.
    if (parsed && typeof parsed === 'object' && parsed.sessao) guardarCracha(parsed.sessao);

    // 🩹 CAUSA-RAIZ do "Erro ao enviar lance (função indisponível — status 404)":
    // functions como submitAtomicBid usam 404 de PROPÓSITO pra "leilão não encontrado"
    // (resposta de negócio real, com JSON válido) — não é rota inexistente na Vercel.
    // Só trata como "function ainda não existe" quando o corpo NÃO é JSON (página de
    // erro padrão da Vercel/HTML), senão a mensagem real do servidor é perdida.
    if (resp.status === 404 || resp.status === 405 || resp.status === 501) {
      if (parsed && typeof parsed === 'object') {
        // Resposta de NEGÓCIO (ex: "leilão não encontrado") — não é falha de
        // infraestrutura. Registra como aviso, não como erro, e só quando o
        // servidor sinalizou insucesso.
        // ⚠️ As chaves de erro variam por origem: função nossa usa
        // success/ok/error; a plataforma devolve error_type/detail. Sem cobrir
        // as duas formas, a falha entra como JSON válido e passa em branco
        // (foi exatamente o que o primeiro teste desta fase mostrou).
        if (
          parsed.success === false || parsed.ok === false ||
          parsed.error || parsed.error_type || parsed.detail
        ) {
          _logarFalhaServidor({
            step: 'Servidor_Resposta_Negocio',
            status: 'warning',
            message: `[${name}] ${resp.status}: ${String(parsed.error || parsed.message || 'recusado pelo servidor').slice(0, 300)}`,
            component_name: `funcao:${name}`,
            error_details: { funcao: name, http_status: resp.status, resposta: parsed },
            url: typeof window !== 'undefined' ? window.location.href : url,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
            is_mobile: typeof navigator !== 'undefined' ? /Mobi|Android/i.test(navigator.userAgent) : undefined,
          });
        }
        return parsed;
      }
      if (typeof console !== 'undefined') console.warn(`[plataforma.functions] '${name}' não implementada ainda (${resp.status}) — stub`);
      _logarFalhaServidor({
        step: 'Servidor_Funcao_Inexistente',
        status: 'error',
        message: `[${name}] rota de servidor não existe (HTTP ${resp.status})`,
        component_name: `funcao:${name}`,
        error_details: { funcao: name, http_status: resp.status, rota: url, corpo: String(text || '').slice(0, 500) },
        url: typeof window !== 'undefined' ? window.location.href : url,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        is_mobile: typeof navigator !== 'undefined' ? /Mobi|Android/i.test(navigator.userAgent) : undefined,
      });
      return { ok: false, error: 'not_implemented', name, status: resp.status };
    }
    // As functions já respondem com JSON detalhado (success:false, conflict, message)
    // mesmo em status 400/401/409/500 — devolve o JSON real; só lança erro genérico se
    // o corpo não for JSON válido.
    if (!resp.ok) {
      // 🔴 Aqui mora o erro de servidor de verdade (400/401/409/500) — inclusive
      // nos fluxos de dinheiro. Era o ponto MAIS cego do sistema.
      _logarFalhaServidor({
        step: 'Servidor_Erro_Resposta',
        status: 'error',
        message: `[${name}] HTTP ${resp.status}: ${String(
          (parsed && (parsed.error || parsed.message || parsed.details)) || text || 'sem detalhe'
        ).slice(0, 300)}`,
        component_name: `funcao:${name}`,
        error_details: {
          funcao: name,
          http_status: resp.status,
          rota: url,
          resposta: parsed || String(text || '').slice(0, 500),
        },
        url: typeof window !== 'undefined' ? window.location.href : url,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        is_mobile: typeof navigator !== 'undefined' ? /Mobi|Android/i.test(navigator.userAgent) : undefined,
      });
      if (parsed && typeof parsed === 'object') return parsed;
      throw new Error(`Function ${name} failed: ${resp.status} ${text}`);
    }
    return parsed !== null ? parsed : {};
  } catch (err) {
    if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
      if (typeof console !== 'undefined') console.warn(`[plataforma.functions] '${name}' fetch falhou — stub`, err.message);
      _logarFalhaServidor({
        step: 'Servidor_Falha_Rede',
        status: 'error',
        message: `[${name}] não foi possível falar com o servidor: ${String(err?.message || '').slice(0, 200)}`,
        component_name: `funcao:${name}`,
        error_details: { funcao: name, rota: url, erro: String(err?.message || err), tipo: err?.name },
        url: typeof window !== 'undefined' ? window.location.href : url,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        is_mobile: typeof navigator !== 'undefined' ? /Mobi|Android/i.test(navigator.userAgent) : undefined,
      });
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
      // Compat: plataforma.functions.someFunction(body) ou plataforma.functions.invoke(name, body)
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
      if (typeof console !== 'undefined') console.warn(`[plataforma.integrations.Core] '${name}' não implementada — stub`);
      return { ok: false, error: 'not_implemented', name };
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Integration ${name} failed: ${resp.status} ${text}`);
    }
    return resp.json();
  } catch (err) {
    if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
      if (typeof console !== 'undefined') console.warn(`[plataforma.integrations.Core] '${name}' fetch falhou — stub`, err.message);
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
    // plataforma.integrations.Core.InvokeLLM(body) etc → POST /api/integrations/<name>
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

// 🤖 Agents — chama a API nativa da Base44 (autenticada pela sessão do builder).
// No preview, o builder está logado na plataforma Base44 e a API reconhece a sessão.
const agents = {
  async createConversation({ agent_name, metadata }) {
    const resp = await fetch('/api/agents/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_name, metadata }),
    });
    if (!resp.ok) throw new Error(`createConversation falhou: ${resp.status}`);
    return resp.json();
  },
  async listConversations({ agent_name }) {
    const resp = await fetch(`/api/agents/conversations?agent_name=${encodeURIComponent(agent_name)}`);
    if (!resp.ok) throw new Error(`listConversations falhou: ${resp.status}`);
    return resp.json();
  },
  async getConversation(conversationId) {
    const resp = await fetch(`/api/agents/conversations/${conversationId}`);
    if (!resp.ok) throw new Error(`getConversation falhou: ${resp.status}`);
    return resp.json();
  },
  async updateConversation(conversationId, { metadata }) {
    const resp = await fetch(`/api/agents/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata }),
    });
    if (!resp.ok) throw new Error(`updateConversation falhou: ${resp.status}`);
    return resp.json();
  },
  async addMessage(conversation, { role, content, file_urls }) {
    const convId = conversation?.id || conversation?._id || conversation;
    const resp = await fetch(`/api/agents/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content, file_urls }),
    });
    if (!resp.ok) throw new Error(`addMessage falhou: ${resp.status}`);
    return resp.json();
  },
  subscribeToConversation(conversationId, callback) {
    // Polling simples — a plataforma Base44 usa SSE nativo, mas o adapter
    // faz polling a cada 2s como fallback.
    let active = true;
    const poll = async () => {
      if (!active) return;
      try {
        const resp = await fetch(`/api/agents/conversations/${conversationId}`);
        if (resp.ok) {
          const data = await resp.json();
          callback(data);
        }
      } catch { /* ignora */ }
      if (active) setTimeout(poll, 2000);
    };
    poll();
    return () => { active = false; };
  },
  getWhatsAppConnectURL(agent_name) {
    return `https://app.base44.com/api/agents/${agent_name}/whatsapp/connect`;
  },
  getTelegramConnectURL(agent_name) {
    return `https://app.base44.com/api/agents/${agent_name}/telegram/connect`;
  },
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

export const plataforma = {
  entities,
  functions,
  integrations,
  auth,
  analytics,
  agents,
  asServiceRole,
  // Mantém referência ao raw supabase pra quem quiser usar direto
  __supabase: supabase,
};

export default plataforma;