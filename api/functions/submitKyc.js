// submitKyc — usuário envia documentos + chave PIX (que DEVE ser o CPF dele). Marca KYC em análise.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const onlyDigits = (s) => String(s || '').replace(/\D/g, '');
function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    const { doc_front, selfie, doc_back, address_proof } = body || {};
    const pixTipo = String(body?.pix_tipo || 'cpf');
    if (!userId) return res.status(400).json({ success: false, error: 'Usuário obrigatório' });
    if (!doc_front || !selfie) return res.status(400).json({ success: false, error: 'Envie ao menos o documento (frente) e a selfie' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const u = (await (await sb(`app_users?select=cpf&id=eq.${encodeURIComponent(userId)}&limit=1`)).json())[0];
    if (!u) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });
    const cpf = onlyDigits(u.cpf) || onlyDigits(body?.cpf);
    if (!cpf || cpf.length !== 11) return res.status(200).json({ success: false, error: 'Informe um CPF válido (11 dígitos).' });
    // grava o CPF no perfil se ainda não tinha
    if (!onlyDigits(u.cpf)) await sb(`app_users?id=eq.${userId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ cpf }) });
    // trava: a chave de saque precisa ser o CPF do titular
    const pixKey = onlyDigits(body?.pix_key);
    if (pixTipo !== 'cpf' || pixKey !== cpf) {
      return res.status(200).json({ success: false, error: 'A chave PIX de saque precisa ser o seu CPF (mesmo titular).' });
    }

    await sb('kyc_data', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({
      user_id: userId, doc_front, doc_back: doc_back || null, selfie, address_proof: address_proof || null,
      pix_key: cpf, pix_tipo: 'cpf', cpf, submitted_at: new Date().toISOString(), reject_reason: null, reviewed_at: null,
    }) });
    await sb(`app_users?id=eq.${userId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ kyc_status: 'em_analise' }) });
    return res.status(200).json({ success: true, message: 'Documentos enviados! Sua validação está em análise.' });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao enviar KYC', details: String(e?.message || e) });
  }
}
