import React, { useState } from 'react';
import { Play, Image as Icone } from 'lucide-react';

/**
 * MidiaDoLote — a foto do lote na sala de leilão, com o vídeo atrás dela.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUE TROCA NO LUGAR, EM VEZ DE ENTRAR COMO SEGUNDO BLOCO
 * ══════════════════════════════════════════════════════════════════════════
 * A sala de leilão NÃO tem carrossel: ela desenha `image_urls[0]` numa caixa
 * de altura fixa (200px no painel, 220px na folha do celular). Empilhar um
 * player embaixo empurraria preço, cronômetro e o botão de lance — na tela em
 * que a pessoa está disputando, com o relógio correndo. Não se mexe no funil
 * do lance pra caber uma mídia.
 *
 * Então o vídeo ocupa a MESMA caixa: a foto ganha um selo "▶ vídeo", o toque
 * troca, e o botão "foto" volta. Zero mudança de layout, e quem não quiser
 * vídeo nunca vê vídeo.
 *
 * 🔇 Sem autoplay e sem som (mesma régua do PlayerDeVideo da loja): na sala de
 * leilão há narração e aviso sonoro de lance — um vídeo falando por cima seria
 * pior que não ter vídeo. `preload="metadata"` não baixa o arquivo até alguém
 * apertar o play.
 */
export default function MidiaDoLote({ imagemUrl, titulo, video, className = '', aoErrarImagem }) {
  const [mostrandoVideo, setMostrandoVideo] = useState(false);

  const selo = (rotulo, Icon, aoClicar) => (
    <button
      type="button"
      onClick={aoClicar}
      data-teste={`selo-${rotulo}`}
      className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm hover:bg-black/85"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.6} />
      {rotulo}
    </button>
  );

  // sem vídeo, o componente é exatamente o <img> que estava aqui antes
  if (!video) {
    return <img src={imagemUrl} alt={titulo} className={className} onError={aoErrarImagem} />;
  }

  return (
    <div className="relative" data-teste="midia-do-lote">
      {mostrandoVideo ? (
        <>
          {video.tipo === 'arquivo' ? (
            <video src={video.embed} controls preload="metadata" playsInline className={className} data-teste="video-do-lote" />
          ) : (
            <iframe
              src={video.embed}
              title={`Vídeo — ${titulo}`}
              className={className}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              data-teste="video-do-lote"
            />
          )}
          {selo('foto', Icone, () => setMostrandoVideo(false))}
        </>
      ) : (
        <>
          <img src={imagemUrl} alt={titulo} className={className} onError={aoErrarImagem} />
          {selo('vídeo', Play, () => setMostrandoVideo(true))}
        </>
      )}
    </div>
  );
}
