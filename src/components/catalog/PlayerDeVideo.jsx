import React from 'react';
import { PlayCircle } from 'lucide-react';
import { videoDoProduto } from '@/lib/videoDoProduto';

/**
 * PlayerDeVideo — o vídeo do produto na página de venda.
 *
 * Duas formas de tocar, decididas pelo `tipo` que src/lib/videoDoProduto.js
 * devolve. Nunca pelo que a tela "acha" do endereço: quem valida host é a lista
 * branca, aqui só se escolhe a tag.
 *
 * 🔇 SEM AUTOPLAY E SEM SOM, DE PROPÓSITO. Vitrine que começa a falar sozinha
 * faz a pessoa fechar a aba antes de ver o preço — e, no celular, gasta a
 * franquia de dados de quem só queria ver a foto. `preload="metadata"` baixa
 * só o cabeçalho (duração e primeiro quadro) até alguém apertar o play.
 */
export default function PlayerDeVideo({ produto }) {
  const video = videoDoProduto(produto);
  if (!video) return null;

  return (
    <div className="mt-3" data-teste="player-do-video">
      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-gray-300">
        <PlayCircle className="w-4 h-4 text-emerald-400" />
        Vídeo do produto
      </div>
      <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-black">
        {video.tipo === 'arquivo' ? (
          <video
            src={video.embed}
            controls
            preload="metadata"
            playsInline
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <iframe
            src={video.embed}
            title="Vídeo do produto"
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}
