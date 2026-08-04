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
      {/* PONTO 82 — sem amarelo: faixa discreta integrada ao clima da sala */}
      <div
        className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] sm:text-xs text-gray-400 text-center"
        style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
        <span>Estratégia de marketing — não é leilão oficial.</span>
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="underline font-semibold text-emerald-400 hover:text-emerald-300"
        >
          Ver termo
        </button>
      </div>
      {aberto && <TermoAdesaoModal modo="leitura" onClose={() => setAberto(false)} />}
    </>
  );
}