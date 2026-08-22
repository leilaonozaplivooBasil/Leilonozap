// waGroupDiagZapi — diagnóstico dos grupos de WhatsApp que o número do Zeca/Heloim (Z-API)
// já participa. Mesmo objetivo do antigo waGroupDiag.js (Evolution API), adaptado pro Z-API,
// pra descobrir o ID de cada grupo (campo "phone", formato "1202...-group") e configurar
// GRUPOS_HELOIM_IDS na Edge Function whatsapp-router.
//
// Protegido pela mesma DIAG_KEY que já existe (nunca devolve token do Z-API na resposta).

const ZAPI_BASE_URL = (process.env.ZAPI_BASE_URL || 'https://api.z-api.io').replace(/\/$/, '');
const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID || '';
const ZAPI_TOKEN = process.env.ZAPI_TOKEN || '';
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || '';

const zapi = async (path) => {
  try {
    const r = await fetch(`${ZAPI_BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}${path}`, {
      headers: ZAPI_CLIENT_TOKEN ? { 'Client-Token': ZAPI_CLIENT_TOKEN } : {},
    });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* corpo não era JSON */ }
    return { ok: r.ok, status: r.status, json, text: json ? undefined : text.slice(0, 300) };
  } catch (e) {
    return { ok: false, status: 0, erro: String(e?.cause?.code || e?.message || e) };
  }
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    if (!process.env.DIAG_KEY || body.key !== process.env.DIAG_KEY) return res.status(403).json({ error: 'forbidden' });
    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      return res.status(500).json({ error: 'zapi env ausente', tem_instance: !!ZAPI_INSTANCE_ID, tem_token: !!ZAPI_TOKEN });
    }

    const page = Number(body.page) || 1;
    const pageSize = Number(body.pageSize) || 50;
    const r = await zapi(`/groups?page=${page}&pageSize=${pageSize}`);

    const lista = Array.isArray(r.json)
      ? r.json.map((g) => ({ id: g.phone, nome: g.name, participantes: g.participants?.length ?? null }))
      : null;

    return res.status(200).json({
      pagina: page,
      grupos: lista ?? { status: r.status, corpo: r.json ?? r.text, erro: r.erro },
      dica: lista ? 'Copie o campo "id" do grupo certo pra GRUPOS_HELOIM_IDS (separado por vírgula se mais de um).' : undefined,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
