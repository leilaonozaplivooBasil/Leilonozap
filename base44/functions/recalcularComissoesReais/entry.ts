// ─────────────────────────────────────────────
// FUNÇÃO: recalcularComissoesReais
// O QUE FAZ: recalcula commission_balance / catalog_commission_balance /
//            total_commissions_generated / catalog_total_commissions_generated
//            de TODOS os usuários com base na soma real de commission_records
//            (status='confirmed') — a mesma fonte que a Central de Vendas usa
//            no histórico detalhado. NÃO apaga nada, só corrige os 4 campos
//            agregados de app_users que estavam desatualizados/dessincronizados.
// POR QUE EXISTE: painel do embaixador Luis Francisco mostrava R$ 1,01 de
//            Loja Virtual enquanto o extrato detalhado (soma real dos
//            lançamentos) dava R$ 8,74 — os campos agregados não estavam
//            sendo somados corretamente a cada venda nova.
// SEGURANÇA: dry_run=true por padrão. Só grava com { dry_run: false }.
//            Só toca nas 4 colunas de comissão de app_users — nunca em
//            catalog_sales, auctions, digital_wallets, wallet_transactions,
//            withdrawal_requests.
// PARÂMETROS opcionais:
//   { user_id: "..." }      → limita a UM usuário (ex: conferir antes de rodar geral)
//   { dry_run: false }      → grava de verdade

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

async function req(metodo: string, path: string, corpo?: any) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method: metodo,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!res.ok) throw new Error(`${metodo} ${path} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

async function tudo(tabela: string, select: string, filtroExtra = '') {
  const out: any[] = [];
  for (let off = 0; off < 100000; off += 1000) {
    const pag = await req('GET', `${tabela}?select=${select}${filtroExtra}&order=id.asc&limit=1000&offset=${off}`);
    out.push(...(pag || []));
    if (!Array.isArray(pag) || pag.length < 1000) break;
  }
  return out;
}

Deno.serve(async (req_) => {
  try {
    if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    const body = await req_.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;
    const soUsuario = body.user_id ? String(body.user_id) : null;

    const filtroComissoes = soUsuario ? `&user_id=eq.${encodeURIComponent(soUsuario)}` : '';
    const comissoes = await tudo(
      'commission_records',
      'id,user_id,sale_type,amount,status',
      `&status=eq.confirmed${filtroComissoes}`
    );

    // soma por usuário e por canal (catalog vs o resto = leilão/app)
    const catalogPorUsuario: Record<string, number> = {};
    const totalPorUsuario: Record<string, number> = {};
    for (const c of comissoes) {
      const uid = c.user_id;
      if (!uid) continue;
      const amt = Number(c.amount) || 0;
      totalPorUsuario[uid] = r2((totalPorUsuario[uid] || 0) + amt);
      if (c.sale_type === 'catalog') {
        catalogPorUsuario[uid] = r2((catalogPorUsuario[uid] || 0) + amt);
      }
    }

    const idsEnvolvidos = Object.keys(totalPorUsuario);
    if (soUsuario && !idsEnvolvidos.includes(soUsuario)) idsEnvolvidos.push(soUsuario);

    const filtroUsers = soUsuario
      ? `&id=eq.${encodeURIComponent(soUsuario)}`
      : idsEnvolvidos.length
        ? `&id=in.(${idsEnvolvidos.map((id) => `"${id}"`).join(',')})`
        : '&id=eq.__nenhum__';

    const users = idsEnvolvidos.length || soUsuario
      ? await tudo(
          'app_users',
          'id,full_name,primary_career_level,commission_balance,catalog_commission_balance,total_commissions_generated,catalog_total_commissions_generated',
          filtroUsers
        )
      : [];

    const plano = users.map((u: any) => {
      const catalogReal = r2(catalogPorUsuario[u.id] || 0);
      const totalReal = r2(totalPorUsuario[u.id] || 0);
      return {
        user_id: u.id,
        full_name: u.full_name,
        cargo: u.primary_career_level,
        antes: {
          commission_balance: r2(u.commission_balance || 0),
          catalog_commission_balance: r2(u.catalog_commission_balance || 0),
          total_commissions_generated: r2(u.total_commissions_generated || 0),
          catalog_total_commissions_generated: r2(u.catalog_total_commissions_generated || 0),
        },
        depois: {
          commission_balance: totalReal,
          catalog_commission_balance: catalogReal,
          total_commissions_generated: totalReal,
          catalog_total_commissions_generated: catalogReal,
        },
        variacao_total: r2(totalReal - (Number(u.commission_balance) || 0)),
      };
    }).filter((p: any) => Math.abs(p.variacao_total) > 0.001 || soUsuario)
      .sort((a: any, b: any) => Math.abs(b.variacao_total) - Math.abs(a.variacao_total));

    if (dryRun) {
      return Response.json({
        success: true,
        dry_run: true,
        aviso: 'NADA foi gravado. Para aplicar de verdade, enviar { dry_run: false }.',
        usuarios_com_diferenca: plano.length,
        plano,
      });
    }

    let atualizados = 0;
    for (const p of plano) {
      await req('PATCH', `app_users?id=eq.${p.user_id}`, {
        commission_balance: p.depois.commission_balance,
        catalog_commission_balance: p.depois.catalog_commission_balance,
        total_commissions_generated: p.depois.total_commissions_generated,
        catalog_total_commissions_generated: p.depois.catalog_total_commissions_generated,
      });
      atualizados++;
    }

    return Response.json({
      success: true,
      dry_run: false,
      atualizados,
      plano,
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});