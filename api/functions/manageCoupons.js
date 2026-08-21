// manageCoupons — CRUD de cupons pro admin (lista, cria, ativa/desativa, exclui). Via service_role.
//
// ══════════════════════════════════════════════════════════════════════════════
// 🔒 FASE 1, item 7 (21/08/2026) — BURACO ENCONTRADO NA RELEITURA, NÃO ESTAVA
//     NA AUDITORIA DE 20/08.
// ══════════════════════════════════════════════════════════════════════════════
// COMO ESTAVA: esta rota não conferia NADA. Nem crachá, nem papel, nem id.
// Qualquer pessoa na internet mandava
//     POST /api/functions/manageCoupons
//     { "action": "create", "code": "GRATIS", "tipo": "percent", "valor": 100 }
// e ganhava um cupom de 100% de desconto válido na Loja Virtual. Também dava
// pra LISTAR todos os cupons (action:'list') e EXCLUIR os que existem.
//
// O QUE MUDOU: agora exige `actorId` e confere no BANCO que essa pessoa é
// admin/super_admin — a mesma regra que as outras rotas de operador já usam.
// E o crachá amarra o `actorId` a quem realmente está chamando (ETAPA 1: só
// anota no log; ETAPA 2: recusa).
//
// ⚠️ ISTO MUDA O CONTRATO DA ROTA: a tela CuponsAdmin.jsx passa a mandar o
// actorId. Aba de admin aberta ANTES do deploy vai receber "Acesso restrito"
// até recarregar a página. É o único efeito colateral, e ele é preferível a
// deixar a emissão de cupom aberta pra internet.
import { exigirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    // 🔐 quem está chamando + o crachá que prova que é essa pessoa mesmo
    const actorId = String(body?.actorId || body?.actor_id || '').trim();
    const _ses = exigirSessao(req, actorId, 'manageCoupons');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    if (!actorId) return res.status(403).json({ success: false, error: 'Acesso restrito a administradores' });
    const atorRows = await (await sb(`app_users?select=role,primary_career_level&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const ator = Array.isArray(atorRows) ? atorRows[0] : null;
    const ehAdmin = ator && (['admin', 'super_admin'].includes(ator.role) || ['admin', 'super_admin'].includes(ator.primary_career_level));
    if (!ehAdmin) return res.status(403).json({ success: false, error: 'Acesso restrito a administradores' });

    const action = String(body?.action || 'list');

    if (action === 'list') {
      const rows = await (await sb('coupons?select=*&order=created_at.desc&limit=200')).json();
      return res.status(200).json({ success: true, coupons: Array.isArray(rows) ? rows : [] });
    }

    if (action === 'create') {
      const code = String(body?.code || '').trim().toUpperCase();
      const tipo = body?.tipo === 'fixed' ? 'fixed' : 'percent';
      const valor = Number(body?.valor);
      if (!code) return res.status(200).json({ success: false, error: 'Informe o código' });
      if (!(valor > 0)) return res.status(200).json({ success: false, error: 'Valor inválido' });
      if (tipo === 'percent' && valor > 100) return res.status(200).json({ success: false, error: 'Percentual máximo 100' });
      const payload = {
        code, tipo, valor,
        min_order: body?.min_order ? Number(body.min_order) : 0,
        validade: body?.validade || null,
        uso_max: body?.uso_max ? parseInt(body.uso_max, 10) : null,
        seller_id: body?.seller_id || null,
        descricao: body?.descricao || null,
        active: body?.active !== false,
      };
      const r = await sb('coupons', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: t.includes('duplicate') ? 'Já existe um cupom com esse código' : 'Falha ao criar', details: t.slice(0, 160) }); }
      const rows = await r.json();
      return res.status(200).json({ success: true, coupon: rows?.[0] });
    }

    if (action === 'toggle') {
      const id = String(body?.id || '');
      if (!id) return res.status(200).json({ success: false, error: 'id obrigatório' });
      await sb(`coupons?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: !!body?.active }) });
      return res.status(200).json({ success: true });
    }

    if (action === 'delete') {
      const id = String(body?.id || '');
      if (!id) return res.status(200).json({ success: false, error: 'id obrigatório' });
      await sb(`coupons?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Ação inválida' });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
