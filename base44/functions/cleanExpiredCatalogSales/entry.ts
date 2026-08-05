// ─────────────────────────────────────────────
// FUNÇÃO: cleanExpiredCatalogSales
// O QUE FAZ: cancela vendas da Loja Virtual que ficaram mais de 48h
//            aguardando pagamento (status pending_payment → canceled).
// USADO POR: rotina de limpeza / admin
// ÚLTIMA MUDANÇA: 05/08/2026 — PONTO 89: migrada do banco antigo (SDK interno)
//                 para a SUPABASE de produção. Antes ela lia uma base que hoje
//                 está VAZIA, então nunca cancelava nada de verdade.
// RISCO: 🟡 — escreve só na coluna `status` de vendas já expiradas.
// ─────────────────────────────────────────────
// ⚠️ REGRA DE NEGÓCIO INALTERADA: 48h de tolerância, só pending_payment.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
// O secret pode vir com barra no fim ou já com /rest/v1 — normaliza pra não duplicar caminho.
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

const H = {
  apikey: SR,
  Authorization: `Bearer ${SR}`,
  'Content-Type': 'application/json',
};

async function sb(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const texto = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${texto.slice(0, 300)}`);
  return texto ? JSON.parse(texto) : null;
}

Deno.serve(async (req) => {
  try {
    // Autorização continua pela plataforma (só admin dispara a limpeza).
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // ⚠️ A coluna de data na Supabase é `created_at` (não `created_date`).
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Já filtra no banco: pendentes E criadas antes do corte de 48h.
    const expiradas = await sb(
      `catalog_sales?select=id,created_at,total_amount&status=eq.pending_payment&created_at=lt.${cutoff}&order=created_at.asc&limit=500`
    );

    if (!expiradas || expiradas.length === 0) {
      return Response.json({ success: true, canceled: 0, message: 'Nenhuma venda expirada' });
    }

    const ids = expiradas.map((v: any) => v.id);

    // Cancela em uma única operação, restringindo pelos IDs já apurados.
    const atualizadas = await sb(
      `catalog_sales?id=in.(${ids.join(',')})&status=eq.pending_payment`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'canceled' }),
      }
    );

    const canceladas = Array.isArray(atualizadas) ? atualizadas.length : 0;

    // Registro de auditoria na Supabase (mesma tabela que o Diagnóstico do Sistema lê).
    await sb('system_logs', {
      method: 'POST',
      body: JSON.stringify({
        step: 'CLEAN_EXPIRED_CATALOG_SALES',
        status: 'success',
        message: `Limpeza automática: ${canceladas} vendas órfãs canceladas (corte de 48h)`,
        component_name: 'cleanExpiredCatalogSales',
        payload: { total_expiradas: expiradas.length, total_canceladas: canceladas, cutoff },
      }),
    }).catch(() => { /* auditoria não pode derrubar a limpeza */ });

    return Response.json({
      success: true,
      canceled: canceladas,
      total_expiradas: expiradas.length,
      cutoff,
    });
  } catch (error) {
    console.error('Erro na limpeza de vendas expiradas:', error?.message || error);
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
});