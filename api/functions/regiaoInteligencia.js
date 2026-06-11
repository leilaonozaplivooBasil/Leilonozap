// regiaoInteligencia — dados da região a partir do CEP: habitantes (IBGE), potencial de venda
// (estimativa) e afiliações na região (interno). Robusto: timeouts + cache + fallback (nunca quebra).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PENETRACAO = 0.02;   // % da população que é cliente potencial
const TICKET = 50;          // ticket médio estimado (R$)
const CACHE_DIAS = 30;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
async function getJSON(url, ms) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(ms || 7000), headers: { Accept: 'application/json' } });
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const cep = String(body?.cep || '').replace(/\D/g, '');
    let cidade = String(body?.cidade || '').trim();
    let uf = String(body?.uf || '').trim();
    let ibge = String(body?.ibge || '').trim();
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    // 1) CEP → cidade/uf/ibge (ViaCEP)
    if (cep.length === 8 && (!cidade || !ibge)) {
      const v = await getJSON(`https://viacep.com.br/ws/${cep}/json/`, 6000);
      if (v && !v.erro) { cidade = v.localidade || cidade; uf = v.uf || uf; ibge = v.ibge || ibge; }
    }
    if (!cidade && !ibge) return res.status(200).json({ success: true, available: false, motivo: 'Cadastre seu CEP/endereço pra ver a inteligência da região.' });

    // 2) habitantes — cache primeiro, depois IBGE
    let habitantes = null;
    if (ibge) {
      const cached = await (await sb(`regiao_cache?select=habitantes,updated_at&ibge_code=eq.${encodeURIComponent(ibge)}&limit=1`)).json();
      const c = Array.isArray(cached) ? cached[0] : null;
      const fresca = c && (Date.now() - new Date(c.updated_at).getTime()) < CACHE_DIAS * 864e5;
      if (fresca && c.habitantes) habitantes = Number(c.habitantes);
      if (habitantes == null) {
        const j = await getJSON(`https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[${ibge}]`, 8000);
        try {
          const serie = j[0].resultados[0].series[0].serie;
          const vals = Object.values(serie).map(Number).filter((n) => n > 0);
          if (vals.length) habitantes = vals[vals.length - 1];
        } catch { /* mantém null */ }
        if (habitantes != null) {
          await sb('regiao_cache', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ ibge_code: ibge, cep: cep || null, cidade, uf, habitantes, updated_at: new Date().toISOString() }) });
        } else if (c?.habitantes) {
          habitantes = Number(c.habitantes); // fallback: cache mesmo velho
        }
      }
    }

    // 3) afiliações na região (interno, sempre ao vivo)
    let afiliacoes = 0;
    if (cidade) {
      const r = await sb(`app_users?select=id&address_city=ilike.${encodeURIComponent(cidade)}`, { method: 'GET', headers: { Prefer: 'count=exact' } });
      const cr = r.headers.get('content-range') || '';
      const m = cr.match(/\/(\d+)/);
      afiliacoes = m ? Number(m[1]) : 0;
    }

    const potencial = habitantes ? Math.round(habitantes * PENETRACAO * TICKET) : null;

    return res.status(200).json({
      success: true, available: true,
      cidade, uf, ibge,
      habitantes, afiliacoes,
      potencial_venda: potencial,
      premissas: { penetracao_pct: PENETRACAO * 100, ticket: TICKET },
    });
  } catch (e) {
    return res.status(200).json({ success: false, available: false, error: 'Erro', details: String(e?.message || e) });
  }
}
