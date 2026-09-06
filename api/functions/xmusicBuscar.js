// 🔎 xmusicBuscar — O BUSCADOR DO X-MUSIC.
//
// Ordem do dono: "colocar um buscador direto, que todo vídeo toca". Ele
// resolve de vez o problema que apareceu na tela: link que eu chutei e não
// abria. Aqui ninguém chuta — a pessoa digita "lofi", "treino", "sax house"
// e escolhe entre resultados REAIS do YouTube.
//
// 🎯 O PARÂMETRO QUE FAZ TODA A DIFERENÇA: videoEmbeddable=true (mais
// videoSyndicated=true). O YouTube só devolve vídeos que PODEM ser tocados
// embutidos fora do site dele. É a diferença entre "existe" e "toca" — a
// mesma diferença que derrubou as estações chumbadas, agora resolvida na
// origem, pelo próprio YouTube, e não por chute meu.
//
// 🔐 A CHAVE NUNCA VAI PRO NAVEGADOR: fica no cofre (app_segredos.
// youtube_api_key) ou na variável de ambiente. O navegador chama esta rota,
// e só esta rota fala com o Google.
//
// 🚧 E A COTA É PROTEGIDA: a busca custa 100 unidades das 10.000 diárias
// gratuitas (~100 buscas/dia). Rota aberta viraria torneira pra qualquer um
// esvaziar a cota do dono, então aqui o crachá de sessão é EXIGIDO de
// verdade — sem a etapa "só anota no log" que outras rotas usam, porque
// aqui o prejuízo de deixar passar é imediato.
//
// GET ?q=termo            → { ok, itens: [{ id, titulo, canal, lista }] }
// GET sem q               → health { ok, chave: true|false }
import { conferirSessao } from '../_lib/sessao.js';

const API = 'https://www.googleapis.com/youtube/v3/search';
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

async function chave() {
  return process.env.YOUTUBE_API_KEY || segredo('youtube_api_key');
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const termo = String(req.query?.q || '').trim().slice(0, 120);
    const k = await chave();

    // health: diz se a chave já chegou, sem gastar nada da cota
    if (!termo) return res.status(200).json({ ok: true, chave: Boolean(k) });

    const sessao = conferirSessao(req);
    if (!sessao.ok) return res.status(401).json({ ok: false, error: 'sessao', motivo: sessao.motivo });

    if (!k) return res.status(200).json({ ok: false, error: 'sem_chave' });

    const url = `${API}?part=snippet&type=video&maxResults=12`
      + '&videoEmbeddable=true&videoSyndicated=true&safeSearch=moderate'
      + `&q=${encodeURIComponent(termo)}&key=${encodeURIComponent(k)}`;

    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      const motivo = j?.error?.errors?.[0]?.reason || `http_${r.status}`;
      return res.status(200).json({ ok: false, error: motivo });
    }

    const itens = (j?.items || [])
      .map((it) => ({
        id: it?.id?.videoId || null,
        titulo: String(it?.snippet?.title || '').slice(0, 90),
        canal: String(it?.snippet?.channelTitle || '').slice(0, 50),
        capa: it?.snippet?.thumbnails?.default?.url || null,
        lista: false,
      }))
      .filter((it) => it.id && it.titulo);

    return res.status(200).json({ ok: true, itens });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e).slice(0, 160) });
  }
}
