// googleLogin — verifica o ID token do Google Identity Services e faz login/cadastro
// automático em app_users. Espelha base44/functions/googleLogin/entry.ts (Deno),
// mas roda como função Vercel (mesmo runtime das outras rotas de auth em produção).
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 🐛 CAUSA-RAIZ (11/08/2026): cadastro por Google criava o usuário SEM referral_code,
// role, career_levels — ficavam null pra sempre (o próprio link de indicação dessa
// pessoa não funcionava, e ela não tinha o role 'user' padrão). Mesmo gerador usado
// em publicRegister.js/registerNetworkUser.js, pra todo cadastro sair completo.
function genReferral(name) {
  const base = String(name || 'user').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').slice(0, 8) || 'user';
  return base + crypto.randomBytes(2).toString('hex');
}
// 🕵️ Códigos antigos já compartilhados publicamente ANTES de uma correção manual no
// referral_code — mantém o link antigo funcionando (aponta pro mesmo usuário) mesmo
// depois do código dele ter sido corrigido. Chave sempre em MAIÚSCULO.
const LEGACY_REF_ALIASES = { YARASHOPE: '6979205eb30397ea74dc0d7a' }; // Iara Figueiredo — código antigo tinha "Yara" errado

async function referralUnico(sbFn, name) {
  let code = genReferral(name);
  for (let i = 0; i < 5; i++) {
    const dup = await (await sbFn(`app_users?select=id&referral_code=eq.${encodeURIComponent(code)}&limit=1`)).json();
    if (!Array.isArray(dup) || !dup.length) break;
    code = genReferral(name);
  }
  return code;
}

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// 👀 Lê o e-mail que VEM DENTRO do token, sem validar nada, só para ADIANTAR a
// busca no banco em paralelo com a validação oficial no Google.
// ⚠️ REGRA DE SEGURANÇA: este valor JAMAIS decide login. O usuário adiantado só
// é aproveitado se o e-mail CONFIRMADO pelo Google for exatamente o mesmo.
function espiarEmail(credential) {
  try {
    const parte = String(credential).split('.')[1];
    if (!parte) return null;
    const json = Buffer.from(parte.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const email = JSON.parse(json)?.email;
    return email ? String(email).toLowerCase().trim() : null;
  } catch {
    return null;
  }
}

async function buscarPorEmail(email) {
  try {
    const r = await sb(`app_users?select=*&email=eq.${encodeURIComponent(email)}&limit=1`);
    const j = await r.json();
    return Array.isArray(j) ? j[0] || null : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });

  const t0 = Date.now();
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

    // ⚡ PARALELO (06/08/2026 — otimização de lentidão): a validação no Google e a
    // busca do usuário saem JUNTAS. Antes era em fila (validar → buscar), somando
    // as duas latências. As validações abaixo continuam sendo a ÚNICA fonte de
    // verdade — nada é aceito com base no e-mail espiado.
    const emailEspiado = espiarEmail(credential);
    const [verifyRes, userAdiantado] = await Promise.all([
      fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`),
      emailEspiado ? buscarPorEmail(emailEspiado) : Promise.resolve(null),
    ]);

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

    // Aproveita o adiantamento SÓ se o e-mail confirmado bater; senão busca do zero.
    let user = userAdiantado && String(userAdiantado.email || '').toLowerCase() === email ? userAdiantado : null;
    if (!user) user = await buscarPorEmail(email);

    if (!user) {
      // 🌳 REGRA DA ÁRVORE GENEALÓGICA: ninguém entra solto — sem link de indicação,
      // o cadastro fica sob o Leilão NoZap - Site Oficial (raiz da árvore).
      // ⚡ As duas consultas saem em paralelo, mas a PRECEDÊNCIA é a mesma de antes:
      // indicador do link primeiro; Site Oficial só quando não há link válido.
      // 🔎 ilike (case/trim-insensitive) — o mesmo código colado com maiúscula/espaço
      // extra do link do WhatsApp não pode cair silenciosamente no Site Oficial.
      const refAlias = ref_code ? LEGACY_REF_ALIASES[ref_code.toUpperCase()] : null;
      const [porLink, siteOficial] = await Promise.all([
        (!refAlias && ref_code)
          ? sb(`app_users?select=id&referral_code=ilike.${encodeURIComponent(ref_code)}&limit=1`).then((r) => r.json()).catch(() => null)
          : Promise.resolve(null),
        sb('app_users?select=id&referral_code=eq.leilaonozap&limit=1').then((r) => r.json()).catch(() => null),
      ]);
      let referred_by_id = refAlias || (Array.isArray(porLink) && porLink[0] ? porLink[0].id : null);
      // 🕵️ auditoria: por que caiu no Site Oficial (se caiu)
      const fallback_motivo = referred_by_id ? null : (ref_code ? `código de indicação "${ref_code}" não encontrado` : 'sem código de indicação');
      if (!referred_by_id) {
        referred_by_id = Array.isArray(siteOficial) && siteOficial[0] ? siteOficial[0].id : null;
      }
      const nomeNovo = payload.name || email.split('@')[0];
      const referral_code = await referralUnico(sb, nomeNovo);
      const created = await (await sb('app_users', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          full_name: nomeNovo,
          email,
          password: crypto.randomUUID(),
          phone: '',
          referred_by_id,
          referral_code,
          role: 'user',
          career_levels: ['usuario'],
          primary_career_level: 'usuario',
          terms_accepted: true,
          avatar_url: payload.picture || ''
        })
      })).json();
      user = Array.isArray(created) ? created[0] : created;
      // 🕵️ AUDITORIA (12/08/2026): todo cadastro que cair no Site Oficial fica registrado
      // com o motivo — nunca mais "ninguém sabe de onde veio" em silêncio.
      if (fallback_motivo && user?.id) {
        sb('system_logs', {
          method: 'POST', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            component_name: 'googleLogin', step: 'FALLBACK_SITE_OFICIAL', status: 'warning',
            message: `Cadastro (Google) de ${email} vinculado ao Site Oficial — motivo: ${fallback_motivo}`,
            entity_id: user.id, payload: { email, ref_code, motivo: fallback_motivo },
          }),
        }).catch(() => {});
      }
    }

    if (!user) return res.status(500).json({ success: false, error: 'Não foi possível criar/recuperar o usuário.' });

    delete user.password; // jamais devolve senha/hash
    // ⏱️ duracao_ms: o front registra no log do sistema quando passa do limite,
    // pra a lentidão do Google deixar de ser invisível.
    return res.status(200).json({ success: true, user, duracao_ms: Date.now() - t0 });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao entrar com Google', details: String(e?.message || e), duracao_ms: Date.now() - t0 });
  }
}