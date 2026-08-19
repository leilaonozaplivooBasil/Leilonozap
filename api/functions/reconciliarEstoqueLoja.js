// reconciliarEstoqueLoja — endpoint admin para sincronização em lote do
// catalog_active com o estoque real. Roda uma única vez para corrigir o
// histórico (produtos que tinham quantity=0 mas ainda estavam visíveis na
// loja por não terem passado pelo baixaEstoque atualizado).
//
// O que faz:
//   1. Busca todos os produtos com quantity <= 0 E catalog_active = true
//      → seta catalog_active = false (oculta da vitrine)
//   2. Opcionalmente (se body.reativar = true), busca produtos com
//      quantity > 0 E catalog_active = false E status = 'ESTOQUE'
//      → seta catalog_active = true (reativa produtos que tenham estoque)
//
// Autenticação: body.actorId precisa ser admin ou super_admin.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  const root = String(SUPABASE_URL || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  return fetch(`${root}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

const PAGE = 1000; // lote de leitura (Supabase limita 1000 por padrão)

async function fetchAll(path) {
  const results = [];
  let offset = 0;
  while (true) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await sb(`${path}${sep}limit=${PAGE}&offset=${offset}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    results.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return results;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { actorId, reativar = false, dry_run = false } = body || {};

  // autenticação básica — verifica se é admin/super_admin
  if (!actorId) return res.status(403).json({ ok: false, error: 'actorId obrigatório' });
  const actorRes = await sb(`app_users?select=primary_career_level&id=eq.${encodeURIComponent(actorId)}&limit=1`);
  const [actor] = await actorRes.json().catch(() => []);
  if (!actor || !['admin', 'super_admin'].includes(actor.primary_career_level)) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito a administradores' });
  }

  try {
    // ── Etapa 1: ocultar produtos esgotados ainda visíveis na loja ──────────
    const zerados = await fetchAll(
      'products?select=id,description,quantity&catalog_active=eq.true&quantity=lte.0'
    );

    let ocultados = 0;
    for (const p of zerados) {
      if (!dry_run) {
        await sb(`products?id=eq.${encodeURIComponent(p.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ catalog_active: false, status: 'VENDIDO' }),
        });
      }
      ocultados++;
    }

    // ── Etapa 2 (opcional): reativar produtos com estoque ocultos sem motivo ─
    let reativados = 0;
    const reativadosList = [];
    if (reativar) {
      // só reativa se quantity > 0 E status indica que deveria estar ativo
      const comEstoque = await fetchAll(
        'products?select=id,description,quantity,status&catalog_active=eq.false&quantity=gt.0&status=neq.INATIVO'
      );
      for (const p of comEstoque) {
        if (!dry_run) {
          await sb(`products?id=eq.${encodeURIComponent(p.id)}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ catalog_active: true, status: 'ESTOQUE' }),
          });
        }
        reativados++;
        reativadosList.push({ id: p.id, description: p.description, quantity: p.quantity });
      }
    }

    return res.status(200).json({
      ok: true,
      dry_run,
      ocultados,
      reativados,
      zerados_amostra: zerados.slice(0, 10).map(p => ({ id: p.id, description: p.description, quantity: p.quantity })),
      reativados_lista: reativadosList.slice(0, 20),
      resumo: dry_run
        ? `[DRY RUN] Seriam ocultados ${ocultados} e reativados ${reativados} produtos.`
        : `Concluído: ${ocultados} produtos ocultados (qty≤0) e ${reativados} reativados (qty>0).`,
    });
  } catch (e) {
    console.error('reconciliarEstoqueLoja:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
