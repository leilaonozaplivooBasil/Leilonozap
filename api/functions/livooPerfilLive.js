// livooPerfilLive — detecta AUTOMATICAMENTE se o perfil da Leilão NoZap está ao vivo na Livoo Live.
//
// Por que ler as páginas públicas em vez de bater no Supabase da Livoo: o banco da Livoo
// (fdtaovyjtfspovgrqfkl) é de outro produto e não expõe credencial pra cá. As páginas são
// `force-dynamic`/`revalidate = 0`, então o SSR já traz os streams no payload com o status.
// Zero credencial, zero acoplamento — e se a Livoo mudar o HTML, o pior caso é mostrar offline.
//
// Duas fontes, porque cada uma cobre um buraco da outra:
//   1) /lives  → lista TODA live no ar (sem filtro). Pega a live recém-aberta, que ainda
//                não tem thumbnail e por isso nem aparece na página do perfil.
//   2) /vendedor/leilaonozap → confirma pelo próprio perfil (status === 'live').
//
// GET /api/functions/livooPerfilLive → { live, url, titulo, thumb, fonte, checked_at }

const PERFIL_URL = process.env.LIVOO_PERFIL_URL || 'https://livoolive.com.br/vendedor/leilaonozap';
const LIVES_URL = 'https://livoolive.com.br/lives';
const PERFIL_PUBLICO = 'https://livoolive.com.br/perfil';
// Nome do perfil na Livoo — é o que aparece no payload das lives (business_name/full_name).
const NOME_PERFIL = process.env.LIVOO_PERFIL_NOME || 'LEILAO NO ZAP';

// Cache em memória: as páginas são pesadas e o front faz polling. 20s pega a live logo
// que ela abre e evita martelar a Livoo a cada visitante.
let cache = { at: 0, payload: null };
const TTL_MS = 20_000;

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

async function baixar(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'LeilaoNoZap/1.0 (+https://leilaonozap.net)' },
    });
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    // O payload RSC vem com as aspas escapadas (\"status\":\"live\"); desescapar aqui
    // deixa todo o parsing abaixo trivial.
    return (await r.text()).replace(/\\"/g, '"');
  } finally { clearTimeout(t); }
}

function campo(trecho, nome) {
  const m = new RegExp(`"${nome}":"([^"]*)"`).exec(trecho);
  return m ? m[1] : null;
}

// Objetos de stream do payload: cada um começa em {"id":"<uuid>".
function objetosDeStream(flat, marcador) {
  const i = flat.indexOf(marcador);
  if (i < 0) return [];
  return flat.slice(i, i + 200000).split('{"id":"').slice(1).map((o) => o.slice(0, 2000));
}

// Fonte 1 — a live está na lista geral e o nome do perfil aparece junto dela.
async function viaListaDeLives() {
  const flat = await baixar(LIVES_URL);
  const objetos = objetosDeStream(flat, '"liveStreams"');
  const nosso = objetos.find(
    (o) => campo(o, 'status') === 'live' && semAcento(o).includes(semAcento(NOME_PERFIL)),
  );
  if (!nosso) return null;
  return { titulo: campo(nosso, 'title'), thumb: campo(nosso, 'thumbnail_url'), fonte: 'lives' };
}

// Fonte 2 — o próprio perfil marca um stream como 'live'.
async function viaPerfil() {
  const flat = await baixar(PERFIL_URL);
  const nosso = objetosDeStream(flat, '"streams":[').find((o) => campo(o, 'status') === 'live');
  if (!nosso) return null;
  return { titulo: campo(nosso, 'title'), thumb: campo(nosso, 'thumbnail_url'), fonte: 'perfil' };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const agora = Date.now();
  if (cache.payload && agora - cache.at < TTL_MS) {
    return res.status(200).json({ ...cache.payload, cached: true });
  }

  const base = { url: PERFIL_PUBLICO, perfil_url: PERFIL_URL, checked_at: new Date().toISOString() };
  try {
    // As duas fontes em paralelo: basta uma acusar a live. Uma que falhe (rede, HTML
    // mudou) não invalida a outra.
    const [lives, perfil] = await Promise.all([
      viaListaDeLives().catch(() => null),
      viaPerfil().catch(() => null),
    ]);
    const achou = lives || perfil;

    const payload = achou
      ? { ...base, live: true, titulo: achou.titulo || null, thumb: achou.thumb || null, fonte: achou.fonte }
      : { ...base, live: false, titulo: null, thumb: null, fonte: null };

    cache = { at: agora, payload };
    return res.status(200).json(payload);
  } catch (e) {
    // Falha total não pode derrubar a página do Rank: devolve offline com o motivo.
    return res.status(200).json({ ...base, live: false, titulo: null, thumb: null, error: String(e?.message || e).slice(0, 120) });
  }
}
