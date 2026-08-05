// ─────────────────────────────────────────────
// FUNÇÃO: zerarHistoricoPreAgosto
// O QUE FAZ: PASSO 1/2/3 do BLOCO ZERAGEM-HISTORICO — apaga o histórico de
//            comissão gerado ANTES de 2026-08-01 (motor legado de 26%, testes,
//            órfãs e vazamento) e reajusta os saldos com base no que sobra.
// USADO POR: operação autorizada pelo dono em 04/08/2026
// ÚLTIMA MUDANÇA: 04/08/2026 (criação)
// ─────────────────────────────────────────────
//
// 🔴 DESTRUTIVO E IRREVERSÍVEL quando dry_run = false.
// 🛡️ dry_run = TRUE por padrão. Sem dry_run: false explícito, NADA é apagado.
// 📕 Documento soberano: docs/VERDADE.md
//
// PARÂMETROS:
//   { }                                  → DRY RUN (padrão, seguro)
//   { dry_run: false, modo_saldo: 'A' }  → EXECUTA de verdade, recalcula saldos
//   { dry_run: false, modo_saldo: 'B' }  → EXECUTA de verdade, zera todos os saldos
//
// PROIBIÇÕES CRAVADAS NO CÓDIGO:
//   - só toca em commission_records e nas 3 colunas de comissão de app_users
//   - NUNCA toca em catalog_sales, auctions, digital_wallets, wallet_transactions
//   - NUNCA apaga registro com created_date >= 2026-08-01

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

const CORTE = '2026-08-01';
const LOTE = 500;

// Itens que a regra oficial NUNCA comissiona (docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md).
const NAO_COMISSIONAVEL = /deposit|wallet|passaporte|frete|freight/i;

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const soma = (rows: any[], c: string) => r2(rows.reduce((s: number, x: any) => s + (Number(x[c]) || 0), 0));

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
  if (!res.ok) throw new Error(`${metodo} ${path} → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

const get = (path: string) => req('GET', path);

async function tudo(tabela: string, select: string) {
  const out: any[] = [];
  for (let off = 0; off < 60000; off += 1000) {
    const pag = await get(`${tabela}?select=${select}&order=id.asc&limit=1000&offset=${off}`);
    out.push(...pag);
    if (!Array.isArray(pag) || pag.length < 1000) break;
  }
  return out;
}

const antesDoCorte = (c: any) => String(c.created_date || '') < CORTE;

Deno.serve(async (req_) => {
  try {
    if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    const body = await req_.json().catch(() => ({}));
    // 🛡️ TRAVA: só executa de verdade com dry_run EXPLICITAMENTE false.
    const dryRun = body.dry_run !== false;
    const modoSaldo = String(body.modo_saldo || 'A').toUpperCase() === 'B' ? 'B' : 'A';

    const comissoes = await tudo(
      'commission_records',
      'id,sale_id,sale_type,user_id,user_name,role,amount,status,created_date'
    );
    const vendas = await tudo('catalog_sales', 'id,kind,status,total_amount');
    const users = await tudo(
      'app_users',
      'id,full_name,email,commission_balance,catalog_commission_balance,total_commissions_generated'
    );

    const kindPorVenda: Record<string, string> = {};
    for (const v of vendas) kindPorVenda[v.id] = String(v.kind || '');
    const idsVendas = new Set(vendas.map((v: any) => v.id));

    const alvo = comissoes.filter(antesDoCorte);
    const preservado = comissoes.filter((c: any) => !antesDoCorte(c));

    // ─── Motivo de exclusão, para o dono ver de onde vem o lixo ───
    const motivo = (c: any) => {
      const k = kindPorVenda[c.sale_id];
      if (!idsVendas.has(c.sale_id)) return 'orfa_venda_inexistente';
      if (NAO_COMISSIONAVEL.test(k || '')) {
        if (/passaporte/i.test(k)) return 'passaporte';
        if (/frete|freight/i.test(k)) return 'frete';
        return 'deposito_carteira';
      }
      return 'motor_legado_26pct';
    };
    const porMotivo: Record<string, { registros: number; valor: number }> = {};
    for (const c of alvo) {
      const m = motivo(c);
      porMotivo[m] = porMotivo[m] || { registros: 0, valor: 0 };
      porMotivo[m].registros++;
      porMotivo[m].valor = r2(porMotivo[m].valor + (Number(c.amount) || 0));
    }

    // ─── Saldo que resulta do que SOBRA (só agosto) ───
    const sobraPorUser: Record<string, number> = {};
    for (const c of preservado) {
      sobraPorUser[c.user_id] = r2((sobraPorUser[c.user_id] || 0) + (Number(c.amount) || 0));
    }
    // Vazamento AINDA presente em agosto (depósito/passaporte/frete) — a regra
    // oficial não comissiona isso, então recalcular cru reinflaria o erro.
    const preservadoVazado = preservado.filter((c: any) => NAO_COMISSIONAVEL.test(kindPorVenda[c.sale_id] || ''));

    const saldoHoje = (u: any) =>
      r2((Number(u.commission_balance) || 0) + (Number(u.catalog_commission_balance) || 0));

    const idsEnvolvidos = new Set([
      ...Object.keys(sobraPorUser),
      ...users.filter((u: any) => saldoHoje(u) > 0).map((u: any) => u.id),
    ]);
    const planoSaldos = [...idsEnvolvidos].map((id) => {
      const u = users.find((x: any) => x.id === id);
      const hoje = u ? saldoHoje(u) : 0;
      const depois = modoSaldo === 'B' ? 0 : r2(sobraPorUser[id] || 0);
      return {
        user_id: id,
        conta: u?.full_name || '(conta não encontrada)',
        saldo_hoje: hoje,
        saldo_depois: depois,
        variacao: r2(depois - hoje),
      };
    }).sort((a, b) => Math.abs(b.variacao) - Math.abs(a.variacao));

    const relatorio = {
      corte_oficial: CORTE,
      modo_saldo: modoSaldo === 'B' ? 'B — zerar tudo em 0,00' : 'A — recalcular pela soma de agosto',
      a_excluir: {
        registros: alvo.length,
        valor: soma(alvo, 'amount'),
        por_motivo: Object.entries(porMotivo)
          .sort((a, b) => b[1].valor - a[1].valor)
          .map(([m, v]) => ({ motivo: m, registros: v.registros, valor: v.valor })),
      },
      a_preservar: {
        registros: preservado.length,
        valor: soma(preservado, 'amount'),
        alerta_vazamento_ainda_presente: {
          registros: preservadoVazado.length,
          valor: soma(preservadoVazado, 'amount'),
          nota: 'Comissão sobre depósito/passaporte/frete DENTRO de agosto. A regra oficial não comissiona isso. Se o modo A for usado, este valor entra no saldo recalculado.',
        },
      },
      saldos: {
        soma_hoje: r2(users.reduce((s: number, u: any) => s + saldoHoje(u), 0)),
        soma_depois: modoSaldo === 'B' ? 0 : r2(Object.values(sobraPorUser).reduce((s, v) => s + v, 0)),
        contas_afetadas: planoSaldos.length,
        conta_por_conta: planoSaldos,
      },
    };

    // ═══ DRY RUN — sai aqui, sem escrever nada ═══
    if (dryRun) {
      return Response.json({
        success: true,
        dry_run: true,
        aviso: 'NADA foi apagado nem alterado. Para executar de verdade, enviar { dry_run: false, modo_saldo: "A" ou "B" }.',
        ...relatorio,
      });
    }

    // ═══ PASSO 2 — EXCLUSÃO em blocos de 500 ═══
    const ids = alvo.map((c: any) => c.id);
    let excluidos = 0;
    const blocos: number[] = [];
    for (let i = 0; i < ids.length; i += LOTE) {
      const bloco = ids.slice(i, i + LOTE);
      const lista = bloco.map((x) => `"${x}"`).join(',');
      const apagados = await req('DELETE', `commission_records?id=in.(${lista})`);
      const n = Array.isArray(apagados) ? apagados.length : bloco.length;
      excluidos += n;
      blocos.push(n);
    }

    // ═══ PASSO 3 — SALDOS ═══
    let contasAtualizadas = 0;
    for (const p of planoSaldos) {
      // Divide o total do usuário entre as duas colunas de comissão:
      // catalog_commission_balance recebe o total, commission_balance espelha,
      // mantendo o mesmo formato que a soma das duas já usava antes (metade/metade).
      const metade = r2(p.saldo_depois / 2);
      await req('PATCH', `app_users?id=eq.${p.user_id}`, {
        commission_balance: metade,
        catalog_commission_balance: r2(p.saldo_depois - metade),
        total_commissions_generated: p.saldo_depois,
      });
      contasAtualizadas++;
    }

    return Response.json({
      success: true,
      dry_run: false,
      executado_em: new Date().toISOString(),
      excluidos,
      blocos,
      contas_atualizadas: contasAtualizadas,
      ...relatorio,
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});