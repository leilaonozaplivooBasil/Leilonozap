// xgameGerarImagem — O GERADOR DE ARTE DA X-GAME (personagens da jornada).
// Gera uma imagem via AI Gateway (Nano Banana / Gemini image) e salva no
// storage público, devolvendo a URL. Protegido por token do cofre
// (app_segredos.gerador_imagem_token) — sem o token, nada roda.
// GET  ?t=TOKEN&p=prompt&n=nome_do_arquivo → { ok, url }
// GET  sem params → health { ok, ia }
const AI_KEY = process.env.AI_GATEWAY_API_KEY || '';
const OIDC = process.env.VERCEL_OIDC_TOKEN || '';
const GATEWAY = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const MODEL = process.env.AI_MODEL_IMAGEM || 'google/gemini-2.5-flash-image';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function segredo(id) {
  try {
    if (!SUPABASE_URL || !SR) return null;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/app_segredos?id=eq.${id}&select=valor&limit=1`, {
      headers: { apikey: SR, Authorization: `Bearer ${SR}` },
      signal: AbortSignal.timeout(5000),
    });
    const j = await r.json().catch(() => []);
    return Array.isArray(j) && j[0]?.valor ? String(j[0].valor) : null;
  } catch { return null; }
}
async function chaveDaIA() {
  if (AI_KEY || OIDC) return AI_KEY || OIDC;
  return segredo('ai_gateway_key');
}

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const q = req.query || {};
    const token = String(q.t || '').slice(0, 128);
    const prompt = String(q.p || '').slice(0, 2000);
    const nome = String(q.n || `arte_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || `arte_${Date.now()}`;

    if (!token || !prompt) {
      const chave = await chaveDaIA();
      return res.status(200).json({ ok: true, ia: Boolean(chave), model: MODEL });
    }

    const tokenOficial = await segredo('gerador_imagem_token');
    if (!tokenOficial || token !== tokenOficial) {
      return res.status(401).json({ ok: false, error: 'token inválido' });
    }
    const auth = await chaveDaIA();
    if (!auth) return res.status(200).json({ ok: false, error: 'IA não conectada' });

    const r = await fetch(GATEWAY, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(50000),
    });
    const bruto = await r.text();
    if (!r.ok) return res.status(200).json({ ok: false, error: `gateway ${r.status}`, details: bruto.slice(0, 300) });

    // a imagem volta como data URL em algum canto do JSON (formatos variam
    // por provedor) — caça o primeiro base64 de imagem, robusto a mudanças
    const m = bruto.match(/data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=\\]+)/);
    if (!m) return res.status(200).json({ ok: false, error: 'sem imagem na resposta', details: bruto.slice(0, 300) });
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    const buf = Buffer.from(m[2].replace(/\\/g, ''), 'base64');

    const caminho = `xgame/personagens/${nome}.${ext}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/public-assets/${caminho}`, {
      method: 'POST',
      headers: {
        apikey: SR,
        Authorization: `Bearer ${SR}`,
        'Content-Type': `image/${m[1]}`,
        'x-upsert': 'true',
      },
      body: buf,
      signal: AbortSignal.timeout(20000),
    });
    if (!up.ok) {
      const det = await up.text().catch(() => '');
      return res.status(200).json({ ok: false, error: `upload ${up.status}`, details: det.slice(0, 200) });
    }
    return res.status(200).json({
      ok: true,
      url: `${SUPABASE_URL}/storage/v1/object/public/public-assets/${caminho}`,
      bytes: buf.length,
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e).slice(0, 200) });
  }
}
