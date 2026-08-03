import React, { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import LivooMarca from "@/components/liveshop/LivooMarca";

// Player da live embutido NA página (nunca manda o usuário pra fora).
// A URL vem da configuração da sessão (LiveSession.stream_url) — nada hardcoded.
export default function LivooPlayer({ streamUrl, pauseImageUrl, isPaused }) {
  const [erro, setErro] = useState(false);
  const embed = streamUrl?.includes("youtube.com") ? streamUrl.replace("watch?v=", "embed/") : streamUrl;

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-black border border-livoo-rosa/25 shadow-2xl">
      {isPaused && pauseImageUrl ? (
        <>
          <img src={pauseImageUrl} alt="Intervalo da live" className="w-full h-full object-cover" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-5 py-2 backdrop-blur">
            <p className="text-white text-sm font-bold">Live pausada — voltamos em breve</p>
          </div>
        </>
      ) : embed && !erro ? (
        <iframe
          src={embed}
          title="Transmissão ao vivo Livoo Live"
          className="w-full h-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          onError={() => setErro(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-4 text-center bg-livoo-vinho">
          <LivooMarca />
          <div>
            <p className="text-white font-bold text-lg">
              {erro ? "Não foi possível carregar a transmissão" : "Transmissão em breve…"}
            </p>
            <p className="text-white/60 text-sm mt-1">
              {erro ? "Tente novamente ou abra a live em outra aba." : "Fica de olho: a próxima live já já começa."}
            </p>
          </div>
          {erro && embed && (
            <Button asChild variant="outline" className="bg-transparent border-livoo-rosa/50 text-white hover:bg-livoo-rosa hover:text-white">
              <a href={embed} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" /> Abrir em nova aba
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}