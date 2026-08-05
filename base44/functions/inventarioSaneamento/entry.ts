// ─────────────────────────────────────────────
// FUNÇÃO: inventarioSaneamento
// O QUE FAZ: inventário do "lixo" acumulado em 1 ano de testes no banco REAL
//            (Supabase de produção). Conta dados de teste, órfãos e inconsistências.
// USADO POR: uso interno de auditoria (BLOCO SANEAMENTO 1 — FASE 1B, 04/08/2026)
// ÚLTIMA MUDANÇA: 04/08/2026
// ─────────────────────────────────────────────
//
// 🛡️ ESTA FUNÇÃO É 100% LEITURA. NÃO EXISTE ESCRITA AQUI.
//    Só usa GET. Não há POST, PATCH, DELETE, RPC nem upsert em nenhum caminho.
//    Se algum dia alguém acrescentar escrita neste arquivo, está violando a
//    autorização original (BLOCO SANEAMENTO 1, limite inviolável do dono).
//
// 📕 Fonte de verdade do projeto: docs/VERDADE.md (documento soberano)
//
// ⚠️ Por que fala direto com o Supabase via REST + service_role:
//    o store interno do Base44 (asServiceRole.entities) NÃO é produção.
//    Ver seção 2 do docs/VERDADE.md.

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// GET puro. Nenhum outro verbo é possível daqui.
async function get(path: string, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method: 'GET',
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, ...extraHeaders },
  });
  return res;
}

// Conta registros sem trazer os dados (usa o cabeçalho Content-Range do PostgREST).
async function contar(tabela: string, filtro = '') {
  try {
    const q = `${tabela}?select=id${filtro ? '&' + filtro : ''}&limit=1`;
    const res = await get(q, { Prefer: 'count=exact' });
    if (!res.ok) return { erro: `HTTP ${res.status}: ${(await res.text()).slice(0, 160)}` };
    const range = res.headers.get('content-range') || '';
    const total = Number(String(range).split('/')[1]);
    return { total: Number.isFinite(total) ? total : null };
  } catch (e) {
    return { erro: String(e?.message || e) };
  }
}

// Traz linhas (com teto) para poder somar/cruzar em memória.
async function linhas(tabela: string, select: string, filtro = '', limite = 5000) {
  try {
    const q = `${tabela}?select=${select}${filtro ? '&' + filtro : ''}&limit=${limite}`;
    const res = await get(q);
    if (!res.ok) return { erro: `HTTP ${res.status}: ${(await res.text()).slice(0, 160)}` };
    const dados = await res.json();
    return { dados: Array.isArray(dados) ? dados : [] };
  } catch (e) {
    return { erro: String(e?.message || e) };
  }
}

// Descobre quais colunas uma tabela realmente tem (evita o erro 42703 do PostgREST:
// pedir coluna inexistente devolve 400 e a leitura volta VAZIA em silêncio).
async function colunas(tabela: string) {
  try {
    const res = await get(`${tabela}?select=*&limit=1`);
    if (!res.ok) return { erro: `HTTP ${res.status}` };
    const d = await res.json();
    return { colunas: Array.isArray(d) && d[0] ? Object.keys(d[0]) : [], vazia: Array.isArray(d) && d.length === 0 };
  } catch (e) {
    return { erro: String(e?.message || e) };
  }
}

Deno.serve(async (req) => {
  try {
    if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const detalhar = body.detalhar === true; // traz amostras dos registros encontrados
    const relatorio: any = {
      gerado_em: new Date().toISOString(),
      natureza: '100% LEITURA — nenhum registro foi alterado ou apagado',
      documento_soberano: 'docs/VERDADE.md',
    };

    // ═════════════════════════════════════════════════════════
    // A) DADOS DE TESTE EM PRODUÇÃO
    // ═════════════════════════════════════════════════════════
    const A: any = {};

    // A1 — marcadores de teste no nome/título/e-mail
    const MARCADORES = ['__QA', '%5BTESTE', 'TESTE PONTO', 'teste@', 'QA_TESTE', '%25TESTE%25'];
    A.marcadores_de_teste = {};

    // produtos: em `products` o NOME está em `description` (ver VERDADE.md)
    A.marcadores_de_teste.produtos = await contar(
      'products',
      'or=(description.ilike.*__QA*,description.ilike.*[TESTE*,description.ilike.*TESTE PONTO*)'
    );
    A.marcadores_de_teste.leiloes = await contar(
      'auctions',
      'or=(title.ilike.*__QA*,title.ilike.*[TESTE*,title.ilike.*TESTE PONTO*,title.ilike.*teste*)'
    );
    A.marcadores_de_teste.usuarios = await contar(
      'app_users',
      'or=(email.ilike.*teste*,email.ilike.*qa_*,email.ilike.*test@*,full_name.ilike.*teste*,full_name.ilike.*__QA*)'
    );
    A.marcadores_de_teste.vendas = await contar(
      'catalog_sales',
      'or=(product_title.ilike.*__QA*,product_title.ilike.*[TESTE*,product_title.ilike.*TESTE PONTO*,buyer_email.ilike.*teste*)'
    );

    // A2 — leilões marcados como teste
    A.leiloes_is_test_auction = await contar('auctions', 'is_test_auction=is.true');

    // A3 — saldos de teste com valor
    const colUsers = await colunas('app_users');
    A.colunas_app_users_detectadas = colUsers.colunas?.length || 0;
    const temCol = (c: string) => Array.isArray(colUsers.colunas) && colUsers.colunas.includes(c);

    A.saldos_de_teste = {};
    for (const campo of ['test_wallet_balance', 'test_valora_balance']) {
      if (!temCol(campo)) { A.saldos_de_teste[campo] = { observacao: 'coluna não existe no banco real' }; continue; }
      const r = await linhas('app_users', `id,full_name,email,${campo}`, `${campo}=gt.0&order=${campo}.desc`, 500);
      if (r.erro) { A.saldos_de_teste[campo] = { erro: r.erro }; continue; }
      const total = round2((r.dados || []).reduce((s: number, u: any) => s + (Number(u[campo]) || 0), 0));
      A.saldos_de_teste[campo] = {
        contas_com_saldo: r.dados.length,
        valor_total_reais: total,
        maiores: (r.dados || []).slice(0, 10).map((u: any) => ({ nome: u.full_name, email: u.email, valor: round2(Number(u[campo])) })),
      };
    }

    relatorio.A_dados_de_teste = A;

    // ═════════════════════════════════════════════════════════
    // B) DADOS ÓRFÃOS / INCONSISTENTES
    // ═════════════════════════════════════════════════════════
    const B: any = {};

    // B1 — mapa real da catalog_sales por 'kind'
    const colVendas = await colunas('catalog_sales');
    const temKind = Array.isArray(colVendas.colunas) && colVendas.colunas.includes('kind');
    if (!temKind) {
      B.mapa_catalog_sales_por_kind = { observacao: "coluna 'kind' não existe — o filtro anti-contágio depende dela" };
    } else {
      const r = await linhas('catalog_sales', 'id,kind,status,total_amount,created_date', 'order=created_date.desc', 5000);
      if (r.erro) B.mapa_catalog_sales_por_kind = { erro: r.erro };
      else {
        const mapa: Record<string, { qtd: number; valor: number }> = {};
        for (const v of r.dados) {
          const k = String(v?.kind ?? '(nulo)').trim() || '(vazio)';
          if (!mapa[k]) mapa[k] = { qtd: 0, valor: 0 };
          mapa[k].qtd++;
          mapa[k].valor = round2(mapa[k].valor + (Number(v.total_amount) || 0));
        }
        B.mapa_catalog_sales_por_kind = {
          registros_lidos: r.dados.length,
          por_tipo: Object.entries(mapa)
            .sort((a, b) => b[1].qtd - a[1].qtd)
            .map(([kind, v]) => ({ kind, qtd: v.qtd, valor_total: v.valor })),
        };
      }
    }

    // B2 — status legado 'canceled' (1 L) vs 'cancelled' (2 Ls)
    B.status_cancelado_grafia = {
      canceled_1L: await contar('catalog_sales', 'status=eq.canceled'),
      cancelled_2L: await contar('catalog_sales', 'status=eq.cancelled'),
    };

    // B3 — usuários do Auth sem perfil em app_users
    // ⚠️ auth.users NÃO é acessível pelo PostgREST (schema protegido).
    B.usuarios_auth_sem_perfil = {
      observacao: 'NÃO VERIFICÁVEL por esta via — o schema auth do Supabase não é exposto pelo PostgREST. Exige consulta SQL no painel.',
      sql_sugerido: 'select count(*) from auth.users u left join app_users a on a.id = u.id where a.id is null;',
    };

    // B4/B5 — commission_records órfãos (user_id / sale_id que não existem mais)
    const cr = await linhas('commission_records', 'id,user_id,sale_id,role,amount,created_date', 'order=created_date.desc', 5000);
    if (cr.erro) {
      B.commission_records_orfaos = { erro: cr.erro };
    } else {
      const us = await linhas('app_users', 'id', '', 5000);
      const vs = await linhas('catalog_sales', 'id', '', 5000);
      const idsUsuarios = new Set((us.dados || []).map((u: any) => u.id));
      const idsVendas = new Set((vs.dados || []).map((v: any) => v.id));

      const semUsuario = cr.dados.filter((r: any) => r.user_id && !idsUsuarios.has(r.user_id));
      const semVenda = cr.dados.filter((r: any) => r.sale_id && !idsVendas.has(r.sale_id));

      B.commission_records_orfaos = {
        registros_lidos: cr.dados.length,
        usuarios_lidos: idsUsuarios.size,
        vendas_lidas: idsVendas.size,
        sem_usuario: {
          qtd: semUsuario.length,
          valor_total: round2(semUsuario.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0)),
          amostra: detalhar ? semUsuario.slice(0, 20) : semUsuario.slice(0, 5).map((r: any) => ({ role: r.role, amount: r.amount })),
        },
        sem_venda: {
          qtd: semVenda.length,
          valor_total: round2(semVenda.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0)),
          amostra: detalhar ? semVenda.slice(0, 20) : semVenda.slice(0, 5).map((r: any) => ({ role: r.role, amount: r.amount })),
          aviso: 'sale_id de LEILÃO não vive em catalog_sales — parte destes pode ser comissão de leilão, não órfã',
        },
      };
    }

    // B6 — produtos com estoque > 0 e preço ausente
    const colProd = await colunas('products');
    const cp = Array.isArray(colProd.colunas) ? colProd.colunas : [];
    const campoQtd = ['quantity', 'stock', 'qtd', 'estoque'].find((c) => cp.includes(c));
    const campoPreco = ['price_catalog', 'price', 'preco_catalogo', 'sale_price'].find((c) => cp.includes(c));
    if (!campoQtd || !campoPreco) {
      B.produtos_com_estoque_sem_preco = {
        observacao: 'não foi possível identificar as colunas de estoque/preço',
        colunas_encontradas: cp,
      };
    } else {
      B.produtos_com_estoque_sem_preco = {
        coluna_estoque: campoQtd,
        coluna_preco: campoPreco,
        preco_nulo: await contar('products', `${campoQtd}=gt.0&${campoPreco}=is.null`),
        preco_zero: await contar('products', `${campoQtd}=gt.0&${campoPreco}=eq.0`),
      };
    }

    // B7 — tabelas financeiras "casca" (existem e estão vazias)
    const TABELAS_FINANCEIRAS = [
      'asaas_payments', 'digital_wallet_transactions', 'digital_wallets', 'payments',
      'mercado_pago_payments', 'wallet_transactions', 'wallets', 'sale_commissions',
      'withdrawal_requests', 'partner_plan_purchases', 'passaporte_coupons',
      'influencer_purchases', 'balance_transfers', 'cash_registers', 'financial_expenses',
    ];
    B.tabelas_financeiras = [];
    for (const t of TABELAS_FINANCEIRAS) {
      const c = await contar(t);
      B.tabelas_financeiras.push({
        tabela: t,
        registros: c.total ?? null,
        situacao: c.erro ? 'NÃO EXISTE / inacessível' : (c.total === 0 ? '🟡 CASCA VAZIA' : '✅ com dados'),
        detalhe: c.erro || undefined,
      });
    }

    relatorio.B_orfaos_e_inconsistencias = B;

    // ═════════════════════════════════════════════════════════
    // C) TOTAIS GERAIS (referência de tamanho do banco)
    // ═════════════════════════════════════════════════════════
    relatorio.C_totais_do_banco = {
      app_users: (await contar('app_users')).total ?? null,
      auctions: (await contar('auctions')).total ?? null,
      auction_messages: (await contar('auction_messages')).total ?? null,
      catalog_sales: (await contar('catalog_sales')).total ?? null,
      commission_records: (await contar('commission_records')).total ?? null,
      products: (await contar('products')).total ?? null,
      system_logs: (await contar('system_logs')).total ?? null,
    };

    relatorio.limites_respeitados = [
      'NADA foi apagado',
      'NADA foi alterado',
      'nenhum saldo, status, preço ou comissão tocado',
      'FASE 2 (limpeza) NÃO iniciada',
    ];

    // Permite pedir só um pedaço do relatório (o retorno completo é grande).
    const secao = String(body.secao || '').toUpperCase();
    if (secao === 'A') return Response.json({ success: true, A_dados_de_teste: A });
    if (secao === 'B1') return Response.json({ success: true, mapa: B.mapa_catalog_sales_por_kind, grafia: B.status_cancelado_grafia });
    if (secao === 'B2') return Response.json({ success: true, orfaos: B.commission_records_orfaos, produtos: B.produtos_com_estoque_sem_preco });
    if (secao === 'B3') return Response.json({ success: true, tabelas_financeiras: B.tabelas_financeiras });
    if (secao === 'C') return Response.json({ success: true, totais: relatorio.C_totais_do_banco });

    return Response.json({ success: true, ...relatorio });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
});