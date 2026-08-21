// 🔎 /api/functions/consultarAssinaturaSigilo
//
// Devolve o registro de assinatura de um documento (por padrão o Termo de
// Confidencialidade) para um usuário — é o que diz ao painel se o parceiro já
// assinou e libera as telas que dependem do sigilo.
//
// ⚠️ SOMENTE LEITURA. Não movimenta dinheiro, não altera nada.
import { exigirSessao } from '../_lib/sessao.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    const userId = String(body.user_id || '').trim();
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, userId, 'consultarAssinaturaSigilo');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    const documento = String(body.documento || 'termo_confidencialidade').trim();
    if (!userId) return res.status(200).json({ success: false, error: 'user_id é obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(200).json({ success: false, error: 'Config do servidor ausente' });

    const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/contrato_assinaturas`
      + `?user_id=eq.${encodeURIComponent(userId)}`
      + `&documento=eq.${encodeURIComponent(documento)}`
      + `&order=assinado_em.desc&limit=1`;

    const resp = await fetch(url, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } });
    if (!resp.ok) {
      const detalhe = (await resp.text().catch(() => '')).slice(0, 300);
      return res.status(200).json({ success: false, error: 'Falha ao consultar assinatura', details: detalhe });
    }
    const rows = await resp.json();
    const registro = Array.isArray(rows) && rows[0] ? rows[0] : null;

    const result = { success: true, assinado: !!registro, registro };
    return res.status(200).json({ ...result, data: result });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Falha ao consultar assinatura', details: String(e?.message || e) });
  }
}