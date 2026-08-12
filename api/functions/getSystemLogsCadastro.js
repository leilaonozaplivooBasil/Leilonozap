// getSystemLogsCadastro — lê os logs de auditoria de cadastro (system_logs) via
// service_role. Leitura de system_logs é restrita a admin/service_role por RLS
// (o front com chave anon não consegue ler essa tabela), por isso esta rota existe:
// devolve, pra cada usuário, o MOTIVO REAL registrado no momento do cadastro
// (ex: qual código de indicação foi tentado e não foi encontrado).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const componentes = ['publicRegister', 'registerNetworkUser', 'googleLogin'].map((c) => `component_name.eq.${c}`).join(',');
    const r = await sb(`system_logs?select=entity_id,message,payload,created_at,component_name&step=eq.FALLBACK_SITE_OFICIAL&or=(${componentes})&order=created_at.desc&limit=2000`);
    const rows = await r.json();
    if (!r.ok) return res.status(200).json({ success: false, error: 'Falha ao consultar logs', details: rows });

    return res.status(200).json({ success: true, logs: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao consultar logs', details: String(e?.message || e) });
  }
}