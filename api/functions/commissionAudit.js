// commissionAudit — LEITURA de diagnóstico do motor de comissão (service_role).
// Protegido por DIAG_KEY, igual aos outros endpoints de manutenção. Só lê: nunca
// escreve, nunca devolve credencial.
//
// Motivo: o commission_ledger é fechado por RLS para a chave pública, então não dava
// para investigar de fora por que a conta do Site Oficial estava com saldo de
// comissão NEGATIVO (-R$ 10.325,02 em 26/07/2026). Este endpoint responde
// "de onde veio cada centavo" de um beneficiário, agregado por papel na venda.
//
// Uso: POST /api/functions/commissionAudit { key, user_id?, mode? }
//   mode 'user'    (padrão) → extrato agregado + últimos lançamentos do usuário
//   mode 'negativos'         → todos os cadastros com saldo negativo
//   mode 'resumo'            → total de lançamentos e soma por papel (sistema todo)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
  });
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// PostgREST devolve objeto de erro quando a coluna não existe — não pode derrubar o diagnóstico
function lista(x) {
  return Array.isArray(x) ? x : [];
}

function agrupar(linhas, campo) {
  linhas = lista(linhas);
  const out = {};
  for (const l of linhas) {
    const k = l[campo] || '(sem)';
    if (!out[k]) out[k] = { lancamentos: 0, total: 0 };
    out[k].lancamentos += 1;
    out[k].total = round2(out[k].total + Number(l.amount || 0));
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    if (!process.env.DIAG_KEY || body.key !== process.env.DIAG_KEY) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (!SUPABASE_URL || !SR) {
      return res.status(500).json({ error: 'config_ausente' });
    }

    const mode = body.mode || 'user';

    if (mode === 'negativos') {
      const rows = lista(await (await sb(
        'app_users?select=id,full_name,email,commission_balance,saldo_disponivel,saldo_alocado&or=(commission_balance.lt.0,saldo_disponivel.lt.0,saldo_alocado.lt.0)&order=commission_balance.asc'
      )).json());
      return res.status(200).json({ ok: true, mode, total: rows.length, rows });
    }

    if (mode === 'resumo') {
      const bruto = await (await sb('commission_ledger?select=*&limit=20000')).json();
      const rows = lista(bruto);
      if (!rows.length) {
        return res.status(200).json({ ok: true, mode, lancamentos: 0, retorno_bruto: bruto });
      }
      return res.status(200).json({
        ok: true,
        mode,
        colunas: Object.keys(rows[0]),
        lancamentos: rows.length,
        por_papel: agrupar(rows, 'role_in_sale'),
        por_status: agrupar(rows, 'status'),
      });
    }

    const userId = String(body.user_id || '').trim();
    if (!userId) return res.status(400).json({ error: 'user_id obrigatório' });

    const [u] = await (await sb(
      `app_users?select=id,full_name,email,commission_balance,saldo_disponivel,saldo_alocado&id=eq.${encodeURIComponent(userId)}&limit=1`
    )).json();

    const ledger = lista(await (await sb(
      `commission_ledger?select=*&beneficiary_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=5000`
    )).json());

    const somaLedger = round2(ledger.reduce((acc, l) => acc + Number(l.amount || 0), 0));
    const negativos = ledger.filter((l) => Number(l.amount) < 0);

    // compras pagas com o saldo de comissão (a suspeita do saldo negativo)
    const compras = lista(await (await sb(
      `catalog_sales?select=id,total_amount,status,payment_method,created_at&buyer_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=500`
    )).json());
    const pagasComSaldo = compras.filter((c) =>
      String(c.payment_method || '').toLowerCase().includes('saldo')
    );

    return res.status(200).json({
      ok: true,
      mode,
      usuario: u || null,
      ledger: {
        lancamentos: ledger.length,
        soma: somaLedger,
        por_papel: agrupar(ledger, 'role_in_sale'),
        por_status: agrupar(ledger, 'status'),
        negativos: negativos.length,
        amostra_negativos: negativos.slice(0, 10),
        ultimos: ledger.slice(0, 10),
      },
      compras: {
        total: compras.length,
        pagas_com_saldo: pagasComSaldo.length,
        soma_pagas_com_saldo: round2(
          pagasComSaldo.reduce((a, c) => a + Number(c.total_amount || 0), 0)
        ),
        amostra: pagasComSaldo.slice(0, 10),
      },
      conferencia: {
        saldo_atual: Number(u?.commission_balance || 0),
        soma_ledger: somaLedger,
        diferenca: round2(Number(u?.commission_balance || 0) - somaLedger),
      },
    });
  } catch (e) {
    return res.status(500).json({ error: 'erro', details: String(e?.message || e) });
  }
}
