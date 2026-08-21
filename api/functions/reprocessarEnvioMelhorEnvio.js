// reprocessarEnvioMelhorEnvio — botão "Reprocessar envio" da tela de pedidos
// (admin). Reexecuta gerarEnvioAutomatico pra uma venda já paga, devolvendo
// o motivo exato de sucesso/pulo pra tela — sem isso, a única forma de saber
// por que o envio automático não foi gerado era abrir o banco direto.
//
// Idempotente: se a venda já tem raw_base44.melhor_envio.order_id, a própria
// gerarEnvioAutomatico devolve skipped:'ja_gerado' sem comprar etiqueta de novo.
// Autenticação: body.actorId precisa ser admin/super_admin (mesmo padrão do
// melhorEnvioOAuth.js).
import { gerarEnvioAutomatico } from '../_lib/melhorEnvioShipment.js';
import { exigirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  const root = String(SUPABASE_URL || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  return fetch(`${root}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    if (!SUPABASE_URL || !SR) return res.status(200).json({ ok: false, error: 'Config do servidor ausente (Supabase).' });

    const actorId = String(body.actorId || '').trim();
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, actorId, 'reprocessarEnvioMelhorEnvio');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    if (!actorId) return res.status(200).json({ ok: false, error: 'Sessão não identificada. Entre novamente como administrador.' });
    const atorResp = await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`);
    const atorJson = await atorResp.json().catch(() => null);
    const ator = Array.isArray(atorJson) ? atorJson[0] : null;
    if (!ator) return res.status(200).json({ ok: false, error: 'Usuário não encontrado.' });
    if (ator.role !== 'admin' && ator.role !== 'super_admin') return res.status(200).json({ ok: false, error: 'Apenas administradores.' });

    const saleId = String(body.sale_id || '').trim();
    if (!saleId) return res.status(200).json({ ok: false, error: 'sale_id é obrigatório.' });

    const saleResp = await sb(`catalog_sales?select=*&id=eq.${encodeURIComponent(saleId)}&limit=1`);
    const saleRows = await saleResp.json().catch(() => null);
    const sale = Array.isArray(saleRows) ? saleRows[0] : null;
    if (!sale) return res.status(200).json({ ok: false, error: 'Venda não encontrada.' });
    if (sale.status !== 'paid' && sale.status !== 'entregue') {
      return res.status(200).json({ ok: false, error: `Venda ainda não está paga (status atual: ${sale.status}).` });
    }

    const resultado = await gerarEnvioAutomatico(sale);
    return res.status(200).json({ ok: true, resultado });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}
