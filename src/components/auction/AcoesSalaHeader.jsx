import React from 'react';
import { MessageCircle } from 'lucide-react';
import CompareAquiIcon from '@/assets/compareaqui-icon.webp';
import leilaSuporte from '@/assets/leila-suporte.webp';

const SUPORTE_PHONE = '5521984072064';

/**
 * PONTO 87 — CompareAQUI e Leila deixam de flutuar nas laterais da sala e viram
 * dois ícones compactos no cabeçalho, ao lado de favoritar/compartilhar/carteira.
 * Zero lógica: o CompareAQUI só dispara 'openComparai' (o CompareAquiButton
 * trigger="event" continua abrindo a comparação real) e a Leila abre o MESMO
 * link de WhatsApp já usado hoje.
 */
export default function AcoesSalaHeader() {
  const supTxt = encodeURIComponent('Olá! Preciso de ajuda na Loja Leilão NoZap.');

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('openComparai'))}
        aria-label="Comparar o preço no mercado"
        title="Comparar o preço no mercado"
        className="grid h-11 w-11 place-items-center rounded-full active:scale-95"
      >
        <img src={CompareAquiIcon} alt="CompareAQUI" className="h-8 w-8 rounded-full" loading="lazy" />
      </button>

      <a
        href={`https://wa.me/${SUPORTE_PHONE}?text=${supTxt}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Fale com a Leila no WhatsApp"
        title="Fale com a Leila — Suporte no WhatsApp"
        className="grid h-11 w-11 place-items-center rounded-full active:scale-95"
      >
        <span className="relative block h-8 w-8">
          <span
            className="block h-8 w-8 overflow-hidden rounded-full border border-green-400"
            style={{ background: 'radial-gradient(circle at 50% 30%, #14324a, #0b1018)' }}
          >
            <img src={leilaSuporte} alt="Leila — Suporte" className="h-full w-full object-cover object-top" loading="lazy" />
          </span>
          <span
            className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full border bg-green-500"
            style={{ borderColor: '#0A1611' }}
          >
            <MessageCircle className="h-2 w-2 text-white" />
          </span>
        </span>
      </a>
    </div>
  );
}