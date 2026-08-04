// 🔍 SOMENTE LEITURA — descobre se as tabelas/colunas usadas pelas checagens de vínculo
// financeiro das auditorias realmente existem, e quantas linhas têm.
// Motivo: o modo 'schema' não lista colunas de tabela VAZIA (deriva as chaves de 1 linha).
// Aqui cada coluna é testada individualmente: PostgREST responde 400 quando ela não existe.
// Não escreve NADA. Apagar após o saneamento.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// tabela -> colunas que as auditorias tentam usar
const ALVO: Record<string, string[]> = {
  asaas_payments: ['auction_id', 'status', 'value', 'buyer_id', 'external_reference'],
  payments: ['auction_id', 'status', 'amount', 'buyer_id'],
  digital_wallet_transactions: ['related_auction_id', 'type', 'amount', 'user_id', 'status'],
  wallet_transactions: ['related_auction_id', 'type', 'amount', 'user_id'],
  digital_wallets: ['user_id', 'balance', 'held_balance'],
  wallets: ['user_id', 'balance'],
  mercado_pago_payments: ['auction_id', 'status', 'amount'],
  app_users: ['saldo_disponivel', 'saldo_reservado', 'commission_balance'],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const SB = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
    const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!SB || !KEY) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

    // 0) LISTA REAL de tabelas expostas pelo PostgREST (spec OpenAPI da raiz).
    // Responde a pergunta central: se as tabelas conhecidas estão vazias, ONDE
    // os pagamentos e as carteiras estão sendo gravados de verdade?
    let tabelasExistentes: string[] = [];
    let candidatasFinanceiras: string[] = [];
    try {
      const spec = await fetch(`${SB}/rest/v1/`, { headers: H });
      if (spec.ok) {
        const j = await spec.json();
        tabelasExistentes = Object.keys(j?.definitions || j?.paths || {})
          .map((k) => k.replace(/^\//, ''))
          .filter((k) => k && !k.startsWith('rpc/'))
          .sort();
        candidatasFinanceiras = tabelasExistentes.filter((t) =>
          /pay|wallet|carteira|saldo|balance|transac|deposit|pix|asaas|mercado|mp_|financ|comiss|commission/i.test(t)
        );
      }
    } catch (_) { /* best effort */ }

    // MAPA FINANCEIRO — para cada tabela candidata: quantas linhas tem e quais
    // colunas o próprio PostgREST declara (a spec descreve a estrutura mesmo
    // quando a tabela está vazia, ao contrário de derivar as chaves de 1 linha).
    let specDefs: Record<string, any> = {};
    try {
      const spec = await fetch(`${SB}/rest/v1/`, { headers: H });
      if (spec.ok) specDefs = (await spec.json())?.definitions || {};
    } catch (_) { /* best effort */ }

    const mapaFinanceiro: Record<string, unknown> = {};
    for (const tabela of candidatasFinanceiras) {
      const c = await fetch(`${SB}/rest/v1/${tabela}?select=*&limit=1`, {
        headers: { ...H, Prefer: 'count=exact', Range: '0-0' },
      });
      const range = c.headers.get('content-range') || '';
      const total = range.includes('/') ? range.split('/')[1] : '?';
      const props = specDefs?.[tabela]?.properties || {};
      // formato de uma linha por tabela: cabe inteiro no relatório sem truncar
      mapaFinanceiro[tabela] = `linhas=${c.ok ? total : 'erro ' + c.status} | ${Object.keys(props).join(',')}`;
    }

    const relatorio: Record<string, unknown> = {};

    for (const [tabela, colunas] of Object.entries(ALVO)) {
      // 1) a tabela existe? quantas linhas?
      const t = await fetch(`${SB}/rest/v1/${tabela}?select=*&limit=1`, {
        headers: { ...H, Prefer: 'count=exact', Range: '0-0' },
      });
      if (!t.ok) {
        relatorio[tabela] = { existe: false, http: t.status, detalhe: (await t.text()).slice(0, 120) };
        continue;
      }
      const range = t.headers.get('content-range') || '';
      const totalLinhas = range.includes('/') ? range.split('/')[1] : '?';

      // 2) cada coluna existe? (400 = não existe)
      const status: Record<string, string> = {};
      for (const col of colunas) {
        const r = await fetch(`${SB}/rest/v1/${tabela}?select=${col}&limit=1`, { headers: H });
        status[col] = r.ok ? 'existe' : `NAO EXISTE (${r.status})`;
      }

      relatorio[tabela] = {
        existe: true,
        total_linhas: totalLinhas,
        vazia: totalLinhas === '0',
        colunas: status,
      };
    }

    return Response.json({
      ok: true,
      escrita_realizada: false,
      total_tabelas_no_banco: tabelasExistentes.length,
      mapa_financeiro: mapaFinanceiro,
      // onde o dinheiro do usuário realmente vive hoje
      colunas_financeiras_em_app_users: Object.keys(specDefs?.app_users?.properties || {}).filter((c) =>
        /saldo|balance|credit|comiss|commission|wallet|held/i.test(c)
      ),
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});