/**
 * imagemExterna — quando a foto de um produto NÃO é nossa, e se dá para copiá-la.
 *
 * 🔴 POR QUE ESTE ARQUIVO EXISTE (02/09/2026)
 * O dono mandou o print: a "Torneira Gourmet" aparecia na loja com foto de um
 * LAVAJATO. E o "TDS medidor pureza água", logo ao lado, mostrava o MESMO
 * lavajato. Dois produtos diferentes, a mesma imagem errada.
 *
 * A causa não era o cadastro. A primeira foto dos dois estava hospedada em
 * `i.zst.com.br` — um comparador de preços. O endereço deixou de servir o
 * produto e passou a servir outra coisa. Ninguém aqui tem controle sobre isso;
 * eles podem trocar de novo amanhã.
 *
 * Retrato de 02/09 na loja: 513 fotos no nosso servidor (271 produtos) e
 * 61 fotos hospedadas fora, sendo a CAPA de 25 produtos.
 *
 * De onde vinha: as duas importações automáticas do cadastro de produto
 * (`extractMLImages` e `extractGoogleShoppingImages`) gravavam o endereço de
 * fora direto em `image_urls`. Nada no sistema copiava a imagem para cá.
 *
 * A cópia precisa ser feita NO SERVIDOR: o navegador não consegue buscar imagem
 * de outro domínio (CORS), e o `Core.UploadFile` de hoje sobe a partir de um
 * arquivo que o navegador já tem em mãos.
 */

/** Onde as nossas imagens moram. */
export const NOSSO_HOST = 'supabase.co';

/** A foto está hospedada fora do nosso servidor? */
export function ehExterna(url) {
  const s = String(url || '').trim();
  if (!s) return false;
  if (s.startsWith('data:') || s.startsWith('blob:')) return false;  // já embutida
  if (s.startsWith('/')) return false;                               // caminho nosso
  if (!/^https?:\/\//i.test(s)) return false;                        // não é endereço
  try { return !new URL(s).hostname.endsWith(NOSSO_HOST); } catch { return false; }
}

/** Separa uma lista de fotos entre as nossas e as de fora, preservando a ordem. */
export function separarFotos(urls) {
  const lista = Array.isArray(urls) ? urls.filter((u) => String(u || '').trim()) : [];
  return { nossas: lista.filter((u) => !ehExterna(u)), externas: lista.filter(ehExterna) };
}

// As travas de quem BUSCA a imagem (endereço seguro, tipo aceito, nome do
// arquivo) vivem em api/_lib/imagemExterna.js, não aqui: nenhuma rota deste
// projeto importa de `src/`, e import de dois níveis já derrubou função em
// produção (ver o cabeçalho de api/_lib/sessao.js). Os dois arquivos têm
// funções DIFERENTES — não há nada duplicado entre eles.
