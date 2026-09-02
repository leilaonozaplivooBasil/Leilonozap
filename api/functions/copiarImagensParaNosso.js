// copiarImagensParaNosso — traz para o NOSSO servidor uma foto que está hospedada
// em site de terceiro, e devolve o endereço novo.
//
// ══════════════════════════════════════════════════════════════════════════════
// 🔴 POR QUE ESTA ROTA EXISTE (02/09/2026) — O LAVAJATO NA TORNEIRA
// ══════════════════════════════════════════════════════════════════════════════
// O dono mandou o print: a "Torneira Gourmet" aparecia na loja com foto de um
// LAVAJATO. E o "TDS medidor pureza água", ao lado, mostrava o MESMO lavajato.
// Dois produtos diferentes, a mesma imagem errada — o que só acontece quando
// quem serve a imagem é um terceiro que trocou o conteúdo.
//
// A primeira foto dos dois estava em `i.zst.com.br`, um comparador de preços.
// Retrato daquele dia: 61 fotos da loja hospedadas fora, sendo a CAPA de 25
// produtos. Todas podiam virar outra coisa a qualquer momento.
//
// De onde vinham: `extractMLImages` e `extractGoogleShoppingImages` gravavam o
// endereço de fora direto em `image_urls`. Nada copiava a imagem para cá — e não
// dava para copiar do navegador, porque buscar imagem de outro domínio esbarra
// em CORS. Por isso a cópia é aqui, no servidor.
//
// ⚠️ ESTA ROTA NÃO É USADA PARA CONSERTAR AS 25 ANTIGAS. Copiar o que aquele
// endereço serve HOJE congelaria o lavajato para sempre. Foto velha errada
// precisa de olho humano; esta rota serve para o que entra de agora em diante.
import { exigirSessao } from '../_lib/sessao.js';
import { urlSeguraParaBuscar, extensaoDoTipo, nomeDoArquivo } from '../_lib/imagemExterna.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'public-assets';

const MAX_BYTES = 8 * 1024 * 1024;   // 8 MB por foto
const MAX_FOTOS = 8;                 // por chamada
const TIMEOUT_MS = 15000;

/** Busca a imagem na origem, com teto de tamanho e de tempo. */
async function buscarImagem(url) {
  const seguro = urlSeguraParaBuscar(url);
  if (!seguro.ok) return { ok: false, motivo: seguro.motivo };

  const corta = new AbortController();
  const t = setTimeout(() => corta.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: corta.signal,
      redirect: 'follow',
      // Alguns CDNs recusam requisição sem navegador declarado.
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeilaoNoZap/1.0)', Accept: 'image/*' },
    });
    if (!r.ok) return { ok: false, motivo: `origem_${r.status}` };

    const tipo = r.headers.get('content-type') || '';
    const ext = extensaoDoTipo(tipo);
    // Sem isto, uma página de erro em HTML viraria "foto" do produto.
    if (!ext) return { ok: false, motivo: 'nao_e_imagem' };

    const declarado = Number(r.headers.get('content-length') || 0);
    if (declarado > MAX_BYTES) return { ok: false, motivo: 'muito_grande' };

    const bytes = Buffer.from(await r.arrayBuffer());
    if (!bytes.length) return { ok: false, motivo: 'vazia' };
    // Confere o tamanho DE VERDADE: content-length pode mentir ou não vir.
    if (bytes.length > MAX_BYTES) return { ok: false, motivo: 'muito_grande' };

    return { ok: true, bytes, tipo, ext };
  } catch (e) {
    return { ok: false, motivo: e?.name === 'AbortError' ? 'demorou_demais' : 'falha_na_origem' };
  } finally {
    clearTimeout(t);
  }
}

/** Sobe para o nosso bucket e devolve o endereço público. */
async function subir(caminho, bytes, tipo) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${caminho}`, {
    method: 'POST',
    headers: {
      apikey: SR, Authorization: `Bearer ${SR}`,
      'Content-Type': tipo, 'x-upsert': 'true', 'Cache-Control': '31536000',
    },
    body: bytes,
  });
  if (!r.ok) return { ok: false, motivo: `upload_${r.status}` };
  return { ok: true, url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${caminho}` };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || '').trim();
    const _ses = exigirSessao(req, actorId, 'copiarImagensParaNosso');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const urls = Array.isArray(body?.urls) ? body.urls.slice(0, MAX_FOTOS) : [];
    const descricao = String(body?.descricao || 'produto');
    if (!urls.length) return res.status(400).json({ success: false, error: 'urls obrigatório', fotos: [] });

    const fotos = [];
    for (let i = 0; i < urls.length; i++) {
      const original = String(urls[i] || '').trim();
      const img = await buscarImagem(original);
      if (!img.ok) { fotos.push({ ok: false, original, motivo: img.motivo }); continue; }
      const enviada = await subir(`uploads/${nomeDoArquivo(descricao, i, img.ext)}`, img.bytes, img.tipo);
      fotos.push(enviada.ok
        ? { ok: true, original, url: enviada.url }
        : { ok: false, original, motivo: enviada.motivo });
    }

    // Devolve o resultado FOTO A FOTO em vez de um "deu certo" geral. A tela
    // precisa saber quais não vieram para avisar quem está cadastrando — se
    // guardasse o endereço de fora "porque a cópia falhou", o bug voltaria.
    return res.status(200).json({
      success: true,
      fotos,
      copiadas: fotos.filter((f) => f.ok).length,
      falharam: fotos.filter((f) => !f.ok).length,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e), fotos: [] });
  }
}
