import { useEffect, useState } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { videoDoProduto } from '@/lib/videoDoProduto';

/**
 * useVideoDoLote — o vídeo de um leilão, herdado do produto ligado.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUE HERDAR EM VEZ DE CRIAR COLUNA NO LEILÃO (16/09/2026)
 * ══════════════════════════════════════════════════════════════════════════
 * Pedido do dono: vídeo do PS5 entre as fotos do leilão, "no mesmo padrão da
 * gestão de estoque (cola o link ou faz o upload)".
 *
 * Esse padrão já existe e está no ar desde a #372: `products.video_urls`, o
 * campo que cola link ou anexa arquivo, a lista branca (YouTube/Vimeo/arquivo
 * nosso) e o balde `videos-produtos`. Medido no banco em 16/09: os 57 leilões
 * ativos TÊM produto ligado e existente — 57 de 57. Então o leilão não precisa
 * de coluna nova: ele lê o vídeo do produto, e quem cadastra usa a MESMA tela
 * da Gestão de Estoque.
 *
 * Uma coluna `auctions.video_urls` só se justificaria para um vídeo DIFERENTE
 * do produto no mesmo item — hoje não existe esse caso.
 *
 * 🔴 NUNCA SEGURA A TELA. A página do leilão já renderiza sem isto; o vídeo
 * chega depois, como a contagem de lances já faz. Falha de rede aqui devolve
 * `null` e a galeria segue só com as fotos.
 */
export default function useVideoDoLote(auction) {
  const [video, setVideo] = useState(null);
  const produtoId = auction?.product_id || null;

  useEffect(() => {
    if (!produtoId) { setVideo(null); return undefined; }
    let vivo = true;
    (async () => {
      try {
        const achados = await plataforma.entities.Product.filter({ id: produtoId });
        const produto = Array.isArray(achados) ? achados[0] : null;
        // `videoDoProduto` é a MESMA régua da loja: host conhecido ou arquivo
        // nosso. Endereço fora da lista branca devolve null e não vira <iframe>.
        if (vivo) setVideo(videoDoProduto(produto));
      } catch {
        if (vivo) setVideo(null);
      }
    })();
    return () => { vivo = false; };
  }, [produtoId]);

  return video;
}
