// googleLogin — verifica o ID token do Google Identity Services e faz login/cadastro
// automático em app_users. Espelha base44/functions/googleLogin/entry.ts (Deno),
// mas roda como função Vercel (mesmo runtime das outras rotas de auth em produção).

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
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });

  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const credential = body?.credential;
    // 🔗 CAUSA-RAIZ (05/08/2026): o cadastro por Google NUNCA recebia o código do
    // link de indicação. Quem chegava pelo link de um distribuidor (ex.: Eloá) e
    // clicava "Entrar com Google" era criado direto sob o Site Oficial, roubando a
    // linha de quem indicou. Agora o ref_code do link vem do front e é respeitado.
    const ref_code = String(body?.ref_code || '').trim();
    if (!credential) return res.status(400).json({ success: false, error: 'Token do Google não informado.' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // Verifica o ID token direto com o Google (não precisa de client secret pra isso)
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!verifyRes.ok) {
      return res.status(401).json({ success: false, error: 'Token do Google inválido ou expirado.' });
    }
    const payload = await verifyRes.json();

    const expectedClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    if (!expectedClientId || payload.aud !== expectedClientId) {
      return res.status(401).json({ success: false, error: 'Token do Google não pertence a este app.' });
    }

    const emailVerified = payload.email_verified === 'true' || payload.email_verified === true;
    if (!emailVerified) {
      return res.status(401).json({ success: false, error: 'E-mail do Google não verificado.' });
    }

    const email = String(payload.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ success: false, error: 'Não foi possível obter o e-mail da conta Google.' });
    }

    const existing = await (await sb(`app_users?select=*&email=eq.${encodeURIComponent(email)}&limit=1`)).json();
    let user = Array.isArray(existing) ? existing[0] : null;

    if (!user) {
      // 🌳 REGRA DA ÁRVORE GENEALÓGICA: ninguém entra solto — sem link de indicação,
      // o cadastro fica sob o Leilão NoZap - Site Oficial (raiz da árvore).
      let referred_by_id = null;
      if (ref_code) {
        const ind = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(ref_code)}&limit=1`)).json();
        if (Array.isArray(ind) && ind[0]) referred_by_id = ind[0].id;
      }
      if (!referred_by_id) {
        const site = await (await sb('app_users?select=id&referral_code=eq.leilaonozap&limit=1')).json();
        referred_by_id = Array.isArray(site) && site[0] ? site[0].id : null;
      }
      const created = await (await sb('app_users', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          full_name: payload.name || email.split('@')[0],
          email,
          password: crypto.randomUUID(),
          phone: '',
          referred_by_id,
          avatar_url: payload.picture || ''
        })
      })).json();
      user = Array.isArray(created) ? created[0] : created;
    }

    if (!user) return res.status(500).json({ success: false, error: 'Não foi possível criar/recuperar o usuário.' });

    delete user.password; // jamais devolve senha/hash
    return res.status(200).json({ success: true, user });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao entrar com Google', details: String(e?.message || e) });
  }
}