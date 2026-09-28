// comissoesEmEspera — comissão de indicação de depósito que ainda está nos 7 dias
// de espera (commission_ledger, 'a_liberar'). 28/09/2026, Beatriz: "não constou
// nada pra Verônica" — constava: R$ 495,00 esperando até 03/10, só que a tela de
// Pagamentos de Comissões mostrava apenas o saldo já liberado.
//
// Leitura só para admin/super_admin/admin_financeiro, com crachá de sessão
// OBRIGATÓRIO (mesma régua de lerCamposSensiveis.js): o id no corpo não vale.
import { conferirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAPEIS = ['admin', 'super_admin', 'admin_financeiro'];

const sb = (path) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } });

/** "Lorranye Vieira" → "Lorranye V." — o extrato não precisa do sobrenome inteiro. */
export function nomeCurto(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'cliente';
  return partes.length === 1 ? partes[0] : `${partes[0]} ${partes[1][0].toUpperCase()}.`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    const sessao = conferirSessao(req);
    if (!sessao.ok) return res.status(401).json({ success: false, error: 'nao_autenticado', motivo: sessao.motivo });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });
    const quem = (await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(sessao.userId)}&limit=1`)).json().catch(() => []))?.[0];
    if (!quem || !PAPEIS.includes(quem.role)) return res.status(403).json({ success: false, error: 'sem_permissao' });

    const linhas = await (await sb('commission_ledger?select=id,sale_id,beneficiary_id,beneficiary_name,amount,pct,release_at,created_at&status=eq.a_liberar&role_in_sale=eq.indicacao_deposito&order=release_at.asc&limit=2000')).json().catch(() => []);
    if (!Array.isArray(linhas) || linhas.length === 0) return res.status(200).json({ success: true, rows: [] });

    const ids = [...new Set(linhas.map((l) => l.sale_id).filter(Boolean))].map((i) => `"${String(i).replace(/"/g, '')}"`).join(',');
    const vendas = ids ? await (await sb(`catalog_sales?select=id,buyer_id,total_amount,created_date,created_at&id=in.(${encodeURIComponent(ids)})`)).json().catch(() => []) : [];
    const porVenda = new Map((Array.isArray(vendas) ? vendas : []).map((v) => [v.id, v]));
    const compradores = [...new Set((Array.isArray(vendas) ? vendas : []).map((v) => v.buyer_id).filter(Boolean))].map((i) => `"${String(i).replace(/"/g, '')}"`).join(',');
    const pessoas = compradores ? await (await sb(`app_users?select=id,full_name&id=in.(${encodeURIComponent(compradores)})`)).json().catch(() => []) : [];
    const nomePorId = new Map((Array.isArray(pessoas) ? pessoas : []).map((p) => [p.id, p.full_name]));

    const rows = linhas.map((l) => {
      const v = porVenda.get(l.sale_id) || {};
      return {
        id: l.id, user_id: l.beneficiary_id, user_name: l.beneficiary_name, amount: Number(l.amount) || 0, percent: Number(l.pct) || 0,
        release_at: l.release_at, deposito: Number(v.total_amount) || 0, depositado_em: v.created_date || v.created_at || l.created_at,
        cliente: nomeCurto(nomePorId.get(v.buyer_id)),
      };
    });
    return res.status(200).json({ success: true, rows });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'erro', details: String(e?.message || e) });
  }
}
