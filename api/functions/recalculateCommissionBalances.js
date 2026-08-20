// recalculateCommissionBalances — RECONCILIAÇÃO 🔴 ALTO RISCO (saldo/comissão).
//
// 🔒 PONTO 98 (21/08/2026) — RISCO CRÍTICO #2 da auditoria geral: esta rota
// estava PÚBLICA. Qualquer pessoa da internet fazia um POST com corpo vazio e
// reescrevia o commission_balance de até 2.000 usuários. Sem senha, sem chave,
// sem admin. Agora exige DIAG_KEY (mesmo padrão de outras 15 rotas do projeto)
// e roda em PREVIEW por padrão — só grava com confirm:'RECALCULAR'.
//
// ⚠️⚠️ ATENÇÃO ANTES DE RODAR COM confirm — O CÁLCULO AQUI É INCOMPLETO.
// Ele reescreve o saldo com a soma de commission_records. Mas a COMISSÃO DE
// LEILÃO (os 5% do martelo) NÃO grava registro nenhum: finalizeAuctionCore.js:192
// credita direto em app_users.commission_balance. Ou seja, rodar isto HOJE
// APAGA a comissão de leilão de todo mundo — dinheiro real que a pessoa ganhou.
// O mesmo vale para qualquer crédito que não passe por commission_records.
// Enquanto o leilão não gravar registro (risco #15 da auditoria), esta rota só
// deve ser usada em PREVIEW, para diagnóstico. Não confirme sem conferir.
// Corrige commission_balance/catalog_commission_balance de todo usuário com saldo,
// recalculando a partir da SOMA REAL dos commission_records ativos (status != 'canceled').
// Usa service role (bypassa RLS do browser) e pagina os registros — sem isso, updates
// via SDK do cliente falham (RLS) e leituras via SDK cortam em 1000 registros.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    // Falha FECHADA: sem DIAG_KEY publicada no ambiente, ninguém entra.
    if (!process.env.DIAG_KEY || body.key !== process.env.DIAG_KEY) {
      return res.status(403).json({ success: false, error: 'forbidden' });
    }
    // Preview por padrão: só grava com confirm explícito.
    const aplicar = body.confirm === 'RECALCULAR';

    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const users = await (await sb(`app_users?select=id,full_name,commission_balance,catalog_commission_balance&commission_balance=gt.0&limit=2000`)).json();
    if (!Array.isArray(users)) return res.status(200).json({ success: false, error: 'Falha ao buscar usuários', details: users });

    const results = [];
    for (const u of users) {
      let all = [];
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const rows = await (await sb(`commission_records?select=amount,sale_type&user_id=eq.${encodeURIComponent(u.id)}&status=neq.canceled&limit=${pageSize}&offset=${offset}`)).json();
        if (!Array.isArray(rows) || rows.length === 0) break;
        all = all.concat(rows);
        if (rows.length < pageSize) break;
        offset += pageSize;
      }

      const total = round2(all.reduce((s, r) => s + (Number(r.amount) || 0), 0));
      const catalogTotal = round2(all.filter((r) => r.sale_type === 'catalog' || !r.sale_type).reduce((s, r) => s + (Number(r.amount) || 0), 0));
      const before = round2(u.commission_balance || 0);
      const beforeCatalog = round2(u.catalog_commission_balance || 0);
      const changed = before !== total || beforeCatalog !== catalogTotal;

      if (changed && aplicar) {
        await sb(`app_users?id=eq.${u.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_balance: total, catalog_commission_balance: catalogTotal }) });
      }

      results.push({ id: u.id, name: u.full_name, before, after: total, beforeCatalog, afterCatalog: catalogTotal, changed });
    }

    const mudariam = results.filter((r) => r.changed).length;
    return res.status(200).json({
      success: true,
      modo: aplicar ? 'APLICADO' : 'preview',
      aviso: aplicar ? undefined : 'PREVIEW — nada foi gravado. Envie confirm:"RECALCULAR" para aplicar.',
      alerta_calculo: 'Este recálculo NÃO enxerga a comissão de leilão (o martelo credita direto em app_users, sem gravar commission_records). Aplicar isto zera esse ganho.',
      updated: aplicar ? mudariam : 0,
      mudariam,
      results,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao recalcular saldos', details: String(e?.message || e) });
  }
}