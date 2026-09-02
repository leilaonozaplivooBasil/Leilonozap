/**
 * imagemExterna (servidor) — as travas de quem BUSCA uma imagem de fora.
 *
 * Vive em api/_lib/ e não em src/lib/ de propósito: nenhuma rota deste projeto
 * importa de `src/`, e o vercel.json não configura isso. Import de dois níveis
 * já derrubou função em produção aqui (ver o cabeçalho de api/_lib/sessao.js).
 *
 * O lado do navegador tem o seu próprio src/lib/imagemExterna.js, com funções
 * DIFERENTES (ehExterna / separarFotos). Não há trecho repetido entre os dois —
 * o que o servidor precisa e o que a tela precisa não se cruzam.
 *
 * Contexto: em 02/09/2026 a loja mostrava um LAVAJATO no lugar de uma torneira,
 * porque a foto estava hospedada num comparador de preços que trocou a imagem.
 * Ver api/functions/copiarImagensParaNosso.js.
 */

// Esta rota recebe um endereço e o SERVIDOR vai buscá-lo. Sem trava, viraria um
// jeito de fazer o nosso servidor bater em endereço interno da infraestrutura
// (SSRF). Só http/https, e nada que aponte para dentro.
const HOSTS_PROIBIDOS = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|\[?::1\]?|172\.(1[6-9]|2\d|3[01])\.)/i;

/** @returns {{ok: boolean, motivo: string}} */
export function urlSeguraParaBuscar(url) {
  const s = String(url || '').trim();
  if (!s) return { ok: false, motivo: 'vazia' };
  let u;
  try { u = new URL(s); } catch { return { ok: false, motivo: 'endereco_invalido' }; }
  if (!/^https?:$/i.test(u.protocol)) return { ok: false, motivo: 'protocolo_nao_permitido' };
  if (HOSTS_PROIBIDOS.test(u.hostname)) return { ok: false, motivo: 'endereco_interno' };
  if (!u.hostname.includes('.')) return { ok: false, motivo: 'endereco_interno' };
  return { ok: true, motivo: 'ok' };
}

/**
 * Extensão a partir do tipo devolvido pela origem.
 * `null` = não é imagem que a gente aceite — e é o que impede uma página de
 * erro em HTML de virar "foto" do produto.
 */
export function extensaoDoTipo(contentType) {
  const t = String(contentType || '').toLowerCase().split(';')[0].trim();
  return ({
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
  })[t] || null;
}

/** Nome do arquivo na nossa pasta. Sem acento e sem caractere estranho. */
export function nomeDoArquivo(descricao, indice, extensao) {
  const base = String(descricao || 'produto')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .toLowerCase().slice(0, 60) || 'produto';
  return `${Date.now()}_${indice}_${base}.${extensao}`;
}
