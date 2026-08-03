import React, { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import LivooMarca from "@/components/liveshop/LivooMarca";

// Endereço público da Livoo Live — usado apenas como último recurso (link discreto),
// porque o site institucional recusa ser exibido dentro de outra página.
const LIVOO_LIVE = "https://livoolive.com.br";

// Normaliza links comuns pro formato que aceita ser embutido na página.
const paraEmbed = (url) => {
  if (!url) return null;
  if (url.includes("youtube.com/watch")) return url.replace("watch?v=", "embed/");
  if (url.includes("youtu.be/")) return url.replace("youtu.be/", "www.youtube.com/embed/");
  return url;
};

// Player da live embutido NA página: a transmissão roda aqui dentro, nunca manda
// o usuário pra fora. A URL vem da sessão configurada (LiveSession.stream_url).
export default function LivooPlayer({ streamUrl, pauseImageUrl, isPaused }) {
  const embed = paraEmbed(streamUrl);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => setFalhou(false), [embed]);

  const podeTocar = !!embed && !falhou && !isPaused;

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-nz-cinza-fundo border border-livoo-rosa/25 livoo-brilho-forte">
      {podeTocar && (
        <iframe
          src={embed}
          title="Transmissão ao vivo Livoo Live"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          onError={() => setFalhou(true)}
        />
      )}

      {isPaused && pauseImageUrl && (
        <img src={pauseImageUrl} alt="Intervalo da live" className="absolute inset-0 h-full w-full object-cover" />
      )}

      {!podeTocar && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center livoo-superficie">
          <div className="livoo-veu absolute inset-0" aria-hidden="true" />
          <div className="relative flex flex-col items-center gap-4">
            <LivooMarca halo />
            <div>
              <p className="text-nz-tinta font-bold text-lg">
                {isPaused ? "Live pausada — voltamos em breve" : "Preparando a transmissão…"}
              </p>
              <p className="text-nz-tinta-fraca text-sm mt-1">
                {isPaused
                  ? "Fica de olho: já retomamos os arremates."
                  : "A live aparece aqui mesmo, sem sair do Leilão NoZap."}
              </p>
            </div>
            {!isPaused && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="min-h-[44px] bg-white border-livoo-rosa/40 text-livoo-rosa hover:bg-livoo-rosa hover:text-white"
              >
                <a href={LIVOO_LIVE} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" /> Ver na Livoo Live
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}