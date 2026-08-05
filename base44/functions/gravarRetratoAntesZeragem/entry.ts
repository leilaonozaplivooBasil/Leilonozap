// ─────────────────────────────────────────────
// FUNÇÃO: gravarRetratoAntesZeragem
// O QUE FAZ: PASSO 0 do BLOCO ZERAGEM-HISTORICO — retrato COMPLETO do estado
//            de comissões e saldos ANTES de qualquer exclusão.
//            Sem este retrato, a zeragem NÃO pode ser executada.
// USADO POR: operação autorizada pelo dono em 04/08/2026
// ÚLTIMA MUDANÇA: 04/08/2026 (criação)
// ─────────────────────────────────────────────
//
// 🛡️ 100% LEITURA. Só GET. Nenhum POST/PATCH/DELETE/RPC neste arquivo.
// 📕 Documento soberano: docs/VERDADE.md
//
// PARÂMETROS:
//   { parte: 'RESUMO' }                  → totais + saldos de todas as contas
//   { parte: 'ALVO', pagina: 1 }         → registros que SERÃO apagados (< 2026-08-01)
//   { parte: 'PRESERVADO', pagina: 1 }   → registros de agosto (ficam)
//
// O retorno é paginado porque commission_records tem ~10 mil linhas e o
// retorno inteiro estoura o limite de exibição.

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

// Fronteira oficial do marco: tudo ANTES disso é lixo do motor legado.
const CORTE = '2026-08-01';

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const soma = (rows: any[], c: string) => r2(rows.reduce((s: number, x: any) => s + (Number(x[c]) || 0), 0));

async function get(path: string) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method: 'GET',
    headers: { apikey: SR, Authorization: `Bearer ${SR}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return await res.json();
}

async function tudo(tabela: string, select: string) {
  const out: any[] = [];
  const passo = 1000;
  for (let off = 0; off < 60000; off += passo) {
    const pag = await get(`${tabela}?select=${select}&order=id.asc&limit=${passo}&offset=${off}`);
    out.push(...pag);
    if (!Array.isArray(pag) || pag.length < passo) break;
  }
  return out;
}

const antesDoCorte = (c: any) => String(c.created_date || '') < CORTE;

Deno.serve(async (req) => {
  try {
    if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const parte = String(body.parte || 'RESUMO').toUpperCase();
    const pagina = Math.max(1, Number(body.pagina) || 1);
    const porPagina = 200;

    const comissoes = await tudo(
      'commission_records',
      'id,sale_id,sale_type,user_id,user_name,role,percent,amount,sale_amount,product_title,status,created_date'
    );

    const alvo = comissoes.filter(antesDoCorte);
    const preservado = comissoes.filter((c: any) => !antesDoCorte(c));

    // ─── RESUMO: totais + saldo de TODAS as contas ───
    if (parte === 'RESUMO') {
      const users = await tudo(
        'app_users',
        'id,full_name,email,commission_balance,catalog_commission_balance,total_commissions_generated'
      );
      const saldoDe = (u: any) =>
        r2((Number(u.commission_balance) || 0) + (Number(u.catalog_commission_balance) || 0));

      return Response.json({
        success: true,
        retrato: 'PASSO 0 — RESUMO',
        gerado_em: new Date().toISOString(),
        corte_oficial: CORTE,
        comissoes: {
          total_registros: comissoes.length,
          total_valor: soma(comissoes, 'amount'),
          alvo_pre_agosto_registros: alvo.length,
          alvo_pre_agosto_valor: soma(alvo, 'amount'),
          preservado_agosto_registros: preservado.length,
          preservado_agosto_valor: soma(preservado, 'amount'),
        },
        saldos_hoje: {
          contas: users.length,
          contas_com_saldo: users.filter((u: any) => saldoDe(u) > 0).length,
          soma_todos_os_saldos: r2(users.reduce((s: number, u: any) => s + saldoDe(u), 0)),
          total_commissions_generated_nulo: users.filter((u: any) => u.total_commissions_generated === null).length,
        },
        // Só as contas com saldo — as zeradas não precisam de retrato.
        contas_com_saldo: users
          .filter((u: any) => saldoDe(u) > 0)
          .sort((a: any, b: any) => saldoDe(b) - saldoDe(a))
          .map((u: any) => ({
            id: u.id,
            nome: u.full_name,
            email: u.email,
            commission_balance: r2(u.commission_balance),
            catalog_commission_balance: r2(u.catalog_commission_balance),
            total_commissions_generated: u.total_commissions_generated,
          })),
        proximo_passo: 'chamar com { parte: "ALVO", pagina: 1 } para listar o que será apagado',
      });
    }

    // ─── ALVO / PRESERVADO: registros crus, paginados ───
    const lista = parte === 'PRESERVADO' ? preservado : alvo;
    const ordenado = [...lista].sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)));
    const inicio = (pagina - 1) * porPagina;

    return Response.json({
      success: true,
      retrato: `PASSO 0 — ${parte}`,
      corte_oficial: CORTE,
      total_registros: lista.length,
      total_valor: soma(lista, 'amount'),
      paginacao: {
        pagina,
        por_pagina: porPagina,
        total_paginas: Math.ceil(lista.length / porPagina) || 1,
        proxima: inicio + porPagina < lista.length ? pagina + 1 : null,
      },
      registros: ordenado.slice(inicio, inicio + porPagina),
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});