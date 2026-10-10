// 📄 A FICHA DA PÁGINA — ler peso, medidas e descrição do anúncio (08/10/2026, DIR-207).
//
// Dono: "a IA tem que pegar todas as medidas… ela não está botando o peso
// correto". Diagnóstico antes de mexer: NENHUMA rota lia a página do link.
// extractMLImages é um stub que devolve "ml_bloqueado"; o único peso que
// entrava era um chute da IA a partir do TÍTULO. Uma geladeira ia para a
// Melhor Envio com a caixa padrão de 0,3 kg.
//
// Este arquivo tem a parte PURA (ler o HTML, montar o pedido à IA, sanear a
// resposta) e UMA função de rede (buscarPagina), que nunca lança. A rota
// api/functions/importarProdutoPeloLink.js é quem junta as peças; a régua
// do que é medida válida continua em src/lib/medidasDoProduto.js — se a
// regra morasse aqui também, divergiria da tela.
import { urlSeguraParaBuscar } from './imagemExterna.js';
import { pesoEmKg, medidaEmCm, normalizarMedidas } from '../../src/lib/medidasDoProduto.js';

/** Teto do HTML que a gente lê (páginas de loja passam de 1 MB com facilidade). */
export const TETO_HTML_BYTES = 2 * 1024 * 1024;
/** Tempo máximo esperando a origem — igual ao copiarImagensParaNosso. */
export const TIMEOUT_MS = 15000;
/** Quanto texto visível vai para a IA. Mais que isso é custo sem ganho. */
export const TETO_TEXTO = 14000;
export const MAX_IMAGENS = 12;
/** As palavras que marcam a ficha técnica: a janela ao redor delas vai primeiro. */
export const PALAVRAS_DA_FICHA = ['peso', 'dimens', 'altura', 'largura', 'profundidade', 'comprimento', 'medidas', 'ficha', 'caracter'];

// Navegador de verdade: muitas lojas devolvem 403 para "bot" declarado e
// servem a página inteira para um Chrome.
export const UA_NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ccedil: 'ç', atilde: 'ã', otilde: 'õ', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', acirc: 'â', ecirc: 'ê', ocirc: 'ô', agrave: 'à', deg: '°', times: '×', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»', copy: '©', reg: '®', trade: '™' };

/** Entidades básicas (&amp; &#39; &#xE7; …). O que não conhece, deixa como está. */
export function decodificarEntidades(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k[0] === '#') {
      const n = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTIDADES[k] ?? m;
  });
}

const limpa = (s) => decodificarEntidades(String(s || '')).replace(/\s+/g, ' ').trim();

/** O valor do atributo (content/src/href) de uma tag, com aspas simples ou duplas. */
function atributo(tag, nome) {
  const m = new RegExp(`\\s${nome}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : '';
}

/** As <meta> cujo name/property casa com `chave` (og:image, description…), na ordem. */
function metas(html, chave) {
  const out = [];
  const re = /<meta\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const nome = (atributo(tag, 'property') || atributo(tag, 'name') || atributo(tag, 'itemprop')).toLowerCase();
    if (nome === chave) out.push(limpa(atributo(tag, 'content')));
  }
  return out.filter(Boolean);
}

/** Endereço absoluto (http/https). Relativo só resolve com `base`; sem base, cai fora. */
function absoluta(url, base) {
  const s = String(url || '').trim();
  if (!s) return null;
  try {
    const u = base ? new URL(s, base) : new URL(s.startsWith('//') ? `https:${s}` : s);
    return /^https?:$/.test(u.protocol) ? u.href : null;
  } catch { return null; }
}

/** Acha o objeto Product dentro do JSON-LD (direto, em lista ou em @graph). */
function achaProduct(no, fundo = 0) {
  if (!no || fundo > 4) return null;
  if (Array.isArray(no)) { for (const x of no) { const p = achaProduct(x, fundo + 1); if (p) return p; } return null; }
  if (typeof no !== 'object') return null;
  const tipo = Array.isArray(no['@type']) ? no['@type'] : [no['@type']];
  if (tipo.some((t) => String(t || '').toLowerCase() === 'product')) return no;
  if (no['@graph']) return achaProduct(no['@graph'], fundo + 1);
  if (no.mainEntity) return achaProduct(no.mainEntity, fundo + 1);
  return null;
}

/** Imagens do Product do JSON-LD: string, lista, ImageObject ou lista deles. */
function imagensDoJsonLd(p) {
  const bruto = p?.image;
  const lista = Array.isArray(bruto) ? bruto : bruto ? [bruto] : [];
  return lista.map((x) => (typeof x === 'string' ? x : x?.url || x?.contentUrl || '')).filter(Boolean);
}

/** Só os campos que interessam do Product (sem ofertas, sem reviews). */
function resumoDoProduct(p) {
  if (!p) return null;
  const marca = typeof p.brand === 'string' ? p.brand : p.brand?.name || null;
  const pega = (k) => (p[k] === undefined ? null : p[k]);
  return {
    name: typeof p.name === 'string' ? limpa(p.name) : null,
    description: typeof p.description === 'string' ? limpa(p.description).slice(0, 3000) : null,
    brand: marca ? limpa(marca) : null,
    model: typeof p.model === 'string' ? limpa(p.model) : (p.model?.name ? limpa(p.model.name) : null),
    sku: typeof p.sku === 'string' ? p.sku : null,
    weight: pega('weight'), width: pega('width'), height: pega('height'), depth: pega('depth'),
  };
}

/**
 * Lê o texto VISÍVEL de uma página, priorizando a ficha técnica.
 * Quando o texto cabe no teto, vai inteiro. Quando não cabe, as janelas ao
 * redor de 'peso', 'dimens', 'altura'… entram primeiro e o começo da página
 * (título, descrição) preenche o que sobrar — cortar em 14.000 do início
 * perderia exatamente a ficha, que costuma ficar lá embaixo.
 */
export function priorizarTexto(texto, teto = TETO_TEXTO) {
  const t = String(texto || '');
  if (t.length <= teto) return t;
  const re = new RegExp(PALAVRAS_DA_FICHA.join('|'), 'gi');
  const janelas = [];
  let m;
  while ((m = re.exec(t)) && janelas.length < 300) janelas.push([Math.max(0, m.index - 300), Math.min(t.length, m.index + 1200)]);
  const unir = (lista) => {
    const out = [];
    for (const j of lista.sort((a, b) => a[0] - b[0])) {
      const u = out[out.length - 1];
      if (u && j[0] <= u[1]) u[1] = Math.max(u[1], j[1]); else out.push([j[0], j[1]]);
    }
    return out;
  };
  const reservaInicio = 2000;
  let gasto = 0;
  const escolhidas = [];
  for (const [a, b] of unir(janelas)) {
    const sobra = teto - reservaInicio - gasto;
    if (sobra <= 0) break;
    const fim = Math.min(b, a + sobra);
    escolhidas.push([a, fim]);
    gasto += fim - a;
  }
  const inicio = [0, Math.min(t.length, Math.max(0, teto - gasto))];
  return unir([inicio, ...escolhidas]).map(([a, b]) => t.slice(a, b)).join(' … ').slice(0, teto);
}

/**
 * O que a página diz, sem rede.
 * @param {string} html
 * @param {{url?:string}} [opts]  endereço da página, para resolver imagem relativa
 * @returns {{titulo:string, descricaoMeta:string, imagens:string[], jsonLd:object|null, texto:string}}
 */
export function textoDaPagina(html, { url = '' } = {}) {
  const h = String(html || '');
  const base = absoluta(url) || undefined;

  // JSON-LD antes de tirar os <script>: é o único script que interessa.
  let product = null;
  const reLd = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while (!product && (m = reLd.exec(h))) {
    try { product = achaProduct(JSON.parse(m[1].trim())); } catch { /* JSON-LD quebrado: segue sem */ }
  }

  const tituloTag = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(h);
  const titulo = limpa(tituloTag?.[1] || '') || metas(h, 'og:title')[0] || (product?.name ? limpa(product.name) : '');
  const descricaoMeta = metas(h, 'description')[0] || metas(h, 'og:description')[0] || '';

  const vistas = new Set();
  const imagens = [];
  for (const img of [...metas(h, 'og:image'), ...metas(h, 'og:image:secure_url'), ...imagensDoJsonLd(product)]) {
    const abs = absoluta(img, base);
    if (!abs || vistas.has(abs)) continue;
    vistas.add(abs);
    imagens.push(abs);
    if (imagens.length >= MAX_IMAGENS) break;
  }

  const visivel = h
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/td|\/th|\/dd|\/dt|\/section|\/article|\/table)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  const texto = priorizarTexto(decodificarEntidades(visivel).replace(/[ \t\r\f\v]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n').trim());

  return { titulo, descricaoMeta, imagens, jsonLd: resumoDoProduct(product), texto };
}

/** Lê o corpo até o teto. Página maior que o teto é CORTADA (a ficha fica no HTML que veio), não recusada. */
async function lerAteOTeto(r) {
  if (r?.body && typeof r.body.getReader === 'function') {
    const leitor = r.body.getReader();
    const partes = [];
    let total = 0;
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      if (!value) continue;
      const sobra = TETO_HTML_BYTES - total;
      if (value.byteLength >= sobra) { partes.push(value.subarray(0, sobra)); total += sobra; try { await leitor.cancel(); } catch { /* já veio o que precisava */ } return { html: Buffer.concat(partes).toString('utf8'), truncado: true }; }
      partes.push(value); total += value.byteLength;
    }
    return { html: Buffer.concat(partes).toString('utf8'), truncado: false };
  }
  const txt = await r.text();
  return { html: txt.length > TETO_HTML_BYTES ? txt.slice(0, TETO_HTML_BYTES) : txt, truncado: txt.length > TETO_HTML_BYTES };
}

const cabecalho = (r, nome) => String((typeof r?.headers?.get === 'function' ? r.headers.get(nome) : r?.headers?.[nome]) || '');

/**
 * Busca a página como um navegador. NUNCA lança: tudo vira {ok:false, erro}.
 * @returns {Promise<{ok:boolean, status:number, html:string, finalUrl:string, erro:string|null, truncado?:boolean}>}
 */
export async function buscarPagina(url, { fetchImpl = globalThis.fetch, timeoutMs = TIMEOUT_MS } = {}) {
  const alvo = String(url || '').trim();
  const seguro = urlSeguraParaBuscar(alvo);
  if (!seguro.ok) return { ok: false, status: 0, html: '', finalUrl: alvo, erro: seguro.motivo };
  const corta = new AbortController();
  const t = setTimeout(() => corta.abort(), timeoutMs);
  try {
    const r = await fetchImpl(alvo, {
      signal: corta.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA_NAVEGADOR,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.6,en;q=0.5',
      },
    });
    const status = Number(r?.status) || 0;
    const finalUrl = String(r?.url || alvo);
    if (!r?.ok) return { ok: false, status, html: '', finalUrl, erro: `origem_${status}` };
    const tipo = cabecalho(r, 'content-type').toLowerCase();
    // Só HTML: um PDF, uma imagem ou um JSON não têm "ficha" para ler.
    if (!tipo.includes('text/html') && !tipo.includes('application/xhtml')) return { ok: false, status, html: '', finalUrl, erro: 'nao_e_html' };
    const { html, truncado } = await lerAteOTeto(r);
    if (!html.trim()) return { ok: false, status, html: '', finalUrl, erro: 'vazia' };
    return { ok: true, status, html, finalUrl, erro: null, truncado };
  } catch (e) {
    return { ok: false, status: 0, html: '', finalUrl: alvo, erro: e?.name === 'AbortError' ? 'demorou_demais' : 'falha_na_origem' };
  } finally {
    clearTimeout(t);
  }
}

// ── A IA ───────────────────────────────────────────────────────────────────

const numeroOuNulo = { anyOf: [{ type: 'number' }, { type: 'null' }] };
const medidaCm = { type: 'object', properties: { valor: numeroOuNulo, unidade: { anyOf: [{ type: 'string', enum: ['cm', 'mm', 'm'] }, { type: 'null' }] } }, required: ['valor', 'unidade'], additionalProperties: false };

/** O formato que a IA é OBRIGADA a devolver (output_config.format json_schema). */
export const SCHEMA_DA_FICHA = Object.freeze({
  type: 'object',
  properties: {
    titulo: { type: 'string' },
    descricao: { type: 'string' },
    marca: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    modelo: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    peso: { type: 'object', properties: { valor: numeroOuNulo, unidade: { anyOf: [{ type: 'string', enum: ['kg', 'g'] }, { type: 'null' }] } }, required: ['valor', 'unidade'], additionalProperties: false },
    altura: medidaCm,
    largura: medidaCm,
    comprimento: medidaCm,
    encontrado_na_pagina: { type: 'boolean' },
    confianca: { type: 'string', enum: ['alta', 'media', 'baixa'] },
    observacao: { type: 'string' },
  },
  required: ['titulo', 'descricao', 'marca', 'modelo', 'peso', 'altura', 'largura', 'comprimento', 'encontrado_na_pagina', 'confianca', 'observacao'],
  additionalProperties: false,
});

const REGRAS_DA_DESCRICAO = 'A "descricao" é um texto corrido em português do Brasil, de 2 a 4 parágrafos, para a página de venda de um leilão: o que é, para que serve, o que vem junto, estado/garantia quando a página disser. SEM HTML, SEM preço, SEM link, SEM "compre agora".';

/**
 * O pedido à IA quando a PÁGINA foi lida: copiar os números da ficha, nunca inventar.
 * @param {{url:string, titulo?:string, pagina:ReturnType<typeof textoDaPagina>}} p
 */
export function montarPromptDaFicha({ url, titulo, pagina }) {
  const p = pagina || {};
  const linhas = [
    'Você vai ler o conteúdo de uma página de produto e preencher a ficha do produto para um leilão. Responda no formato pedido.',
    '',
    'REGRAS DAS MEDIDAS (as mais importantes):',
    '1. COPIE os números da ficha técnica da página. Não calcule, não arredonde, não invente. Se a página não traz o número, devolva valor null.',
    '2. "encontrado_na_pagina" é true SOMENTE se peso ou medidas vieram do texto da página. Se você estimou qualquer um dos quatro, é false.',
    '3. Peso: prefira o peso DO PRODUTO. Se a página traz o do produto E o da embalagem, use o do produto. Se só houver o da embalagem (ou "peso bruto"), use esse e diga isso na "observacao".',
    '4. Medidas: "comprimento" é a profundidade do produto (frente-fundo); "largura" é lado a lado; "altura" é de baixo para cima. Se a página traz as medidas da embalagem e não as do produto, use as da embalagem e diga na "observacao".',
    '5. Unidade: devolva a unidade que a página usa (kg ou g; cm, mm ou m). Não converta.',
    '6. "confianca": alta = números claros na ficha técnica; media = números presentes mas ambíguos (ex.: só da embalagem); baixa = estimativa.',
    '7. Marca e modelo: só se estiverem na página; senão null.',
    REGRAS_DA_DESCRICAO,
    '',
    `ENDEREÇO: ${String(url || '').slice(0, 500)}`,
    `TÍTULO INFORMADO: ${String(titulo || p.titulo || '').slice(0, 300) || '(não informado)'}`,
  ];
  if (p.descricaoMeta) linhas.push(`DESCRIÇÃO (meta): ${String(p.descricaoMeta).slice(0, 1000)}`);
  if (p.jsonLd) linhas.push(`DADOS ESTRUTURADOS (JSON-LD Product): ${JSON.stringify(p.jsonLd).slice(0, 3000)}`);
  linhas.push('', 'TEXTO VISÍVEL DA PÁGINA:', String(p.texto || '').slice(0, TETO_TEXTO));
  return linhas.join('\n');
}

/** O pedido à IA quando a página NÃO pôde ser lida: estimativa honesta a partir do nome. */
export function montarPromptDaEstimativa({ titulo }) {
  return [
    'Não foi possível ler a página do produto. Com base SOMENTE no nome abaixo, preencha a ficha para um leilão. Responda no formato pedido.',
    '',
    'REGRAS:',
    '1. Peso e medidas são uma ESTIMATIVA típica para um produto desse nome e porte, em kg e cm. Seja honesto: "encontrado_na_pagina" é false, e "confianca" é "baixa" (ou "media" só quando o nome traz capacidade/tamanho explícitos, ex.: "geladeira 400 L", "TV 50 polegadas").',
    '2. Se o nome não permite estimar com algum sentido (ex.: "lote diversos"), devolva valor null nas medidas e explique na "observacao".',
    '3. Diga na "observacao", em uma frase, que são estimativas pelo nome e o que foi assumido.',
    '4. Marca e modelo só se estiverem no nome; senão null.',
    REGRAS_DA_DESCRICAO,
    '',
    `NOME DO PRODUTO: ${String(titulo || '').slice(0, 300)}`,
  ].join('\n');
}

const UNIDADES_PESO = { kgm: 'kg', kg: 'kg', kilogram: 'kg', quilo: 'kg', quilos: 'kg', grm: 'g', g: 'g', gram: 'g', grama: 'g', gramas: 'g' };
const UNIDADES_CM = { cmt: 'cm', cm: 'cm', centimeter: 'cm', centimetro: 'cm', centímetro: 'cm', mmt: 'mm', mm: 'mm', millimeter: 'mm', mtr: 'm', m: 'm', meter: 'm', metro: 'm' };

/** Um QuantitativeValue do schema.org ("12 kg", {value, unitCode}) em {valor, unidade}. */
function quantidade(q, tabela) {
  if (q === null || q === undefined || q === '') return { valor: null, unidade: null };
  if (typeof q === 'object') {
    const u = String(q.unitCode || q.unitText || '').toLowerCase();
    const n = Number(String(q.value ?? '').replace(',', '.'));
    return { valor: Number.isFinite(n) ? n : null, unidade: tabela[u] || null };
  }
  const m = /(-?\d+(?:[.,]\d+)?)\s*([a-zA-Zç]*)/.exec(String(q));
  if (!m) return { valor: null, unidade: null };
  return { valor: Number(m[1].replace(',', '.')), unidade: tabela[m[2].toLowerCase()] || null };
}

/** As medidas que o JSON-LD declara, prontas para sanearFicha. Null quando não há nenhuma. */
export function medidasDoJsonLd(jsonLd) {
  if (!jsonLd) return null;
  const f = { peso: quantidade(jsonLd.weight, UNIDADES_PESO), altura: quantidade(jsonLd.height, UNIDADES_CM), largura: quantidade(jsonLd.width, UNIDADES_CM), comprimento: quantidade(jsonLd.depth, UNIDADES_CM) };
  return Object.values(f).some((x) => x.valor !== null) ? f : null;
}

const texto = (v, teto) => (typeof v === 'string' ? v.replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, teto) : '');
const textoOuNulo = (v, teto) => texto(v, teto) || null;

/**
 * A resposta da IA (ou do JSON-LD) saneada: unidades convertidas para kg/cm
 * pela régua única, fora da faixa vira null + aviso, e a FONTE só é 'pagina'
 * quando a página foi lida E a IA disse que os números vieram dela.
 * @param {object} obj   o que a IA devolveu no formato SCHEMA_DA_FICHA
 * @param {{fonte:'pagina'|'estimativa'}} ctx  'pagina' = a página foi lida
 */
export function sanearFicha(obj, { fonte = 'estimativa' } = {}) {
  const o = obj && typeof obj === 'object' ? obj : {};
  const avisos = [];
  const naPagina = fonte === 'pagina' && o.encontrado_na_pagina === true;
  const fonteFinal = naPagina ? 'pagina' : 'estimativa';

  const med = (campo, conv) => {
    const q = o[campo] && typeof o[campo] === 'object' ? o[campo] : { valor: o[campo], unidade: null };
    return conv(q.valor, q.unidade);
  };
  const brutas = {
    peso: med('peso', pesoEmKg),
    altura: med('altura', medidaEmCm),
    largura: med('largura', medidaEmCm),
    comprimento: med('comprimento', medidaEmCm),
  };
  const { valores, avisos: foraDaFaixa } = normalizarMedidas(brutas);
  avisos.push(...foraDaFaixa);

  let confianca = ['alta', 'media', 'baixa'].includes(o.confianca) ? o.confianca : 'baixa';
  if (fonteFinal === 'estimativa' && confianca === 'alta') confianca = 'media';
  if (fonteFinal === 'estimativa' && Object.values(valores).some((v) => v !== null)) {
    avisos.push('Peso e medidas são ESTIMATIVA da IA pelo nome — confira antes de cotar o frete.');
  }
  if (Object.values(valores).every((v) => v === null)) avisos.push('Nenhuma medida aproveitável: informe à mão.');

  return {
    titulo: texto(o.titulo, 200),
    descricao: texto(o.descricao, 6000),
    marca: textoOuNulo(o.marca, 80),
    modelo: textoOuNulo(o.modelo, 120),
    medidas: valores,
    avisos,
    fonte: fonteFinal,
    confianca,
    observacao: texto(o.observacao, 600),
  };
}

// ── 🔗 DIR-212 (10/10/2026) — IMPORTAR DE QUALQUER MARKETPLACE ────────────────
// Dono: "não precisa ser só o link do Mercado Livre: pode ser qualquer link de
// qualquer marketplace — Shopee, Magazine Luiza, Mercado Livre e etc." O leitor
// acima já lia qualquer página; faltavam três coisas: o PREÇO (a loja precisa),
// reconhecer de qual marketplace é o link, e um título tirado do próprio
// endereço quando a página não abre para o servidor — o Mercado Livre e a
// Shopee devolvem tela de verificação ou vazia para robô, mas o endereço
// carrega o nome do produto.

export const MARKETPLACES = Object.freeze([
  { id: 'mercado_livre', nome: 'Mercado Livre', hosts: ['mercadolivre.com', 'mercadolivre.com.br', 'mercadolibre.com'] },
  { id: 'shopee', nome: 'Shopee', hosts: ['shopee.com.br', 'shopee.com', 'shp.ee'] },
  { id: 'magazine_luiza', nome: 'Magazine Luiza', hosts: ['magazineluiza.com.br', 'magalu.com', 'magazinevoce.com.br'] },
  { id: 'amazon', nome: 'Amazon', hosts: ['amazon.com.br', 'amazon.com', 'amzn.to'] },
  { id: 'americanas', nome: 'Americanas', hosts: ['americanas.com.br'] },
  { id: 'casas_bahia', nome: 'Casas Bahia', hosts: ['casasbahia.com.br'] },
  { id: 'aliexpress', nome: 'AliExpress', hosts: ['aliexpress.com', 'aliexpress.us'] },
  { id: 'temu', nome: 'Temu', hosts: ['temu.com'] },
  { id: 'shein', nome: 'Shein', hosts: ['shein.com'] },
  { id: 'kabum', nome: 'KaBuM!', hosts: ['kabum.com.br'] },
  { id: 'olx', nome: 'OLX', hosts: ['olx.com.br'] },
]);

/** De qual marketplace é o host. Desconhecido vira { id: 'outro', nome: host }; vazio vira null. */
export function marketplaceDoHost(host) {
  const h = String(host || '').toLowerCase().replace(/^www\./, '');
  if (!h) return null;
  for (const m of MARKETPLACES) if (m.hosts.some((d) => h === d || h.endsWith(`.${d}`))) return { id: m.id, nome: m.nome };
  return { id: 'outro', nome: h };
}

const TITULOS_GENERICOS = [
  /^mercado ?livre\b/i, /^shopee\b/i, /^amazon(\.com)?(\.br)?$/i, /^magazine ?luiza\b/i, /^americanas\b/i, /^casas bahia\b/i,
  /^aliexpress\b/i, /^temu\b/i, /^shein\b/i, /access denied/i, /robot check/i, /just a moment/i, /attention required/i,
  /captcha/i, /verifica/i, /^erro?\b/i, /^403\b/, /^404\b/, /não encontrad/i, /page not found/i, /^unavailable/i,
];

/** O título da página é só o nome do marketplace ou uma tela de bloqueio (não é o produto)? */
export function tituloEhGenerico(titulo) {
  const t = String(titulo || '').trim();
  if (t.length < 6) return true;
  return TITULOS_GENERICOS.some((re) => re.test(t));
}

const PEDACOS_SEM_NOME = /^(p|dp|item|itens|produto|produtos|product|products|itm|i|s|sp|search|ref|b|pd|c|category|categoria|offer|oferta)$/i;

/**
 * O nome do produto escondido no endereço (o "slug"): o maior pedaço com hífens,
 * sem os códigos (MLB…, _JM, i.123.456, ASIN). Vazio quando o endereço não tem nome.
 *   produto.mercadolivre.com.br/MLB-123-notebook-lenovo-_JM → "Notebook lenovo"
 *   shopee.com.br/Fone-Bluetooth-i.123.456                   → "Fone Bluetooth"
 */
export function tituloDoEndereco(url) {
  let u;
  try { u = new URL(String(url || '').trim()); } catch { return ''; }
  let caminho = u.pathname;
  try { caminho = decodeURIComponent(caminho); } catch { /* fica como veio */ }
  const candidatos = caminho.split('/').filter(Boolean)
    .map((p) => p.replace(/_JM$/i, '').replace(/^MLB-?\d+-?/i, '').replace(/-i\.\d+\.\d+$/i, '').replace(/-p$/i, '').replace(/[_+]/g, '-'))
    .filter((p) => p.includes('-') && /[a-zà-ú]/i.test(p) && !PEDACOS_SEM_NOME.test(p));
  if (!candidatos.length) return '';
  const melhor = candidatos.sort((a, b) => b.length - a.length)[0]
    .replace(/-+/g, ' ').replace(/\b[a-f0-9]{10,}\b/gi, '').replace(/\b(mlb|mlu|mla)\d+\b/gi, '').replace(/\s+/g, ' ').trim();
  if (melhor.length < 8) return '';
  return (melhor[0].toUpperCase() + melhor.slice(1)).slice(0, 150);
}

const numeroDePreco = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  const n = Number(/^\d+(\.\d+)?$/.test(s) ? s : s.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n < 10000000 ? Math.round(n * 100) / 100 : null;
};

/**
 * O preço que a página DECLARA (nunca estimado): Product.offers do JSON-LD
 * (Offer, AggregateOffer.lowPrice, priceSpecification) ou as <meta> de preço
 * (product:price:amount, og:price:amount, itemprop price). Sem nada, null.
 * @returns {{preco:number|null, moeda:string|null, origem:'json_ld'|'meta'|null}}
 */
export function precoDaPagina(html) {
  const h = String(html || '');
  let product = null;
  const reLd = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while (!product && (m = reLd.exec(h))) {
    try { product = achaProduct(JSON.parse(m[1].trim())); } catch { /* JSON-LD quebrado: segue */ }
  }
  const ofertas = product?.offers ? (Array.isArray(product.offers) ? product.offers : [product.offers]) : [];
  for (const o of ofertas) {
    if (!o || typeof o !== 'object') continue;
    const spec = Array.isArray(o.priceSpecification) ? o.priceSpecification[0] : o.priceSpecification;
    const preco = numeroDePreco(o.price ?? o.lowPrice ?? spec?.price);
    if (preco) return { preco, moeda: String(o.priceCurrency || spec?.priceCurrency || 'BRL').toUpperCase(), origem: 'json_ld' };
  }
  for (const chave of ['product:price:amount', 'og:price:amount', 'product:sale_price:amount', 'price']) {
    const preco = numeroDePreco(metas(h, chave)[0]);
    if (preco) {
      const moeda = metas(h, 'product:price:currency')[0] || metas(h, 'og:price:currency')[0] || metas(h, 'pricecurrency')[0] || 'BRL';
      return { preco, moeda: String(moeda).toUpperCase(), origem: 'meta' };
    }
  }
  return { preco: null, moeda: null, origem: null };
}
