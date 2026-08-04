import React, { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import FavoriteButton from '@/components/recommendations/FavoriteButton';

/**
 * PONTO 91 — Favoritar e Compartilhar saem da linha do cronômetro e sobem para a
 * barra do site (entre a logo e a Carteira), só na sala de leilão.
 * Zero lógica de negócio: a sala publica o evento 'salaAcoes' com o id do leilão
 * e do usuário, e o compartilhar apenas dispara 'salaCompartilhar' — quem executa
 * o compartilhamento continua sendo a própria sala (handleShare).
 */
export default function AcoesTopoSala() {
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    const onCtx = (e) => setCtx(e.detail || null);
    window.addEventListener('salaAcoes', onCtx);
    // pede o contexto caso a sala já tenha montado antes desta barra
    window.dispatchEvent(new Event('salaAcoesPedido'));
    return () => window.removeEventListener('salaAcoes', onCtx);
  }, []);

  if (!ctx?.auctionId) return null;

  return (
    <div className="flex items-center gap-1 mr-2 sm:mr-3">
      {ctx.userId && (
        <FavoriteButton
          auctionId={ctx.auctionId}
          userId={ctx.userId}
          size="md"
          className="bg-transparent border-none min-h-[44px] min-w-[44px]"
        />
      )}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('salaCompartilhar'))}
        aria-label="Compartilhar este leilão"
        title="Compartilhar este leilão"
        className="grid h-11 w-11 place-items-center rounded-full text-white/85 active:scale-95 hover:text-white"
      >
        <Share2 className="h-5 w-5" />
      </button>
    </div>
  );
}