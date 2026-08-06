import React from 'react';
import { Play, Video } from 'lucide-react';

// 🎬 SLOT DE VÍDEO DA OPERAÇÃO — moldura 16:9 preta com borda dourada fina.
// O player só é criado no toque (posterizado antes), pra não pesar o mobile.
// Sem URL, mostra "Vídeo em breve" de forma elegante — nunca parece erro.
export default function SlotVideoOperacao({ titulo, legenda, url, poster }) {
  const [tocando, setTocando] = React.useState(false);

  return (
    <figure className="mt-4 border border-pc-ouro/25 bg-black">
      <div className="relative aspect-video w-full overflow-hidden">
        {tocando && url ? (
          <video
            src={url}
            poster={poster || undefined}
            controls
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            {poster && (
              <img
                src={poster}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
            )}
            {/* grade tech discreta no fundo do slot vazio */}
            <span
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(201,165,92,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,165,92,0.5) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />
            {url ? (
              <button
                type="button"
                onClick={() => setTocando(true)}
                aria-label={`Assistir: ${titulo}`}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-pc-ouro/60 bg-pc-preto-2/80">
                  <Play className="h-6 w-6 text-pc-ouro" strokeWidth={2} />
                </span>
                <span className="px-4 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-pc-tinta">
                  {titulo}
                </span>
              </button>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-pc-borda bg-pc-preto-2">
                  <Video className="h-5 w-5 text-pc-tinta-fraca" strokeWidth={1.8} />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pc-tinta-fraca">
                  {titulo}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-pc-ouro/70">
                  Vídeo em breve
                </span>
              </div>
            )}
          </>
        )}
      </div>
      {legenda && (
        <figcaption className="border-t border-pc-borda px-3 py-2 text-[11px] leading-relaxed text-pc-tinta-fraca">
          {legenda}
        </figcaption>
      )}
    </figure>
  );
}