import { videoDoProduto } from './videoDoProduto.js';

/**
 * midiasDoProduto — a fileira de mídias de um produto: as fotos, e o vídeo no fim.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUE ISTO VIROU UM LUGAR SÓ (17/09/2026)
 * ══════════════════════════════════════════════════════════════════════════
 * Pedido do dono: o vídeo entra no carrossel de imagens dos produtos em
 * destaque, nas duas páginas.
 *
 * A montagem já existia, escrita à mão dentro de `src/pages/AuctionDetails.jsx`
 * pela #378 — e lá ela custou um bug: `videoDoProduto` devolve um objeto com
 * `tipo: 'youtube'|'vimeo'|'arquivo'`, e espalhá-lo DEPOIS de `tipo: 'video'`
 * sobrescrevia o discriminador; o slide de vídeo simplesmente não renderizava.
 * Copiar aquele bloco para mais duas telas seria copiar a armadilha junto.
 *
 * Aqui o objeto é montado campo a campo, então não há o que sobrescrever:
 *   { tipo: 'foto',  url }
 *   { tipo: 'video', origem: 'youtube'|'vimeo'|'arquivo', embed }
 *
 * `origem` é o que decide <video> ou <iframe>. `tipo` é o que decide foto ou
 * vídeo. Os dois nunca disputam o mesmo nome.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * O VÍDEO VAI NO FIM, NUNCA NA CAPA
 * ══════════════════════════════════════════════════════════════════════════
 * Mesmo padrão do Mercado Livre e da Amazon, e a mesma decisão que a #378 já
 * tomou: a capa é a foto — é ela que carrega rápido, é ela que aparece na busca
 * e no compartilhamento. O vídeo é o detalhe de quem já parou para olhar.
 *
 * Quem valida host continua sendo a lista branca de `videoDoProduto`. Endereço
 * fora dela não chega aqui, e portanto nunca vira <iframe>.
 */
export function midiasDoProduto(produto) {
  const fotos = Array.isArray(produto?.image_urls) ? produto.image_urls : [];
  const linha = [];
  for (const url of fotos) {
    if (typeof url === 'string' && url.trim()) linha.push({ tipo: 'foto', url: url.trim() });
  }
  const video = videoDoProduto(produto);
  if (video) linha.push({ tipo: 'video', origem: video.tipo, embed: video.embed });
  return linha;
}

/** Quantas fotos há na fileira — o que o "ampliar" e a capa continuam usando. */
export function fotosDaFileira(midias) {
  return (Array.isArray(midias) ? midias : []).filter((m) => m && m.tipo === 'foto');
}
