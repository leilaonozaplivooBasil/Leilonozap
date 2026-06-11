// InvokeLLM — geração de texto via Vercel AI Gateway. Aceita response_json_schema (retorna o objeto
// parseado direto, como o SDK Base44). Auth: AI_GATEWAY_API_KEY OU VERCEL_OIDC_TOKEN. Degrada gracioso.
const AI_KEY = process.env.AI_GATEWAY_API_KEY || '';
const OIDC = process.env.VERCEL_OIDC_TOKEN || '';
const MODEL = process.env.AI_MODEL || 'anthropic/claude-haiku-4-5';
const GATEWAY = 'https://ai-gateway.vercel.sh/v1/chat/completions';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const prompt = String(body?.prompt || '').slice(0, 8000);
    const schema = body?.response_json_schema || body?.response_schema || null;
    if (!prompt) return res.status(400).json({ ok: false, error: 'prompt obrigatório' });
    const auth = AI_KEY || OIDC;
    if (!auth) return res.status(200).json({ ok: false, needs_key: true, error: 'IA não conectada (configure AI_GATEWAY_API_KEY).' });

    const sys = schema
      ? `Você é um assistente da Leilão NoZap. Responda SOMENTE com um JSON válido que satisfaça este schema (sem markdown, sem texto fora do JSON):\n${JSON.stringify(schema)}`
      : 'Você é um assistente da Leilão NoZap. Responda em português do Brasil, direto.';

    const r = await fetch(GATEWAY, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }],
        max_tokens: 1200, temperature: 0.6,
        ...(schema ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(28000),
    });
    if (!r.ok) { const t = await r.text(); return res.status(200).json({ ok: false, error: 'IA indisponível', details: t.slice(0, 200) }); }
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content || '';
    if (schema) {
      try {
        const clean = content.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
        const obj = JSON.parse(clean);
        return res.status(200).json(obj); // Base44 retorna o objeto direto
      } catch {
        return res.status(200).json({ ok: false, error: 'IA não retornou JSON válido', raw: content.slice(0, 300) });
      }
    }
    return res.status(200).json({ ok: true, text: content, response: content });
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'Erro na IA', details: String(e?.message || e) });
  }
}
