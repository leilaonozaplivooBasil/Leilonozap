// GenerateImage — gera imagem via Vercel AI Gateway (Imagen/Flux), salva no Storage e retorna { url }.
// Degrada gracioso sem a chave. Usado pela aba "Imagem IA" do Material Promocional.
import crypto from 'crypto';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AI_KEY = process.env.AI_GATEWAY_API_KEY || '';
const MODEL = process.env.AI_IMAGE_MODEL || 'google/imagen-4.0-fast-generate-001';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const prompt = String(body?.prompt || '').slice(0, 2000);
    if (!prompt) return res.status(400).json({ ok: false, error: 'prompt obrigatório' });
    if (!AI_KEY) return res.status(200).json({ ok: false, needs_key: true, error: 'IA de imagem não conectada (configure AI_GATEWAY_API_KEY).' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'Config ausente' });

    const r = await fetch('https://ai-gateway.vercel.sh/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt, n: 1 }),
      signal: AbortSignal.timeout(90000),
    });
    if (!r.ok) { const t = await r.text(); return res.status(200).json({ ok: false, error: 'IA de imagem indisponível', details: t.slice(0, 200) }); }
    const j = await r.json();
    const item = (j?.data || [])[0] || {};
    let url = item.url || '';

    // se veio base64, sobe pro Storage e gera URL pública
    if (!url && item.b64_json) {
      const buf = Buffer.from(item.b64_json, 'base64');
      const path = `promo/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.png`;
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/public-assets/${path}`, {
        method: 'POST',
        headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'image/png', 'x-upsert': 'true' },
        body: buf,
      });
      if (up.ok) url = `${SUPABASE_URL}/storage/v1/object/public/public-assets/${path}`;
      else { const t = await up.text(); return res.status(200).json({ ok: false, error: 'Falha ao salvar imagem', details: t.slice(0, 160) }); }
    }
    if (!url) return res.status(200).json({ ok: false, error: 'IA não retornou imagem' });
    return res.status(200).json({ ok: true, url });
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'Erro na geração de imagem', details: String(e?.message || e) });
  }
}
