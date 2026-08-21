// marketSearch — busca de preço de mercado compartilhada (Leilão NoZap).
// Fonte única usada por comparaiPrices (modal Comparaí) E calculateProductPricing (painel).
// Cascata (20/08/2026, PONTO 93 — INDEPENDENTE DO BASE44):
//   IMAGEM: SerpAPI Lens exato -> SerpAPI Lens visual -> SearchAPI Lens (reserva)
//           -> ponte Base44 (muleta, só enquanto faltar SERPAPI_KEY aqui)
//   TEXTO : Google Shopping (SearchAPI) -> SerpAPI Shopping -> Zoom
// Primeira com resultado relevante vence. Com a SERPAPI_KEY publicada na Vercel,
// nenhuma chamada sai pro Base44.
// Retorna a MÉDIA do mercado (é a referência do Heloim: venda = média - 20%).

import { chamarRuntimeBase44 } from './base44Runtime.js';
// 🔒 FASE 1, item 5 (21/08/2026) — REGRA 6. Ver o bloco em searchMarket().
import { conferirUrl } from './urlSegura.js';

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SEARCHAPI_KEY = process.env.SEARCHAPI_KEY;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// 🔴 CAUSA-RAIZ DO "TRAVA, DO NADA VOLTA" (19/08/2026) — nenhuma das 4 fontes
// abaixo tinha timeout, ao contrário de TODA outra chamada externa deste
// projeto (GenerateImage, InvokeLLM, waProxy, etc. — todas usam
// AbortSignal.timeout). Se uma fonte pendurasse a conexão (comum em scraping
// do Zoom ou instabilidade de API de terceiro), a busca inteira (elas rodam
// em sequência) ficava presa até a função serverless ser derrubada pelo
// limite da plataforma — o spinner "Analisando preços..." congelava e só
// "voltava" quando esse limite batia. Agora cada fonte tem um teto próprio.
const FONTE_TIMEOUT_MS = 6000;

// Limpa o título do catálogo pra virar uma query boa. Desgruda "Pequeno500ml" -> "Pequeno 500ml"
// (títulos vêm colados e a busca não achava nada), tira ruído e fica com até 5 palavras.
export function cleanTitle(title) {
  if (!title) return '';
  const clean = String(title)
    .replace(/leil[aã]o\s*(nozap|no\s*zap)?/gi, '')
    .replace(/\b(novo|usado|semi[-\s]?novo|original|lacrado|garantia|frete\s*gr[aá]tis)\b/gi, '')
    .replace(/\b(arremate|devolu[çc][aã]o|promo[çc][aã]o|kit|combo|un|und|unidade)\b/gi, '')
    .replace(/\b(110v|220v|bivolt)\b/gi, '')
    // ⚠️ PONTO 92 — era `([a-zA-ZÀ-ÿ])(\d)`, que separava QUALQUER letra de
    // dígito e destruía código de modelo curto: "Bike Harley M4" virava
    // "M 4", o "M" caía por ter 1 caractere e o "4" por ser dígito solto —
    // o modelo sumia inteiro. Exigindo 3+ letras, ainda desgruda o caso que
    // motivou a regra ("Pequeno500ml" -> "Pequeno 500ml") sem matar "M4"/"T2".
    .replace(/([a-zA-ZÀ-ÿ]{3,})(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-ZÀ-ÿ]{3,})/g, '$1 $2')
    .replace(/[^\wÀ-ÿ\s]/g, ' ')
    // 🎯 PONTO 92 (20/08/2026) — re-une dimensões que os replaces acima quebram:
    // "120x60" virava "120x 60", e o "60" era descartado logo abaixo, sobrando
    // "120x" (medida sem sentido). Agora volta a ser um token só.
    .replace(/(\d+)\s*[xX]\s*(\d+)/g, '$1x$2')
    .replace(/\s+/g, ' ')
    .trim();

  // 🔴 PONTO 92 — CAUSA-RAIZ COMPROVADA NA TELA (diagnóstico do dono,
  // 20/08/2026): o filtro era `!/^\d+$/` — jogava fora QUALQUER palavra só de
  // dígitos. Resultado real: "CAIXA DE SOM PCX 15000" era buscado como
  // "CAIXA DE SOM PCX", SEM o modelo. E aí o validador ainda EXIGIA que o
  // resultado contivesse "15000". Buscávamos sem o modelo e cobrávamos o
  // modelo — contradição que zerava tudo: o Zoom devolveu 28 caixas de som
  // genéricas e 0 passaram ("28 brutos, 0 relevantes" no print do dono).
  // O número do modelo é o sinal MAIS forte de identidade; agora só some
  // dígito solto (1 caractere), que é ruído de verdade.
  const words = clean.split(' ').filter((w) => w.length > 1 && !/^\d$/.test(w));

  // Garante que o modelo/capacidade sobreviva ao corte de tamanho: reserva
  // espaço pra até 2 tokens com dígito, em vez de deixar o slice cegamente
  // cortar justo o que identifica o produto (o número costuma vir no fim).
  const comDigito = words.filter((w) => /\d/.test(w)).slice(0, 2);
  const semDigito = words.filter((w) => !/\d/.test(w)).slice(0, 4);
  const manter = new Set([...semDigito, ...comDigito]);
  return words.filter((w) => manter.has(w)).slice(0, 6).join(' ');
}

export function isValidPrice(price) {
  return !(!price || price < 5 || price > 500000);
}

// 🎯 PONTO 88 (19/08/2026) — casamento de palavra tolerante a acento e a
// plural/singular ("fone" ≠ "fones" antes, agora casa). Antes a comparação
// era `String.includes()` cru — "não" no catálogo nunca batia com "nao" que
// alguma loja publicou, e isso sozinho já derrubava produtos que deveriam
// ter sido encontrados. Causa-raiz apontada pelo dono: "só o nome, de fato,
// pode causar isso" — confirmado.
function normalizarTexto(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
function singularAproximado(w) {
  return w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w;
}

// 🎯 PONTO 89 (20/08/2026) — "inadmissível vim produtos aleatórios". Causa-raiz
// confirmada: título com poucas palavras genéricas ("caixa de som") batia com
// QUALQUER caixa de som do mercado, de marca/potência diferente. O sinal mais
// forte de identidade de produto é o NÚMERO (capacidade, potência, voltagem,
// tamanho, modelo — "500", "60", "18", "256"): dois produtos "parecidos"
// quase nunca compartilham o mesmo número. IMPORTANTE: extrai do título
// ORIGINAL (antes do cleanTitle), não do já limpo — cleanTitle corta pra 5
// palavras E descarta número solto sem letra colada (ex.: "5" em "5 Litros"
// desaparece, "40W" nem sobrevive ao corte), o que apagava esse sinal antes
// mesmo dele ser usado. Compara número INTEIRO (não substring — "5".includes
// bateria errado dentro de "500"), por isso usa Set de tokens, não .includes().
function extrairNumeros(texto) {
  return new Set((String(texto || '').match(/\d+/g) || []).filter((n) => n.length <= 6));
}

async function fetchZoom(query) {
  const url = `https://www.zoom.com.br/search?q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' }, signal: AbortSignal.timeout(FONTE_TIMEOUT_MS) });
  if (!resp.ok) throw new Error(`Zoom HTTP ${resp.status}`);
  const html = await resp.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Zoom: __NEXT_DATA__ não encontrado');
  const json = JSON.parse(m[1]);
  const hits = [];
  (function walk(o, depth) {
    if (!o || depth > 12 || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach((x) => walk(x, depth + 1)); return; }
    if ((o.name || o.title) && typeof o.price === 'number' && o.price > 3 && String(o.name || o.title).length > 8) {
      hits.push({
        store: o.merchantName || (o.bestOffer && o.bestOffer.merchantName) || 'Loja',
        productNameFound: o.name || o.title,
        price: o.price,
        url: o.url ? (o.url.startsWith('http') ? o.url : `https://www.zoom.com.br${o.url}`) : '#',
        image: o.image || '',
        matchLevel: 'texto',
      });
    }
    Object.keys(o).forEach((k) => walk(o[k], depth + 1));
  })(json, 0);
  const seen = new Set();
  return hits.filter((h) => {
    const k = `${(h.store || '').toLowerCase()}|${Math.round(h.price * 100)}|${String(h.productNameFound).toLowerCase().slice(0, 22)}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
}

// ---- BUSCA POR IMAGEM VIA SERPAPI (INDEPENDENTE: nada de Base44) ----
// 🟢 PONTO 93 (20/08/2026) — pedido do dono: "eu não tenho mais nada a ver com
// o Base44, tem que ser independente, está tudo na Vercel e no Supabase".
// Ele confirmou que TEM a chave da SerpAPI em mãos. A SerpAPI faz exatamente o
// fluxo manual dele: engine=google_lens com type=exact_matches é a MESMA aba
// "Correspondências exatas" do Google. Então, com a SERPAPI_KEY publicada aqui
// na Vercel, este caminho substitui de uma vez:
//   - a ponte pro Base44 (que só existia pra emprestar essa credencial), e
//   - o SearchAPI (que está com a cota do mês esgotada).
// Enquanto a chave não estiver publicada, estas fontes simplesmente não entram
// na cascata e o diagnóstico da tela diz isso com todas as letras.
async function fetchSerpApiLensExato(imageUrl) {
  const u = `https://serpapi.com/search.json?engine=google_lens&type=exact_matches&url=${encodeURIComponent(imageUrl)}&hl=pt&country=br&api_key=${SERPAPI_KEY}`;
  const resp = await fetch(u, { signal: AbortSignal.timeout(FONTE_TIMEOUT_MS) });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`SerpAPI Lens exato HTTP ${resp.status}`);
  if (data?.error) throw new Error(`SerpAPI Lens exato: ${String(data.error).slice(0, 90)}`);
  // Sem filtro de preço: correspondência exata responde IDENTIDADE, não preço
  // (mesma razão do PONTO 91). Quem tiver preço entra na média; quem não tiver
  // continua valendo como prova de que é o mesmo produto.
  return (data.exact_matches || []).map((m) => ({
    store: m.source || 'Loja',
    productNameFound: m.title || '',
    price: Number(m.extracted_price) || Number(m.price?.extracted_value) || 0,
    url: m.link || '#',
    image: m.thumbnail || '',
    storeIcon: m.source_icon || '',
    matchLevel: 'exata',
  }));
}

async function fetchSerpApiLensVisual(imageUrl) {
  const u = `https://serpapi.com/search.json?engine=google_lens&type=visual_matches&url=${encodeURIComponent(imageUrl)}&hl=pt&country=br&api_key=${SERPAPI_KEY}`;
  const resp = await fetch(u, { signal: AbortSignal.timeout(FONTE_TIMEOUT_MS) });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`SerpAPI Lens visual HTTP ${resp.status}`);
  if (data?.error) throw new Error(`SerpAPI Lens visual: ${String(data.error).slice(0, 90)}`);
  return (data.visual_matches || []).map((m) => ({
    store: m.source || 'Loja',
    productNameFound: m.title || '',
    price: Number(m.price?.extracted_value) || Number(m.extracted_price) || 0,
    url: m.link || '#',
    image: m.thumbnail || '',
    storeIcon: m.source_icon || '',
    matchLevel: 'visual',
  })).filter((r) => r.price > 0);
}

async function fetchSerpApi(query) {
  const u = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&location=Brazil&hl=pt&gl=br&api_key=${SERPAPI_KEY}`;
  const resp = await fetch(u, { signal: AbortSignal.timeout(FONTE_TIMEOUT_MS) });
  if (!resp.ok) throw new Error(`SerpAPI HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data.shopping_results) return [];
  return data.shopping_results.slice(0, 15).map((r) => ({
    store: r.source || 'Loja',
    productNameFound: r.title || '',
    price: r.extracted_price || parseFloat(String(r.price || '').replace(/[^\d,]/g, '').replace(',', '.')),
    url: r.product_link || r.link || '#',
    image: r.thumbnail || '',
    storeIcon: r.source_icon || '',
    matchLevel: 'texto',
  }));
}

// ---- BUSCA POR IMAGEM (Google Lens via SearchAPI) — CORRESPONDÊNCIA EXATA primeiro ----
// 🎯 PONTO 90 (20/08/2026) — dono mostrou o fluxo manual que "nunca erra": botão
// direito na foto > "Pesquisar imagem com o Google Lens" > aba "Correspondências
// exatas" do próprio Google — só produto IDÊNTICO, curado pelo Google, não
// "parecido". Confirmado na documentação do SearchAPI: o parâmetro search_type
// aceita 'exact_matches' — é literalmente a mesma aba, pela mesma API que já
// usamos. O código usava search_type=all (o padrão, que mistura exato com
// visualmente similar) — é essa mistura que trazia produto errado. Agora tenta
// exact_matches PRIMEIRO (confiança máxima); só cai pro 'all' (visual_matches)
// se a busca exata não trouxer nada — e mesmo esse fallback continua passando
// pela trava de nome+número (relevantes()), não é bypass.
// 🔴 PONTO 91 (20/08/2026) — CAUSA-RAIZ #2 DO "COMPARAÇÃO INDISPONÍVEL":
// esta função terminava com `.filter((r) => r.price > 0)`. Correspondência EXATA
// é uma resposta de IDENTIDADE ("é a mesma imagem"), não de preço — na aba
// "Correspondências exatas" do print do dono, dos 6 anúncios do PCX15000 só UM
// exibia preço. O filtro jogava fora 5 de 6 provas ANTES de qualquer validação,
// e o log ainda chamava o número já filtrado de "brutos", tornando impossível
// distinguir "o Lens não achou" de "o Lens achou 6 e nós matamos 6".
// Agora devolve TODOS os exatos; quem tem preço entra na média, quem não tem
// continua valendo como prova visual de que o produto é o mesmo.
async function fetchGoogleLensExato(imageUrl) {
  const u = `https://www.searchapi.io/api/v1/search?engine=google_lens&search_type=exact_matches&url=${encodeURIComponent(imageUrl)}&gl=br&hl=pt-br&api_key=${SEARCHAPI_KEY}`;
  const resp = await fetch(u, { signal: AbortSignal.timeout(FONTE_TIMEOUT_MS) });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.error) throw new Error(`Lens exato: ${data?.error || resp.status}`);
  const em = data.exact_matches || [];
  return em.map((m) => ({
    store: m.source || m.source_name || 'Loja',
    productNameFound: m.title || '',
    price: Number(m.extracted_price) || Number(m.price?.extracted_value) || 0,
    url: m.link || '#',
    image: m.thumbnail || '',
    storeIcon: m.source_icon || '',
    matchLevel: 'exata',
  }));
}

async function fetchGoogleLensSimilar(imageUrl) {
  const u = `https://www.searchapi.io/api/v1/search?engine=google_lens&search_type=all&url=${encodeURIComponent(imageUrl)}&gl=br&hl=pt-br&api_key=${SEARCHAPI_KEY}`;
  const resp = await fetch(u, { signal: AbortSignal.timeout(FONTE_TIMEOUT_MS) });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.error) throw new Error(`Lens: ${data?.error || resp.status}`);
  const vm = data.visual_matches || [];
  return vm.map((m) => ({
    store: m.source || m.source_name || 'Loja',
    productNameFound: m.title || '',
    price: Number(m.price?.extracted_value) || Number(m.extracted_price) || 0,
    url: m.link || '#',
    image: m.thumbnail || '',
    storeIcon: m.source_icon || '',
    matchLevel: 'visual',
  })).filter((r) => r.price > 0);
}

// 🔑 PONTO 91 — CAUSA-RAIZ #1: as duas funções acima dependem de SEARCHAPI_KEY,
// e o PRÓPRIO REPOSITÓRIO documenta que essa chave está com a cota esgotada
// (ver api/functions/buscarFotosPorImagem.js:12-16). A SERPAPI_KEY, que está
// válida e com saldo, vive no cofre do Base44 e NÃO é visível no process.env da
// Vercel. Por isso a busca de fotos do admin FUNCIONA e o CompareAQUI NÃO: o
// admin usa a ponte servidor→servidor pro runtime Base44, e o CompareAQUI era o
// único consumidor de Lens do projeto sem essa ponte. Agora tem.
//
// ⚠️ Compatibilidade: a função Deno hoje publicada devolve só URLs de imagem
// ({images:[]}). A versão com preço/loja/título ({matches:[]}) está no repo em
// base44/functions/buscarFotosPorImagem/entry.ts e precisa ser PUBLICADA no
// painel do Base44 pra esta fonte passar a render preço. Enquanto não for, esta
// fonte falha com uma mensagem explícita (aparece no diagnóstico do modal) em
// vez de morrer calada.
const PONTE_TIMEOUT_MS = 15000;
async function fetchLensPonteBase44(imageUrl) {
  const json = await chamarRuntimeBase44('buscarFotosPorImagem', { imageUrl, full: true }, PONTE_TIMEOUT_MS);
  const matches = Array.isArray(json?.matches) ? json.matches : [];
  if (!matches.length) {
    const fotos = Array.isArray(json?.images) ? json.images.length : 0;
    if (fotos > 0) {
      throw new Error(`ponte devolveu ${fotos} fotos sem preço — publique a versão nova de buscarFotosPorImagem no Base44`);
    }
    throw new Error(`ponte sem resultado: ${String(json?.error || json?.motivo || 'desconhecido').slice(0, 70)}`);
  }
  return matches.map((m) => ({
    store: m.source || m.store || 'Loja',
    productNameFound: m.title || m.productNameFound || '',
    price: Number(m.extracted_price) || Number(m.price?.extracted_value) || Number(m.price) || 0,
    url: m.link || m.url || '#',
    image: m.thumbnail || m.image || '',
    storeIcon: m.source_icon || '',
    matchLevel: 'visual',
  }));
}

async function fetchSearchApi(query) {
  const u = `https://www.searchapi.io/api/v1/search?engine=google_shopping&q=${encodeURIComponent(query)}&gl=br&hl=pt-br&location=Brazil&api_key=${SEARCHAPI_KEY}`;
  const resp = await fetch(u, { signal: AbortSignal.timeout(FONTE_TIMEOUT_MS) });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.error) throw new Error(`SearchAPI: ${data?.error || resp.status}`);
  const results = data.shopping_results || [];
  return results.slice(0, 20).map((r) => ({
    store: r.seller || r.source || 'Loja',
    productNameFound: r.title || '',
    price: Number(r.extracted_price) || parseFloat(String(r.price || '').replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')),
    url: r.product_link || r.link || '#',
    image: r.thumbnail || '',
    storeIcon: r.source_icon || '',
    matchLevel: 'texto',
  })).filter((r) => r.price > 0);
}

// searchMarket(title, imageUrl) — roda a cascata e devolve a MÉDIA + resultados.
// PRINCIPAL = busca por IMAGEM (Google Lens, pela URL da foto do produto): acha o produto exato.
// Texto (nome) é só fallback quando não há imagem ou o Lens não trouxe nada.
// { found, source, avg, min, max, count, results:[{store,productNameFound,price,url,image}] }
export async function searchMarket(title, imageUrl) {
  // ══════════════════════════════════════════════════════════════════════════
  // 🔒 PORTEIRO DA FOTO — FASE 1, item 5 (21/08/2026). REGRA 6 do dono.
  // ══════════════════════════════════════════════════════════════════════════
  // A ARQUITETURA DA BUSCA VISUAL NÃO MUDOU. A cascata continua exatamente a
  // mesma — Lens exato → Lens visual → Shopping por texto —, com os mesmos
  // validadores e a mesma regra de ouro. O que entrou foi UMA conferência na
  // porta: se a URL da foto não for um endereço público de verdade, a busca
  // POR IMAGEM é pulada e a cascata segue pelo TEXTO, como já faz quando o
  // produto não tem foto cadastrada. Nada é derrubado; no pior caso o Comparai
  // responde com o caminho de texto.
  //
  // Por que importa mesmo o servidor não buscando a URL: quem busca é o Google.
  // Sem porteiro, dava pra apontar a SerpAPI/SearchAPI (que pagamos por consulta)
  // pra qualquer endereço, inclusive interno, e queimar cota com URL lixo.
  let fotoRecusada = '';
  if (imageUrl) {
    const porteiro = conferirUrl(imageUrl, { permitirHttp: true });
    if (!porteiro.ok) { fotoRecusada = porteiro.motivo; imageUrl = null; }
  }
  const cleaned = cleanTitle(title);
  const titleWords = cleaned.toLowerCase().split(' ').filter((w) => w.length > 2).map(normalizarTexto);
  const numerosTitulo = extrairNumeros(title);

  // 🎯 PONTO 89 (20/08/2026) — "inadmissível vim produtos aleatórios, ela está
  // trazendo vários produtos parecidos". Duas causas-raiz confirmadas:
  //
  //  1) BUSCA POR IMAGEM (Lens) não cruzava com o título de jeito NENHUM — só
  //     exigia preço válido, aceitando qualquer "visualmente parecido" que o
  //     Lens devolvesse, mesmo sendo outro produto/marca. Agora passa pelo
  //     MESMO cruzamento de nome + especificação que a busca por texto.
  //  2) O limiar de "quantas palavras do título precisam bater" ficava sempre
  //     travado em 2, não importa quão descritivo fosse o título — "caixa de
  //     som" batia com qualquer caixa de som do mercado. Agora escala com o
  //     tamanho do título, e SEMPRE exige bater a especificação numérica
  //     (capacidade/potência/voltagem/tamanho) quando o título tiver uma —
  //     é o sinal mais forte de que é o MESMO produto, não um parecido.
  //
  // DOIS NÍVEIS (19/08/2026, "impossível não achar o produto"), agora com a
  // trava de especificação em ambos:
  //   1) ESTRITO: título com 4+ palavras relevantes exige 3 batendo; títulos
  //      menores mantêm a exigência de 2 (ou 1, se só tiver 1 palavra).
  //   2) RELAXADO: só entra em ação quando o estrito não achou NADA nesta
  //      fonte — aceita 1 palavra batendo. Mesmo assim, a especificação
  //      numérica (quando existe) continua obrigatória — não vira licença
  //      pra trazer produto errado, só afrouxa a exigência de palavras.
  // 🥇 REGRA DE OURO (PONTO 91, 20/08/2026) — CAUSA-RAIZ #3: o filtro de texto
  // era aplicado IGUALMENTE a TODAS as fontes, inclusive à correspondência
  // EXATA por imagem. Isso é uma inversão de confiança: quando o Google diz
  // "esta é literalmente a mesma imagem, neste anúncio", a identidade JÁ está
  // provada — nosso filtro de palavra/número só pode DERRUBAR acerto, nunca
  // acrescentar. Prova concreta com o print do dono: o anúncio real
  // "Caixa de Som Amplificada | Philco Extreme #2" era REJEITADO porque o
  // número extraído dele é {2} e o do título do leilão é {15000}, mesmo o
  // Google tendo confirmado ser a mesma foto. Agora identidade verificada por
  // imagem passa direto; o filtro continua valendo integralmente pro resto.
  // Fábrica de validador: permite validar contra o título do NOSSO leilão (cru,
  // muitas vezes genérico) OU contra o título RICO do anúncio que o Google
  // confirmou ser o mesmo produto (com marca + modelo). Ver enriquecerPrecos().
  const criarValidador = (tituloBase) => {
    const palavras = cleanTitle(tituloBase).toLowerCase().split(' ').filter((w) => w.length > 2).map(normalizarTexto);
    const numeros = extrairNumeros(tituloBase);
    return (raw, identidadeVerificada) => {
      if (identidadeVerificada) return raw;

      const comPreco = raw.filter((c) => isValidPrice(c.price));

      const pontuados = comPreco.map((c) => {
        const found = normalizarTexto(c.productNameFound || '');
        const hits = palavras.filter((w) => found.includes(w) || found.includes(singularAproximado(w))).length;
        const numerosFound = extrairNumeros(c.productNameFound);
        const especOk = numeros.size === 0 || [...numeros].some((n) => numerosFound.has(n));
        return { item: c, hits, especOk };
      });

      const limiarEstrito = palavras.length >= 4 ? 3 : Math.min(2, palavras.length);
      const estrito = pontuados.filter((p) => p.hits >= limiarEstrito && p.especOk).map((p) => p.item);
      if (estrito.length > 0) return estrito;

      return pontuados.filter((p) => p.hits >= 1 && p.especOk).map((p) => p.item);
    };
  };
  const relevantes = criarValidador(title);

  // 💰 PONTO 91 — "tem que trazer bastante, um, dois, três... oito, pra trazer o
  // preço médio e o cliente comprovar" (dono). A correspondência exata prova a
  // IDENTIDADE, mas costuma vir com poucos preços (no print do dono, 1 de 6).
  // Média de uma loja só não é média. A saída: usar o título RICO do anúncio
  // que o Google já confirmou (ex.: "Caixa de Som Amplificada 1500W RMS Ex Bass
  // Philco - PCX15000" — tem marca e modelo, ao contrário do nosso
  // "CAIXA DE SOM PCX 15000") pra buscar MAIS ofertas do MESMO produto, e
  // validar essas ofertas contra esse título rico. Não é achismo: é usar a
  // identidade já provada pela imagem como chave de busca por preço.
  const escolherTituloRico = (lista) => {
    const cand = (lista || [])
      .map((c) => String(c.productNameFound || '').trim())
      .filter((t) => t.length >= 15)
      .sort((a, b) => b.length - a.length);
    return cand[0] || '';
  };

  const enriquecerPrecos = async (tituloRico, falhas, inicio, TETO) => {
    const q = cleanTitle(tituloRico);
    if (!q || q.length < 4) return [];
    const valida = criarValidador(tituloRico);
    const motores = [];
    if (SEARCHAPI_KEY) motores.push({ nome: 'enriq_google_shopping', fn: () => fetchSearchApi(q) });
    if (SERPAPI_KEY) motores.push({ nome: 'enriq_serpapi', fn: () => fetchSerpApi(q) });
    motores.push({ nome: 'enriq_zoom', fn: () => fetchZoom(q) });

    const achados = [];
    for (const m of motores) {
      if (Date.now() - inicio > TETO) { falhas.push(`${m.nome}: pulada (teto geral)`); break; }
      try {
        const brutos = await m.fn();
        const ok = valida(brutos, false).filter((c) => isValidPrice(c.price));
        falhas.push(`${m.nome} ("${q}"): ${brutos.length} brutos, ${ok.length} válidos`);
        achados.push(...ok);
        if (achados.length >= 8) break;
      } catch (e) {
        falhas.push(`${m.nome}: ${String(e?.message || e).slice(0, 90)}`);
      }
    }
    return achados;
  };

  const fontes = [];
  if (imageUrl) {
    // 1º — SERPAPI DIRETO (caminho INDEPENDENTE, PONTO 93). Chave do dono
    // publicada aqui na Vercel: não passa por Base44 nem por SearchAPI.
    if (SERPAPI_KEY) {
      fontes.push({ nome: 'serpapi_lens_exato', identidadeVerificada: true, fn: () => fetchSerpApiLensExato(imageUrl) });
      fontes.push({ nome: 'serpapi_lens_visual', fn: () => fetchSerpApiLensVisual(imageUrl) });
    }
    // 2º — SearchAPI (reserva; hoje respondendo "cota do mês esgotada").
    if (SEARCHAPI_KEY) {
      fontes.push({ nome: 'google_lens_exato', identidadeVerificada: true, fn: () => fetchGoogleLensExato(imageUrl) });
      fontes.push({ nome: 'google_lens_similar', fn: () => fetchGoogleLensSimilar(imageUrl) });
    }
    // 3º — ponte Base44: MULETA, só enquanto a SERPAPI_KEY não estiver
    // publicada aqui. Assim que ela for pro painel da Vercel, esta linha para
    // de ser usada sozinha — sem eu precisar mexer em nada. É de propósito:
    // o dono quer sair do Base44, e a saída não pode depender de um deploy meu.
    if (!SERPAPI_KEY) {
      fontes.push({ nome: 'ponte_base44_lens', fn: () => fetchLensPonteBase44(imageUrl) });
    }
  }
  if (cleaned && cleaned.length >= 4) {
    if (SEARCHAPI_KEY) fontes.push({ nome: 'google_shopping', fn: () => fetchSearchApi(cleaned) });
    if (SERPAPI_KEY) fontes.push({ nome: 'serpapi', fn: () => fetchSerpApi(cleaned) });
    fontes.push({ nome: 'zoom', fn: () => fetchZoom(cleaned) });
  }
  if (!fontes.length) return { found: false, reason: 'sem_titulo_sem_imagem', query: cleaned, results: [], attempts: [] };

  // ⏱️ Teto GERAL da cascata (19/08/2026) — cada fonte já tem seu próprio
  // timeout, mas rodando em sequência o pior caso ainda somava até 4x isso.
  // Corta a busca por aqui e devolve "não encontrado" em vez de continuar
  // tentando fontes quando já se gastou tempo demais — o usuário prefere um
  // "indisponível" rápido a um spinner pendurado por 20+ segundos.
  const inicio = Date.now();
  const TETO_GERAL_MS = 12000;
  const falhas = [];

  // 🔦 PONTO 91 — a ausência de chave era SILENCIOSA: a fonte simplesmente não
  // entrava no array e nada era registrado, então "chave não publicada" ficava
  // indistinguível de "não achei preço". Agora vira uma linha explícita no
  // diagnóstico, que o modal exibe na tela de erro.
  if (!imageUrl && fotoRecusada) falhas.push(`busca por imagem: URL da foto recusada pelo porteiro (${fotoRecusada}) — pulada`);
  else if (!imageUrl) falhas.push('busca por imagem: produto sem foto cadastrada — pulada');
  if (!SERPAPI_KEY) {
    falhas.push('⚠️ SERPAPI_KEY não publicada na Vercel — busca por imagem independente DESLIGADA (é a chave que destrava tudo sem Base44)');
  }
  if (imageUrl && !SEARCHAPI_KEY) falhas.push('google_lens (SearchAPI): SEARCHAPI_KEY não publicada neste ambiente — pulada');

  // Guarda a prova de identidade (correspondência exata por imagem) mesmo
  // quando ela não traz preço, pra anexar ao resultado final da fonte que
  // conseguir precificar. É o que o dono pediu: "trazer bastante, 1,2,3...8".
  let provaIdentidade = [];

  for (const f of fontes) {
    if (Date.now() - inicio > TETO_GERAL_MS) {
      falhas.push(`${f.nome}: pulada (teto geral de ${TETO_GERAL_MS}ms atingido)`);
      continue;
    }
    try {
      const raw = await f.fn();
      const r = relevantes(raw, f.identidadeVerificada);
      const comPreco = r.filter((c) => isValidPrice(c.price));
      // Três números, não um: distingue "a fonte não achou nada" de "achou e
      // nós filtramos". Antes o log chamava de "brutos" um número já filtrado.
      falhas.push(`${f.nome}: ${raw.length} brutos, ${r.length} relevantes, ${comPreco.length} com preço`);

      if (f.identidadeVerificada && r.length > 0 && provaIdentidade.length === 0) {
        provaIdentidade = r;
      }

      // Identidade provada mas poucos preços → busca mais ofertas DO MESMO
      // produto usando o título rico (marca+modelo) do anúncio já confirmado.
      let precificados = comPreco;
      if (f.identidadeVerificada && r.length > 0 && precificados.length < 4) {
        const rico = escolherTituloRico(r);
        if (rico) {
          const extrasPreco = await enriquecerPrecos(rico, falhas, inicio, TETO_GERAL_MS);
          const chaves = new Set(precificados.map((c) => `${(c.store || '').toLowerCase()}|${Math.round(c.price * 100)}`));
          for (const e of extrasPreco) {
            const k = `${(e.store || '').toLowerCase()}|${Math.round(e.price * 100)}`;
            if (chaves.has(k)) continue;
            chaves.add(k);
            precificados = precificados.concat([{ ...e, matchLevel: 'mesmo_produto' }]);
          }
        }
      }

      if (precificados.length > 0) {
        // MÉDIA APARADA (robusta a outliers): a busca casa itens parecidos mas de tamanhos/capacidades
        // diferentes (16gb x 256gb, kit 6 x kit 24) e um item caro inflava a média. Ancora na mediana
        // e mantém só os preços dentro de uma banda ao redor dela (0,4x a 2,2x), depois tira a média.
        const sorted = precificados.map((c) => c.price).sort((a, b) => a - b);
        const med = sorted[Math.floor(sorted.length / 2)];
        let band = sorted.filter((p) => p >= med * 0.4 && p <= med * 2.2);
        if (band.length < 3) band = sorted; // poucos dados: usa tudo
        const avg = band.reduce((a, b) => a + b, 0) / band.length;

        // Mostra primeiro o que tem preço; depois as provas de identidade sem
        // preço (mesma imagem confirmada pelo Google, anúncio sem preço público)
        // sem duplicar o que já está na lista.
        const jaListado = new Set(precificados.map((c) => `${c.store}|${c.productNameFound}`));
        const semPreco = [...r, ...provaIdentidade]
          .filter((c) => !isValidPrice(c.price) && !jaListado.has(`${c.store}|${c.productNameFound}`));
        const vistos = new Set();
        const extras = semPreco.filter((c) => {
          const k = `${c.store}|${c.productNameFound}`;
          if (vistos.has(k)) return false; vistos.add(k); return true;
        });

        return {
          found: true, source: f.nome, query: cleaned,
          avg: Math.round(avg * 100) / 100,
          median: med, min: sorted[0], max: sorted[sorted.length - 1],
          count: band.length, total_found: precificados.length,
          results: [...precificados, ...extras].slice(0, 12),
          attempts: falhas,
        };
      }
    } catch (e) {
      falhas.push(`${f.nome}: ${String(e?.message || e).slice(0, 110)}`);
    }
  }

  // Nenhuma fonte precificou. Se o Google confirmou a identidade por imagem,
  // isso NÃO é "não encontramos o produto" — é "achamos o produto, nenhuma
  // loja publicou preço". São coisas diferentes e a tela precisa dizer qual é.
  if (provaIdentidade.length > 0) {
    return {
      found: false, reason: 'identidade_sem_preco', query: cleaned,
      results: provaIdentidade.slice(0, 12), attempts: falhas, fontes: falhas,
    };
  }
  return { found: false, reason: 'sem_resultado', query: cleaned, fontes: falhas, attempts: falhas, results: [] };
}
