// commissionWipe — LIMPEZA DE ABERTURA do histórico de comissão (service_role).
// Protegido por DIAG_KEY + confirm 'LIMPAR'. Preview por padrão.
//
// POR QUE (26/07/2026, autorizado): as 18 vendas pagas são todas internas — time
// comprando de si mesmo para testar (R$ 2,00 e R$ 36,27) e 5 depósitos de carteira.
// Nenhum cliente externo. Os lançamentos existentes foram calculados antes de:
//   • limpar os cargos fantasma da loja antiga
//   • implementar o topo de 10%
//   • corrigir o motor para usar o melhor cargo da pessoa
// Ficar com esse histórico significa carregar números que não batem com cargo
// nenhum. A limpeza deixa o extrato nascer junto com a regra correta.
//
// SEGURANÇA: exporta TUDO em system_logs antes de apagar (kind commission_wipe),
// então dá para reconstruir se alguém precisar.

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

const lista = (x) => (Array.isArray(x) ? x : []);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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

    const ledger = lista(await (await sb('commission_ledger?select=*&limit=20000')).json());
    const comSaldo = lista(await (await sb(
      'app_users?select=id,full_name,email,commission_balance&commission_balance=neq.0'
    )).json());

    const totalLedger = round2(ledger.reduce((a, l) => a + Number(l.amount || 0), 0));
    const totalSaldo = round2(comSaldo.reduce((a, u) => a + Number(u.commission_balance || 0), 0));

    if (body.mode !== 'executar' || body.confirm !== 'LIMPAR') {
      return res.status(200).json({
        ok: true,
        modo: 'preview',
        instrucao: "para executar: { key, mode: 'executar', confirm: 'LIMPAR' }",
        lancamentos_a_apagar: ledger.length,
        soma_lancamentos: totalLedger,
        contas_com_saldo: comSaldo.length,
        soma_saldos: totalSaldo,
        saldos: comSaldo,
      });
    }

    // 1) exporta tudo antes de apagar
    await sb('system_logs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: newId(),
        raw_base44: {
          kind: 'commission_wipe',
          motivo: body.motivo || 'limpeza de abertura — histórico de testes internos, calculado antes da regra correta',
          at: new Date().toISOString(),
          lancamentos: ledger.length,
          soma_lancamentos: totalLedger,
          saldos_antes: comSaldo,
          ledger_completo: ledger,
        },
      }),
    });

    // 2) apaga os lançamentos
    const del = await sb('commission_ledger?id=not.is.null', {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });

    // 3) zera os saldos
    let zerados = 0;
    for (const u of comSaldo) {
      const r = await sb(`app_users?id=eq.${encodeURIComponent(u.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ commission_balance: 0, updated_date: new Date().toISOString() }),
      });
      if (r.ok) zerados += 1;
    }

    const restaLedger = lista(await (await sb('commission_ledger?select=id&limit=5')).json());
    const restaSaldo = lista(await (await sb('app_users?select=id&commission_balance=neq.0&limit=5')).json());

    return res.status(200).json({
      ok: true,
      modo: 'executado',
      lancamentos_apagados: ledger.length,
      delete_ok: del.ok,
      saldos_zerados: zerados,
      confere: { ledger_restante: restaLedger.length, contas_com_saldo_restante: restaSaldo.length },
      exportado_em: 'system_logs (kind commission_wipe)',
    });
  } catch (e) {
    return res.status(500).json({ error: 'erro', details: String(e?.message || e) });
  }
}
