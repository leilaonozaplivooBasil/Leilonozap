// proxyImage — Rota Vercel que faltava. O cliente chama /api/functions/proxyImage
// (via base44.functions.invoke) pra contornar CORS de imagens externas. A função
// Base44 existe (base44/functions/proxyImage/entry.ts) mas a rota Vercel nunca
// foi criada — sem ela, o proxy retorna 404 e o share com imagem externa falha.
//
// Lógica idêntica à função Base44: download server-side (sem CORS) → upload
// pro bucket public-assets do Supabase → retorna { file_url } com URL supabase
// (que tem CORS headers, então o fetch do cliente funciona).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    const imageUrl = body?.imageUrl;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ error: 'Config ausente' });

    // Se já é do Supabase, retorna direto (não precisa de proxy — tem CORS)
    if (imageUrl.includes('supabase.co') || imageUrl.includes('base44.app')) {
      return res.status(200).json({ file_url: imageUrl });
    }

    // Download server-side (sem restrição CORS — mesma lógica da função Base44)
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!imageResponse.ok) {
      return res.status(502).json({ error: `Failed to download image: ${imageResponse.status}` });
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await imageResponse.arrayBuffer();

    if (imageBuffer.byteLength < 100) {
      return res.status(502).json({ error: 'Downloaded image too small, likely invalid' });
    }

    // Determina extensão
    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('gif')) ext = '.gif';

    const fileName = `proxy_${Date.now()}${ext}`;
    const filePath = `proxy/${fileName}`;

    // Upload pro bucket public-assets do Supabase (mesmo bucket do adapter Core.UploadFile)
    const uploadResp = await fetch(`${SUPABASE_URL}/storage/v1/object/public-assets/${filePath}`, {
      method: 'POST',
      headers: {
        apikey: SR,
        Authorization: `Bearer ${SR}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: imageBuffer,
    });

    if (!uploadResp.ok) {
      const errText = await uploadResp.text().catch(() => '');
      return res.status(502).json({ error: `Upload failed: ${uploadResp.status}`, details: errText });
    }

    // URL pública do Supabase (tem CORS headers — o fetch do cliente funciona)
    const file_url = `${SUPABASE_URL}/storage/v1/object/public/public-assets/${filePath}`;

    return res.status(200).json({ file_url });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}