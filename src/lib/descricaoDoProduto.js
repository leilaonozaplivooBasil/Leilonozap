// 📝 DESCRIÇÃO DE PRODUTO — as regras do "revisar descrições em lote" (10/10/2026).
//
// Dono: "existem muitos produtos com descrição fraca ou sem descrição; um botão que coloque a
// descrição em todos, um a um, devagarinho; sem falha."
//
// 🔎 O QUE A ANÁLISE ACHOU (10/10): na loja, `products.description` é só o NOME; a descrição de
// verdade mora em `notes`. Dos 233 produtos da loja, 116 não tinham nada, 88 só o texto INTERNO
// do lote ("Gerado automaticamente do lote: … (Mercado Livre)", que a vitrine já esconde) e 28 uma
// linha em HTML. Nos leilões a descrição mora em `auctions.description`, e 25 dos 49 ativos só
// repetiam o título.
//
// 🔴 O RISCO QUE ESTE ARQUIVO CONTROLA: a IA escrevendo só a partir do nome INVENTA característica
// (voltagem, material, garantia) — e em loja de devolução isso vira reclamação e estorno. Por isso:
//   • a IA só recebe FATOS (nome, fotos, condição, estado, medidas, peso) e é proibida de criar
//     outros; a instrução está em `SISTEMA`;
//   • o texto volta por `validarDescricaoGerada`, que recusa o que cheira a promessa (preço, frete,
//     garantia, link, "lote"/"Mercado Livre") e o que é curto ou longo demais;
//   • nada vai ao ar sozinho: vira RASCUNHO e o dono aprova (ver api/functions/descricoesEmLote.js).
//
// Arquivo sem `@/` e sem React: roda no `node --test`.
import { ehTextoInternoDeLote } from './condicaoProduto.js';
import { textoDaIA } from './descricaoIA.js';

export const NIVEIS = ['vazia', 'interna', 'so_o_nome', 'curta', 'boa'];
/** A partir daqui (caracteres de TEXTO, sem HTML) a descrição já informa o suficiente. */
export const MINIMO_DE_UMA_BOA = 160;
export const MINIMO_GERADO = 120;
export const MAXIMO_GERADO = 900;

/** Tira as marcas HTML e espaços repetidos: o que o cliente de fato lê. */
export function textoSemHtml(valor) {
  return String(valor || '')
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

const normaliza = (t) => textoSemHtml(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Como está a descrição de um item.
 *   vazia     — nada
 *   interna   — só o texto interno do lote (a vitrine esconde: para o cliente é vazia)
 *   so_o_nome — repete o nome/título
 *   curta     — tem algo, mas pouco (inclui "uma linha em HTML")
 *   boa       — já informa
 */
export function nivelDaDescricao(texto, nome = '') {
  const bruto = String(texto || '').trim();
  if (!bruto) return 'vazia';
  if (ehTextoInternoDeLote(bruto)) return 'interna';
  const limpo = textoSemHtml(bruto);
  if (!limpo) return 'vazia';
  const a = normaliza(limpo);
  const n = normaliza(nome);
  if (n && (a === n || (a.length <= n.length + 12 && (a.includes(n) || n.includes(a))))) return 'so_o_nome';
  return limpo.length >= MINIMO_DE_UMA_BOA ? 'boa' : 'curta';
}

/** Precisa de descrição nova? Tudo que não é "boa". */
export const precisaDeDescricao = (texto, nome) => nivelDaDescricao(texto, nome) !== 'boa';

const CONDICOES = {
  novo: 'novo, lacrado', perfeito: 'perfeito, sem marcas de uso', bom: 'bom, com pequenas marcas de uso',
  com_avarias: 'com avarias (amassado ou riscado)', para_reparo: 'para reparo (precisa de conserto)', recondicionado: 'recondicionado',
};

/** Só os fatos que EXISTEM no cadastro. Nada de campo vazio, nada de "0". */
export function fatosDoProduto(p = {}) {
  const f = [];
  const nome = String(p.nome || '').trim();
  if (nome) f.push(`Nome no cadastro: ${nome}`);
  if (CONDICOES[p.condicao]) f.push(`Condição: ${CONDICOES[p.condicao]}`);
  const estado = textoSemHtml(p.estado_conservacao);
  if (estado) f.push(`Estado informado por quem cadastrou: ${estado}`);
  // observações escritas por gente (não o texto interno do lote)
  const obs = ehTextoInternoDeLote(p.notes) ? '' : textoSemHtml(p.notes);
  if (obs) f.push(`Observação do cadastro: ${obs.slice(0, 400)}`);
  const peso = Number(p.peso);
  if (peso > 0) f.push(`Peso: ${peso} kg`);
  const [c, l, a] = [p.comprimento, p.largura, p.altura].map(Number);
  if (c > 0 && l > 0 && a > 0) f.push(`Medidas da embalagem: ${c} x ${l} x ${a} cm`);
  if (p.origem === 'return_resale') f.push('Origem: produto de arremate/devolução (pode ter marcas de uso ou embalagem aberta)');
  return f;
}

export const SISTEMA = [
  'Você escreve a descrição de um produto para a vitrine do Leilão NoZap (loja e leilão), em português do Brasil.',
  'REGRA ABSOLUTA: use SOMENTE o que está nos FATOS e o que dá para VER nas fotos. Se uma informação não está lá,',
  'NÃO escreva — nada de voltagem, material, potência, capacidade, marca, modelo, garantia ou itens inclusos que',
  'ninguém confirmou. Prefira dizer menos a dizer algo que pode estar errado.',
  'Não cite preço, frete, cupom, prazo, garantia, loja de origem, lote, nem links.',
  'Se houver condição ou estado, diga com honestidade (marcas, avarias, "sem bateria" etc.): o cliente precisa saber.',
  'Formato: uma frase de abertura dizendo o que é o produto, depois de 3 a 5 linhas curtas começando com "• "',
  'com o que é visível e confirmado. Tom claro e direto, sem exagero ("incrível", "o melhor"). Sem emojis.',
  'Entre 120 e 700 caracteres. Devolva APENAS o texto da descrição.',
].join(' ');

export function mensagemDoUsuario(fatos) {
  return `FATOS CONFIRMADOS DO PRODUTO:\n${fatos.map((x) => `- ${x}`).join('\n')}\n\nEscreva a descrição seguindo as regras. As fotos do produto estão anexas.`;
}

// o que NUNCA pode aparecer no texto gerado: promessa, preço, origem interna, link
const PROIBIDO = [
  [/R\$|\breais\b|\bpre[cç]o\b/i, 'cita preço'],
  [/https?:\/\/|www\./i, 'tem link'],
  [/\bgarantia\b/i, 'promete garantia'],
  [/\bfrete\b/i, 'fala de frete'],
  [/\bcupom\b|\bdesconto\b|\bpromo[cç][aã]o\b/i, 'fala de desconto'],
  [/mercado\s*livre|\blote\b|\bamazon\b|\bshopee\b/i, 'cita origem interna'],
  [/\bnota fiscal\b|\bnf-?e?\b/i, 'promete nota fiscal'],
];

/**
 * O texto que a IA devolveu pode virar RASCUNHO?
 * @returns {{ok:boolean, texto:string, motivo?:string}}
 */
export function validarDescricaoGerada(resposta, { condicao = '' } = {}) {
  const texto = textoDaIA(resposta).replace(/\r/g, '').trim();
  if (!texto) return { ok: false, texto: '', motivo: 'ia_sem_texto' };
  if (/<[a-z][^>]*>/i.test(texto)) return { ok: false, texto, motivo: 'veio_html' };
  if (texto.length < MINIMO_GERADO) return { ok: false, texto, motivo: 'curto_demais' };
  if (texto.length > MAXIMO_GERADO) return { ok: false, texto, motivo: 'longo_demais' };
  for (const [re, motivo] of PROIBIDO) if (re.test(texto)) return { ok: false, texto, motivo };
  // "lacrado/novo" só se o cadastro disse que é novo — senão a IA estaria chutando o estado
  if (/\blacrad[oa]\b|\bna caixa\b/i.test(texto) && condicao !== 'novo') return { ok: false, texto, motivo: 'chutou_estado' };
  return { ok: true, texto };
}

/**
 * Texto EDITADO por gente antes de aprovar: o dono manda no tamanho e no estilo, mas erro da IA, HTML,
 * preço, link, garantia, frete e origem interna continuam barrados (a vitrine é pública).
 */
export function validarTextoEditado(texto) {
  const t = textoDaIA(texto).replace(/\r/g, '').trim();
  if (!t) return { ok: false, texto: '', motivo: 'ia_sem_texto' };
  if (/<[a-z][^>]*>/i.test(t)) return { ok: false, texto: t, motivo: 'veio_html' };
  for (const [re, motivo] of PROIBIDO) if (re.test(t)) return { ok: false, texto: t, motivo };
  return { ok: true, texto: t };
}

/** Descrição boa (gerada) → o que gravar. Texto puro com quebras de linha. */
export const paraGravar = (texto) => String(texto || '').trim();
