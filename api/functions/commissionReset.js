// commissionReset — ZERAGEM DE ABERTURA do saldo de comissão (service_role).
// Protegido por DIAG_KEY + confirmação explícita no corpo. Uso pontual, com registro.
//
// POR QUE EXISTE (26/07/2026): a auditoria mostrou que os saldos de commission_balance
// eram resíduo da migração do Base44 — o commission_ledger deste sistema tinha só 14
// lançamentos (R$ 26,65), enquanto os saldos somavam milhares, inclusive um NEGATIVO
// de -R$ 10.325,02 na conta do Site Oficial, sem nenhum lançamento que o explicasse.
// Zerar dá lastro: daqui em diante todo saldo tem extrato conferível.
//
// SEGURANÇA:
//   • exige key = DIAG_KEY e confirm = 'ZERAR'
//   • grava o RETRATO de cada saldo anterior em system_logs (kind commission_reset)
//     antes de tocar em qualquer valor — dá para reverter usuário por usuário
//   • mode 'preview' (padrão) só mostra o que seria feito, sem escrever nada

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const lista = (x) => (Array.isArray(x) ? x : []);

function newId() {
  let out = '';
  const hex = '0123456789abcdef';
  for (let i = 0; i < 24; i++) out += hex[Math.floor(Math.random() * 16)];
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
    if (!SUPABASE_URL || !SR) return res.status(500).json({ error: 'config_ausente' });

    // quem tem saldo diferente de zero
    const alvos = lista(await (await sb(
      'app_users?select=id,full_name,email,commission_balance&commission_balance=neq.0&order=commission_balance.desc'
    )).json());

    const totalPositivo = round2(alvos.filter((u) => u.commission_balance > 0)
      .reduce((a, u) => a + Number(u.commission_balance), 0));
    const totalNegativo = round2(alvos.filter((u) => u.commission_balance < 0)
      .reduce((a, u) => a + Number(u.commission_balance), 0));

    const retrato = alvos.map((u) => ({
      id: u.id, nome: u.full_name, email: u.email, saldo_anterior: Number(u.commission_balance),
    }));

    if (body.mode !== 'executar' || body.confirm !== 'ZERAR') {
      return res.status(200).json({
        ok: true,
        modo: 'preview',
        instrucao: "para executar: { key, mode: 'executar', confirm: 'ZERAR' }",
        contas_afetadas: alvos.length,
        total_positivo: totalPositivo,
        total_negativo: totalNegativo,
        retrato,
      });
    }

    // 1) grava o retrato ANTES de mexer em qualquer saldo
    await sb('system_logs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: newId(),
        raw_base44: {
          kind: 'commission_reset',
          motivo: body.motivo || 'zeragem de abertura — saldos sem lastro no extrato (migração Base44)',
          at: new Date().toISOString(),
          contas: alvos.length,
          total_positivo: totalPositivo,
          total_negativo: totalNegativo,
          retrato,
        },
      }),
    });

    // 2) zera um a um, reportando falhas individualmente
    const falhas = [];
    let zerados = 0;
    for (const u of alvos) {
      const r = await sb(`app_users?id=eq.${encodeURIComponent(u.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ commission_balance: 0, updated_date: new Date().toISOString() }),
      });
      if (r.ok) zerados += 1;
      else falhas.push({ id: u.id, nome: u.full_name, status: r.status });
    }

    const restantes = lista(await (await sb(
      'app_users?select=id,full_name,commission_balance&commission_balance=neq.0'
    )).json());

    return res.status(200).json({
      ok: true,
      modo: 'executado',
      contas_afetadas: alvos.length,
      zerados,
      falhas,
      total_positivo_antes: totalPositivo,
      total_negativo_antes: totalNegativo,
      ainda_com_saldo: restantes,
      retrato_guardado_em: 'system_logs (kind commission_reset)',
    });
  } catch (e) {
    return res.status(500).json({ error: 'erro', details: String(e?.message || e) });
  }
}
