import React from 'react';

/**
 * QuadroDeMidia — desenha UMA mídia da fileira dentro da moldura que já existe.
 *
 * Existe para que as duas portas da Loja Virtual (o modal que abre do card e a
 * página de link compartilhado) desenhem o vídeo do mesmo jeito. Antes, uma não
 * tinha vídeo nenhum e a outra tinha um player solto embaixo da foto — a mesma
 * loja se comportando de dois jeitos.
 *
 * 🔇 SEM AUTOPLAY E SEM SOM, a mesma régua do PlayerDeVideo e do MidiaDoLote:
 * vitrine que começa a falar sozinha faz a pessoa fechar a aba antes de ver o
 * preço, e no celular gasta a franquia de quem só queria ver a foto.
 * `preload="metadata"` baixa só duração e primeiro quadro até alguém dar play.
 *
 * `origem` decide a tag: arquivo nosso toca em <video>; YouTube e Vimeo em
 * <iframe>. Quem decidiu que o endereço é aceitável foi a lista branca de
 * `videoDoProduto`, muito antes de chegar aqui.
 */
export default function QuadroDeMidia({ midia, titulo, className = 'w-full h-full object-contain' }) {
  if (!midia) return null;

  if (midia.tipo === 'foto') {
    return <img src={midia.url} alt={titulo} className={className} />;
  }

  if (midia.origem === 'arquivo') {
    return (
      <video
        src={midia.embed}
        controls
        preload="metadata"
        playsInline
        className={className}
        data-teste="video-do-produto"
      />
    );
  }

  return (
    <iframe
      src={midia.embed}
      title={`Vídeo — ${titulo || 'produto'}`}
      className="absolute inset-0 h-full w-full"
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      data-teste="video-do-produto"
    />
  );
}
