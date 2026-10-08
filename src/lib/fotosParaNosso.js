// 📷 FOTO DE FORA VIRA FOTO NOSSA — um lugar só (08/10/2026, DIR-207).
//
// A lição do LAVAJATO (02/09/2026): a loja mostrava foto de lavajato na
// "Torneira Gourmet" porque a imagem era servida por um comparador de preços
// que trocou o conteúdo. Desde então a tela de produto da gestão copia toda
// foto externa para o nosso Storage (copiarImagensParaNosso) antes de gravar.
// O editor do leilão e o buscador manual NÃO faziam isso. Agora as três
// pontas chamam esta função.
//
// Regra: foto que não conseguiu ser copiada NÃO entra pelo endereço de fora —
// guardar o link "porque a cópia falhou" é exatamente o bug.
import { plataforma } from '@/api/plataformaClient';
import { separarFotos } from '@/lib/imagemExterna';

/**
 * @param {string[]} urls
 * @param {string} descricao  usada no nome do arquivo
 * @returns {Promise<{fotos: string[], falharam: number}>}
 */
export async function trazerFotosParaNosso(urls, descricao = '') {
  const lista = (Array.isArray(urls) ? urls : []).filter((u) => typeof u === 'string' && u.trim());
  const { nossas, externas } = separarFotos(lista);
  if (!externas.length) return { fotos: nossas, falharam: 0 };
  try {
    let eu = null;
    try { eu = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { /* sem cache */ }
    const r = await plataforma.functions.invoke('copiarImagensParaNosso', { actorId: eu?.id || '', urls: externas, descricao });
    const d = r?.data || r;
    const copiadas = (d?.fotos || []).filter((f) => f && f.ok && f.url).map((f) => f.url);
    return { fotos: [...nossas, ...copiadas], falharam: externas.length - copiadas.length };
  } catch {
    return { fotos: nossas, falharam: externas.length };
  }
}
