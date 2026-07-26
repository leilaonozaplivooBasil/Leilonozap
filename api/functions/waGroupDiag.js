// waGroupDiag — diagnóstico/configuração da Evolution API para o Rank Premiado (Etapa 9).
// Protegido por DIAG_KEY (env). Nunca devolve credenciais — só estado da instância,
// eventos do webhook e a lista de grupos (pra descobrir o JID do grupo do concurso).
// Ops:
//   status              → connectionState + webhook find + grupos
//   enable_group_events → adiciona GROUP_PARTICIPANTS_UPDATE preservando os eventos atuais

const EVO = (process.env.EVOLUTION_URL || '').replace(/\/$/, '');
const KEY = process.env.EVOLUTION_KEY || '';
const INST = process.env.EVOLUTION_INSTANCE || 'leilonozap';

const evo = async (path, opts = {}) => {
  try {
    const r = await fetch(`${EVO}${path}`, {
      ...opts,
      headers: { apikey: KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* */ }
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
    if (!EVO || !KEY) return res.status(500).json({ error: 'evolution env ausente', tem_url: !!EVO, tem_key: !!KEY, instancia: INST });
    const op = String(body.op || 'status');

    // metadados seguros da URL (sem expor host completo nem credencial)
    let urlInfo = {};
    try { const u = new URL(EVO); urlInfo = { protocolo: u.protocol, host_mascarado: u.hostname.replace(/^(.{4}).*(\..+)$/, '$1…$2'), porta: u.port || null }; } catch { urlInfo = { invalida: true }; }

    if (op === 'status') {
      const [state, webhook, groups] = await Promise.all([
        evo(`/instance/connectionState/${INST}`),
        evo(`/webhook/find/${INST}`),
        evo(`/group/fetchAllGroups/${INST}?getParticipants=false`),
      ]);
      const lista = Array.isArray(groups.json)
        ? groups.json.map((g) => ({ id: g.id, subject: g.subject, size: g.size ?? g.participants?.length ?? null }))
        : groups.json;
      return res.status(200).json({ instance: INST, url: urlInfo, state: state.json ?? state, webhook: webhook.json ?? webhook, groups: lista ?? { status: groups.status, text: groups.text, erro: groups.erro } });
    }

    if (op === 'enable_group_events') {
      const cur = (await evo(`/webhook/find/${INST}`)).json || {};
      const conf = cur.webhook || cur; // v2 aninha em .webhook, v1 é raiz
      const events = Array.from(new Set([...(conf.events || []), 'GROUP_PARTICIPANTS_UPDATE']));
      const url = conf.url || '';
      if (!url) return res.status(400).json({ error: 'webhook atual sem url', cur });
      // tenta o formato v2 e cai pro v1
      let r = await evo(`/webhook/set/${INST}`, { method: 'POST', body: JSON.stringify({ webhook: { enabled: true, url, byEvents: conf.byEvents ?? conf.webhook_by_events ?? false, base64: conf.base64 ?? false, events } }) });
      if (!r.ok) {
        r = await evo(`/webhook/set/${INST}`, { method: 'POST', body: JSON.stringify({ enabled: true, url, webhook_by_events: conf.webhook_by_events ?? false, events }) });
      }
      return res.status(200).json({ set: r.json ?? r, eventos_final: events });
    }

    return res.status(400).json({ error: 'op desconhecida' });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
