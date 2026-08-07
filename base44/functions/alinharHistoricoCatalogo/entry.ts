// BLOCO: ALINHAR-HISTORICO-CATALOGO — MARCO ZERO (07/08/2026)
//
// Alinha app_users.catalog_total_commissions_generated à soma real de
// commission_records (sale_type='catalog', status confirmed/paid, >= 01/08/2026).
//
// AUTORIDADE: docs/VERDADE.md §7 item 4 — "registro pré-agosto que apareça é
// defeito, não histórico".
//
// 🔴 RISCO ALTO — campo financeiro em conta real.
// SEGURANÇA: dry_run = true POR PADRÃO. Nunca inverter esse padrão.
// ESCOPO: escreve em UM único campo. Não toca saldo, extrato, carteira,
// commission_records, catalog_sales nem auctions.
// BANCO: Supabase REST + service_role (VERDADE.md §2). Nunca asServiceRole.entities.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const CORTE_MARCO_ZERO = '2026-08-01';
const STATUS_VALIDOS = ['confirmed', 'paid'];

// Normaliza a URL do Supabase: o secret já veio com /rest/v1 colado antes,
// e isso duplicava o caminho. Aqui a base é sempre só o host do projeto.
function baseRest(url) {
  return String(url || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '') + '/rest/v1';
}

async function lerTudo(rest, headers, caminho) {
  const registros = [];
  const passo = 1000;
  let offset = 0;
  while (true) {
    const resp = await fetch(`${rest}${caminho}&limit=${passo}&offset=${offset}`, { headers });
    if (!resp.ok) throw new Error(`Leitura falhou (${resp.status}): ${await resp.text()}`);
    const lote = await resp.json();
    registros.push(...lote);
    if (lote.length < passo) break;
    offset += passo;
  }
  return registros;
}

const cent = (n) => Math.round((Number(n) || 0) * 100);
const reais = (centavos) => Number((centavos / 100).toFixed(2));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 🔒 Somente admin — função de escrita financeira.
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden — somente admin' }, { status: 403 });
    }

    const corpo = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    // ⚠️ dry_run só é desligado com false EXPLÍCITO.
    const dryRun = corpo.dry_run !== false;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return Response.json({ error: 'Credenciais do Supabase ausentes' }, { status: 500 });
    }
    const rest = baseRest(SUPABASE_URL);
    const headers = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    };

    // 1) FONTE DA VERDADE — comissões de catálogo válidas (pós Marco Zero)
    const statusFiltro = `in.(${STATUS_VALIDOS.join(',')})`;
    const comissoes = await lerTudo(
      rest,
      headers,
      `/commission_records?select=user_id,amount,status,created_date,sale_type`
      + `&sale_type=eq.catalog&status=${statusFiltro}&created_date=gte.${CORTE_MARCO_ZERO}`,
    );

    const somaPorConta = new Map();
    for (const c of comissoes) {
      if (!c.user_id) continue;
      somaPorConta.set(c.user_id, (somaPorConta.get(c.user_id) || 0) + cent(c.amount));
    }

    // 2) TODAS as contas — inclusive as que devem cair a zero
    const contas = await lerTudo(
      rest,
      headers,
      `/app_users?select=id,email,full_name,catalog_total_commissions_generated&order=email.asc`,
    );

    // 3) RETRATO ANTES + diferença (só o que realmente divergir)
    const divergentes = [];
    for (const conta of contas) {
      const antes = cent(conta.catalog_total_commissions_generated);
      const depois = somaPorConta.get(conta.id) || 0;
      if (antes === depois) continue;
      divergentes.push({
        id: conta.id,
        email: conta.email,
        nome: conta.full_name,
        antes: reais(antes),
        depois: reais(depois),
        diferenca: reais(depois - antes),
        registros_validos: comissoes.filter((c) => c.user_id === conta.id).length,
      });
    }

    const resumo = {
      dry_run: dryRun,
      corte_marco_zero: CORTE_MARCO_ZERO,
      contas_lidas: contas.length,
      comissoes_catalogo_validas: comissoes.length,
      soma_comissoes_validas: reais([...somaPorConta.values()].reduce((s, v) => s + v, 0)),
      contas_divergentes: divergentes.length,
      soma_antes: reais(divergentes.reduce((s, d) => s + cent(d.antes), 0)),
      soma_depois: reais(divergentes.reduce((s, d) => s + cent(d.depois), 0)),
      residuo_a_eliminar: reais(divergentes.reduce((s, d) => s + cent(d.antes) - cent(d.depois), 0)),
    };

    if (dryRun) {
      return Response.json({
        modo: 'SIMULACAO — nada foi gravado',
        resumo,
        retrato_antes: divergentes,
      });
    }

    // 4) ESCRITA — por ID, uma a uma. Filtro por data em massa retorna
    //    "0 afetados" silenciosamente neste banco (RETRATO-BANCO-ANTIGO §4).
    const gravados = [];
    const falhas = [];
    for (const d of divergentes) {
      const resp = await fetch(`${rest}/app_users?id=eq.${encodeURIComponent(d.id)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ catalog_total_commissions_generated: d.depois }),
      });
      if (resp.ok) gravados.push(d.id);
      else falhas.push({ id: d.id, email: d.email, erro: await resp.text() });
    }

    // 5) CONFERÊNCIA por leitura independente — o retorno do PATCH não é prova.
    const reconferencia = [];
    for (const d of divergentes) {
      const resp = await fetch(
        `${rest}/app_users?select=id,email,catalog_total_commissions_generated&id=eq.${encodeURIComponent(d.id)}`,
        { headers },
      );
      const lido = resp.ok ? (await resp.json())[0] : null;
      const valorLido = lido ? reais(cent(lido.catalog_total_commissions_generated)) : null;
      reconferencia.push({
        email: d.email,
        esperado: d.depois,
        lido_no_banco: valorLido,
        confere: valorLido === d.depois,
      });
    }

    return Response.json({
      modo: 'EXECUTADO',
      resumo,
      gravados: gravados.length,
      falhas,
      conferencia_por_releitura: reconferencia,
      todas_conferem: reconferencia.every((r) => r.confere),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});