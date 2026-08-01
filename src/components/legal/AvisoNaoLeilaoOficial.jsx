import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import TermoAdesaoModal from '@/components/legal/TermoAdesaoModal';

/**
 * Faixa permanente na sala de leilão: deixa claro que é estratégia de marketing
 * e não leilão oficial, com acesso ao termo completo (só leitura).
 */
export default function AvisoNaoLeilaoOficial() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <div className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/25 text-[11px] sm:text-xs text-amber-300 text-center">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Estratégia de marketing — não é leilão oficial.</span>
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="underline font-semibold text-amber-200 hover:text-white"
        >
          Ver termo
        </button>
      </div>
      {aberto && <TermoAdesaoModal modo="leitura" onClose={() => setAberto(false)} />}
    </>
  );
}