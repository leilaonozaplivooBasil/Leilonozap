// recalculateCommissionBalances — RECONCILIAÇÃO 🔴 ALTO RISCO (saldo/comissão).
//
// 🔒 PONTO 98 (21/08/2026) — RISCO CRÍTICO #2 da auditoria geral: esta rota
// estava PÚBLICA. Qualquer pessoa da internet fazia um POST com corpo vazio e
// reescrevia o commission_balance de até 2.000 usuários. Sem senha, sem chave,
// sem admin. Agora exige DIAG_KEY (mesmo padrão de outras 15 rotas do projeto)
// e roda em PREVIEW por padrão — só grava com confirm:'RECALCULAR'.
//
// ⚠️⚠️ ATENÇÃO ANTES DE RODAR COM confirm — LEIA O QUE MUDOU EM 21/08/2026.
//
// O buraco antigo: esta rota reescreve o saldo somando commission_records, e a
// COMISSÃO DE LEILÃO não gravava registro nenhum (o martelo credita direto em
// app_users.commission_balance). Rodar isto APAGAVA a comissão de leilão de
// todo mundo — dinheiro real, sumindo sem rastro de onde tinha vindo.
//
// ✅ PONTO 100 (21/08/2026) fechou esse buraco na ORIGEM: o martelo agora grava
// linha em commission_records para as duas fatias do leilão —
// 'leilao_indicador' (os 5%) e 'leilao_retido' (o que a empresa não distribui).
// A fatia sem dono da LOJA ('empresa_rollup'), que era registrada e nunca paga,
// também passou a creditar saldo. Registro e saldo agora andam juntos.
//
// ⛔ MAS A RESSALVA CONTINUA VALENDO PARA O PASSADO. Todo arremate anterior a
// 21/08/2026 tem saldo SEM registro correspondente. Rodar isto com confirm hoje
// apaga a comissão histórica dessas pessoas. Antes de confirmar é preciso fazer
// o backfill dos arremates antigos. Até lá: PREVIEW, só para diagnóstico.
//
// ⚠️ E qualquer crédito que não passe por commission_records continua invisível
// aqui (bônus, ajuste manual, passaporte). Conferir antes, sempre.
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
      alerta_calculo: 'Desde 21/08/2026 o martelo grava commission_records (leilao_indicador e leilao_retido), então arremates NOVOS são enxergados. Arremates ANTERIORES a essa data têm saldo sem registro: aplicar isto zera o ganho histórico deles. Fazer o backfill antes de confirmar.',
      updated: aplicar ? mudariam : 0,
      mudariam,
      results,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao recalcular saldos', details: String(e?.message || e) });
  }
}