// 🧾 relatorioComissoes — o relatório da tela de Pagamentos de Comissões por
// ORIGEM (indicação de depósito 10% · leilão 5%/10% · loja virtual por cargo),
// com a empresa separada das pessoas e a auditoria viva "saldo × extrato"
// (05/10/2026, DIR-200).
//
// Dono: "atualize os pagamentos após os 7 dias; relatório destrinchando os 10%
// dos depósitos, os 5% do leilão e a venda da loja por licença."
//
// Leitura só para admin/super_admin/admin_financeiro, com crachá de sessão
// OBRIGATÓRIO (mesma régua de comissoesEmEspera.js). Quem calcula é o banco
// (relatorio_comissoes(), só servidor): aqui não entra regra nenhuma.
import { conferirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAPEIS = ['admin', 'super_admin', 'admin_financeiro'];

const sb = (path, opts = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...opts,
  headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
});

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

    const r = await sb('rpc/relatorio_comissoes', { method: 'POST', body: '{}' });
    const relatorio = await r.json().catch(() => null);
    if (!r.ok || !relatorio || typeof relatorio !== 'object') {
      return res.status(200).json({ success: false, error: 'relatorio_indisponivel', details: String(relatorio?.message || '').slice(0, 200) });
    }
    return res.status(200).json({ success: true, relatorio });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'erro', details: String(e?.message || e).slice(0, 200) });
  }
}
