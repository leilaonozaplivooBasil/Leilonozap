// 🔍 auditarCommissionLedger — AUDITORIA 100% LEITURA da tabela `commission_ledger`.
//
// POR QUE ESTA FUNÇÃO EXISTE (05/08/2026):
// O sistema tem DUAS tabelas de comissão e todas as auditorias anteriores só liam UMA:
//   • commission_records  → motor Deno (acertarComissaoVenda) — venda de PRODUTO (30%)
//   • commission_ledger   → motor Node/Vercel (mpWebhook, commissions.js, storeFulfill.js)
//                           — ADESÃO (20%), bônus de adesão e cadeia direta
// Resultado: as comissões de adesão eram INVISÍVEIS nos relatórios. Esta função
// enxerga o lado que faltava.
//
// 🟢 RISCO BAIXO — SOMENTE GET. Nenhum INSERT/UPDATE/DELETE/PATCH.
// Não credita, não estorna, não apaga, não toca em saldo.
//
// Payload: { limite?: number (default 2000), amostra?: number (default 15) }

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const MARCO_ZERO = '2026-08-01';

// 🔒 GET puro — a função inteira só sabe ler.
const get = (path: string) =>
  fetch(`${BASE}/rest/v1/${path}`, {
    method: 'GET',
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  try {
    if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const limite = Math.min(Number(body.limite) || 2000, 5000);
    const amostra = Math.min(Number(body.amostra) || 15, 60);

    // ── 1. Existe a tabela? ────────────────────────────────────────
    const res = await get(`commission_ledger?select=*&limit=${limite}`);
    if (!res.ok) {
      const txt = await res.text();
      return Response.json({
        success: false,
        tabela_existe: false,
        conclusao: 'A tabela commission_ledger NÃO respondeu — pode não existir neste banco.',
        detalhe: txt.slice(0, 400),
      });
    }
    const linhas = await res.json();
    if (!Array.isArray(linhas)) return Response.json({ success: false, error: 'resposta inesperada' });

    if (!linhas.length) {
      return Response.json({
        success: true,
        tabela_existe: true,
        total_registros: 0,
        conclusao: 'A tabela commission_ledger existe mas está VAZIA — nenhuma comissão de adesão/bônus foi gravada até agora.',
      });
    }

    // ── 2. Colunas reais (evita achismo sobre o schema) ────────────
    const colunas = Object.keys(linhas[0]);
    const campoValor = ['amount', 'valor', 'value'].find((c) => colunas.includes(c)) || 'amount';
    const campoNome = ['beneficiary_name', 'user_name', 'nome'].find((c) => colunas.includes(c)) || null;
    const campoPapel = ['role_in_sale', 'role', 'papel'].find((c) => colunas.includes(c)) || null;
    const campoData = ['created_date', 'created_at', 'data'].find((c) => colunas.includes(c)) || null;
    const campoPct = ['pct', 'percent', 'percentual'].find((c) => colunas.includes(c)) || null;

    const valorDe = (r: any) => round2(Number(r?.[campoValor]) || 0);
    const total = round2(linhas.reduce((s: number, r: any) => s + valorDe(r), 0));

    // ── 3. Quebra por papel na venda ──────────────────────────────
    const porPapel: Record<string, { registros: number; total: number }> = {};
    if (campoPapel) {
      for (const r of linhas) {
        const k = String(r[campoPapel] ?? '(sem papel)');
        porPapel[k] = porPapel[k] || { registros: 0, total: 0 };
        porPapel[k].registros++;
        porPapel[k].total = round2(porPapel[k].total + valorDe(r));
      }
    }

    // ── 4. Quebra por pessoa ──────────────────────────────────────
    const porPessoa: Record<string, { registros: number; total: number }> = {};
    if (campoNome) {
      for (const r of linhas) {
        const k = String(r[campoNome] ?? '(sem nome)');
        porPessoa[k] = porPessoa[k] || { registros: 0, total: 0 };
        porPessoa[k].registros++;
        porPessoa[k].total = round2(porPessoa[k].total + valorDe(r));
      }
    }

    // ── 5. Marco Zero (01/08/2026) ────────────────────────────────
    let marco: any = { avaliado: false, motivo: 'tabela sem coluna de data' };
    if (campoData) {
      const antes = linhas.filter((r: any) => String(r[campoData] || '') < MARCO_ZERO);
      const depois = linhas.filter((r: any) => String(r[campoData] || '') >= MARCO_ZERO);
      marco = {
        avaliado: true,
        corte: MARCO_ZERO,
        antes_do_marco: { registros: antes.length, total: round2(antes.reduce((s: number, r: any) => s + valorDe(r), 0)) },
        depois_do_marco: { registros: depois.length, total: round2(depois.reduce((s: number, r: any) => s + valorDe(r), 0)) },
      };
    }

    // ── 6. Bônus de adesão: confere se realmente saiu 20% ─────────
    let conferenciaAdesao: any = { avaliado: false, motivo: 'tabela sem coluna de percentual' };
    if (campoPct) {
      const adesoes = linhas.filter((r: any) => String(r[campoPapel ?? ''] ?? '').includes('adesao'));
      const fora20 = adesoes.filter((r: any) => Math.abs((Number(r[campoPct]) || 0) - 20) > 0.01);
      conferenciaAdesao = {
        avaliado: true,
        registros_de_adesao: adesoes.length,
        total_adesao: round2(adesoes.reduce((s: number, r: any) => s + valorDe(r), 0)),
        fora_dos_20_pct: fora20.length,
        veredito: adesoes.length === 0
          ? 'nenhum bônus de adesão gravado ainda'
          : (fora20.length === 0 ? '✅ todos os bônus de adesão estão a 20%, conforme o documento oficial' : '⚠️ há bônus de adesão fora dos 20% — investigar'),
      };
    }

    return Response.json({
      success: true,
      modo: '🟢 SOMENTE LEITURA — nada foi alterado',
      tabela_existe: true,
      total_registros: linhas.length,
      limite_aplicado: limite,
      truncado: linhas.length >= limite,
      total_em_reais: total,
      colunas_reais: colunas,
      campos_detectados: { valor: campoValor, nome: campoNome, papel: campoPapel, data: campoData, pct: campoPct },
      marco_zero: marco,
      conferencia_bonus_adesao: conferenciaAdesao,
      por_papel_na_venda: Object.entries(porPapel).sort((a, b) => b[1].total - a[1].total).map(([papel, v]) => ({ papel, ...v })),
      top_beneficiarios: Object.entries(porPessoa).sort((a, b) => b[1].total - a[1].total).slice(0, 25).map(([nome, v]) => ({ nome, ...v })),
      amostra_de_registros: linhas.slice(0, amostra),
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});