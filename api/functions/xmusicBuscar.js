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
// 🚧 A COTA: a busca custa 100 unidades das 10.000 diárias gratuitas (~100
// buscas/dia). Ela é protegida de DOIS jeitos diferentes, porque os dois
// caminhos desta rota têm riscos diferentes:
//   • ESTAÇÃO — é cache-first e LIMITADA POR CONSTRUÇÃO: são 4 vagas e cada
//     uma só gasta cota quando o cache de 12h vence. Não importa quem chame
//     nem quantas vezes: no máximo ~8 buscas/dia. Por isso NÃO exige crachá.
//   • BUSCA LIVRE — cada termo novo gasta cota, então passa pelo crachá de
//     sessão na MESMA convenção das outras rotas (exigirSessao: anota no log
//     e, com SESSAO_MODO=bloquear, recusa), e o resultado de cada termo fica
//     12h no cache, o que corta as repetições.
//
// 🔴 A LIÇÃO QUE CUSTOU UMA PUBLICAÇÃO (06/09/2026): a primeira versão exigia
// o crachá até pra estação, com recusa de verdade. Em produção o celular do
// dono não tem crachá (logou antes de ele existir) e as quatro estações
// caíram em "nada tocou aqui" — 401 em TODAS as chamadas, nos logs. Exigir
// mais do que o resto do sistema exige quebra o produto na mão de quem está
// logado. A proteção certa da estação é o cache, não o crachá.
//
// 📻 E AS ESTAÇÕES DA CASA NASCEM DAQUI TAMBÉM. Elas deixaram de ser link
// chumbado — que morre calado e vira o "botão só por ser" — e passaram a ser
// um TERMO DE BUSCA. O YouTube devolve o que está no ar HOJE e que toca
// embutido; nenhum ID que eu escreva pode apodrecer, porque não existe ID
// escrito. O resultado fica guardado em xmusic_cache e vale pra empresa
// inteira por 12h: são ~8 buscas por dia em vez de uma por navegador, senão a
// cota diária acabaria antes do almoço e ninguém teria música.
//
// GET ?q=termo            → { ok, itens: [{ id, titulo, canal, lista }] }
// GET ?estacao=foco       → { ok, itens } já cacheado pra equipe
// GET sem nada            → health { ok, chave: true|false }
import { exigirSessao } from '../_lib/sessao.js';

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

// os termos das vagas — é isto que substitui os IDs chumbados
const TERMOS = {
  foco: 'lofi hip hop radio beats to relax study to',
  calma: 'música relaxante para acalmar a mente piano',
  estudo: 'música para estudar concentração profunda',
  energia: 'música para treinar academia motivação workout',
};
const VALIDADE_MS = 12 * 60 * 60 * 1000;

async function cacheLer(id) {
  try {
    if (!SUPABASE_URL || !SR) return null;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/xmusic_cache?id=eq.${id}&select=valor,updated_at&limit=1`, {
      headers: { apikey: SR, Authorization: `Bearer ${SR}` },
      signal: AbortSignal.timeout(5000),
    });
    const j = await r.json().catch(() => []);
    const linha = Array.isArray(j) ? j[0] : null;
    if (!linha?.valor) return null;
    const idade = Date.now() - new Date(linha.updated_at || 0).getTime();
    return idade < VALIDADE_MS ? linha.valor : null;
  } catch { return null; }
}

async function cacheGravar(id, valor) {
  try {
    if (!SUPABASE_URL || !SR) return;
    await fetch(`${SUPABASE_URL}/rest/v1/xmusic_cache`, {
      method: 'POST',
      headers: {
        apikey: SR,
        Authorization: `Bearer ${SR}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ id, valor, updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* cache é conforto, não requisito */ }
}

async function buscar(termo, k) {
  const url = `${API}?part=snippet&type=video&maxResults=12`
    + '&videoEmbeddable=true&videoSyndicated=true&safeSearch=moderate'
    + `&q=${encodeURIComponent(termo)}&key=${encodeURIComponent(k)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.error?.errors?.[0]?.reason || `http_${r.status}`);
  return (j?.items || [])
    .map((it) => ({
      id: it?.id?.videoId || null,
      titulo: String(it?.snippet?.title || '').slice(0, 90),
      canal: String(it?.snippet?.channelTitle || '').slice(0, 50),
      lista: false,
    }))
    .filter((it) => it.id && it.titulo);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const termo = String(req.query?.q || '').trim().slice(0, 120);
    const k = await chave();

    const slot = String(req.query?.estacao || '').trim().toLowerCase();

    // health: diz se a chave já chegou, sem gastar nada da cota
    if (!termo && !slot) return res.status(200).json({ ok: true, chave: Boolean(k) });

    // 📻 ESTAÇÃO DA CASA: sem crachá — a proteção dela é o cache (ver o topo
    // do arquivo). Primeiro o resultado guardado pra equipe; só se estiver
    // velho é que se gasta cota, e isso acontece no máximo 2x por dia por vaga.
    if (slot) {
      if (!TERMOS[slot]) return res.status(200).json({ ok: false, error: 'estacao_desconhecida' });
      const guardado = await cacheLer(`estacao_${slot}`);
      if (guardado?.length) return res.status(200).json({ ok: true, itens: guardado, cache: true });
      if (!k) return res.status(200).json({ ok: false, error: 'sem_chave' });
      try {
        const itens = await buscar(TERMOS[slot], k);
        if (itens.length) await cacheGravar(`estacao_${slot}`, itens);
        return res.status(200).json({ ok: true, itens, cache: false });
      } catch (e) {
        return res.status(200).json({ ok: false, error: String(e?.message || e).slice(0, 60) });
      }
    }

    // 🔎 BUSCA LIVRE: crachá na convenção do resto do sistema (anota; recusa
    // só com SESSAO_MODO=bloquear) — e cache de 12h por termo, pra o mesmo
    // "deep house" digitado dez vezes gastar cota uma vez.
    const sessao = exigirSessao(req, null, 'xmusicBuscar');
    if (!sessao.liberado) return res.status(sessao.http || 401).json({ ok: false, error: 'sessao', motivo: sessao.motivo });

    const chaveTermo = `busca_${termo.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').slice(0, 80)}`;
    const guardado = await cacheLer(chaveTermo);
    if (guardado?.length) return res.status(200).json({ ok: true, itens: guardado, cache: true });

    if (!k) return res.status(200).json({ ok: false, error: 'sem_chave' });

    try {
      const itens = await buscar(termo, k);
      if (itens.length) await cacheGravar(chaveTermo, itens);
      return res.status(200).json({ ok: true, itens, cache: false });
    } catch (e) {
      return res.status(200).json({ ok: false, error: String(e?.message || e).slice(0, 60) });
    }
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e).slice(0, 160) });
  }
}
