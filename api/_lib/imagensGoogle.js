// 🔎 IMAGENS "IGUAL O GOOGLE" — a leitura das fontes e a cascata (06/09/2026).
//
// Ordem do dono, no "Adicionar ao quadro dos sonhos": "o buscador precisa ser
// foda — está trazendo imagens aleatórias, precisa puxar do Google igual o
// Google". A rota antiga (extractGoogleShoppingImages) foi feita pra FOTO DE
// PRODUTO à venda: pergunta ao Google Shopping e devolve miniaturas de
// anúncio — pra "casa na praia" ou "viagem pra Grécia" isso é aleatório
// mesmo. Sonho se busca no GOOGLE IMAGENS.
//
// CASCATA (para na primeira com resultado):
//   1) SerpAPI  engine=google_images  (a mesma conta do Compare Aqui)
//   2) SearchAPI engine=google_images (reserva, mesma conta do Lens)
//   3) Google Shopping (SerpAPI) — último recurso, pra produto ainda achar
// Cada resultado sai com a imagem ORIGINAL (grande, é o que vai pro quadro)
// e a MINIATURA (leve, é o que a galeria mostra enquanto a pessoa escolhe).
//
// Este arquivo é só conta: recebe o `fetch` e as chaves por parâmetro, então
// roda no node sem rede — as respostas das APIs ficam cravadas nos testes.

export const FONTE_TIMEOUT_MS = 8000;
const MAXIMO = 24;

const ehUrlDeImagem = (u) => typeof u === 'string' && /^https?:\/\//i.test(u) && !/\.svg(\?|$)/i.test(u);

/** Tira o que não é URL http(s), repete ou é SVG; mantém a ordem; limita. */
export function limparResultados(lista) {
  const vistos = new Set();
  const saida = [];
  for (const r of lista || []) {
    // original SVG/inválida derruba o resultado inteiro (a miniatura raster
    // de um vetor não é a imagem que a pessoa viu)
    if (r?.original && !ehUrlDeImagem(r.original)) continue;
    const original = ehUrlDeImagem(r?.original) ? r.original : null;
    const miniatura = ehUrlDeImagem(r?.miniatura) ? r.miniatura : null;
    const url = original || miniatura;
    if (!url || vistos.has(url)) continue;
    vistos.add(url);
    saida.push({ original: url, miniatura: miniatura || url, titulo: String(r?.titulo || '').slice(0, 160), fonte: String(r?.fonte || '').slice(0, 80) });
    if (saida.length >= MAXIMO) break;
  }
  return saida;
}

/** SerpAPI google_images → `images_results[]` {original, thumbnail, title, source}. */
export function lerSerpApiImagens(json) {
  return (json?.images_results || []).map((r) => ({
    original: r?.original, miniatura: r?.thumbnail, titulo: r?.title, fonte: r?.source,
  }));
}

/** SearchAPI google_images → `images[]` {original: {link}, thumbnail, title, source: {name}}. */
export function lerSearchApiImagens(json) {
  return (json?.images || []).map((r) => ({
    original: r?.original?.link || r?.original, miniatura: r?.thumbnail, titulo: r?.title, fonte: r?.source?.name || r?.source,
  }));
}

/** SerpAPI google_shopping → miniaturas de anúncio (último recurso). */
export function lerSerpApiShopping(json) {
  const lista = [];
  for (const r of json?.shopping_results || []) {
    const foto = r?.thumbnail || r?.serpapi_thumbnail;
    if (foto) lista.push({ original: foto, miniatura: foto, titulo: r?.title, fonte: r?.source });
  }
  for (const r of json?.inline_images || []) lista.push({ original: r?.original || r?.thumbnail, miniatura: r?.thumbnail, titulo: r?.title, fonte: r?.source });
  return lista;
}

async function pedir(fetchFn, url) {
  const resp = await fetchFn(url, { signal: AbortSignal.timeout(FONTE_TIMEOUT_MS) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

/**
 * A cascata. `chaves` = { serpapi, searchapi }; `fetchFn` = fetch.
 * Devolve { resultados, fonte, trilha } — `trilha` conta o que cada fonte
 * respondeu, pra quem for depurar não precisar adivinhar.
 */
export async function buscarImagensGoogle(termo, { chaves = {}, fetchFn = fetch } = {}) {
  const q = encodeURIComponent(termo);
  const fontes = [
    chaves.serpapi && {
      nome: 'serpapi_google_images',
      url: `https://serpapi.com/search.json?engine=google_images&q=${q}&gl=br&hl=pt&api_key=${chaves.serpapi}`,
      ler: lerSerpApiImagens,
    },
    chaves.searchapi && {
      nome: 'searchapi_google_images',
      url: `https://www.searchapi.io/api/v1/search?engine=google_images&q=${q}&gl=br&hl=pt-br&api_key=${chaves.searchapi}`,
      ler: lerSearchApiImagens,
    },
    chaves.serpapi && {
      nome: 'serpapi_google_shopping',
      url: `https://serpapi.com/search.json?engine=google_shopping&q=${q}&location=Brazil&hl=pt&gl=br&api_key=${chaves.serpapi}`,
      ler: lerSerpApiShopping,
    },
  ].filter(Boolean);

  const trilha = [];
  if (!fontes.length) return { resultados: [], fonte: null, trilha: ['sem chave de busca configurada'] };

  for (const f of fontes) {
    try {
      const resultados = limparResultados(f.ler(await pedir(fetchFn, f.url)));
      trilha.push(`${f.nome}: ${resultados.length} imagens`);
      if (resultados.length) return { resultados, fonte: f.nome, trilha };
    } catch (e) {
      trilha.push(`${f.nome}: erro ${String(e?.message || e).slice(0, 80)}`);
    }
  }
  return { resultados: [], fonte: null, trilha };
}
