import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { resumoDaDescricao } from '@/lib/descricaoDoLote';

/**
 * 📜 A descrição do lote na sala do leilão.
 *
 * Antes era um <p> dentro de uma caixa de 60px com `overflow: hidden`: três
 * linhas e o resto sumia calado. Na Bike Harley M4 (11/09/2026) o que sumia era
 * a última linha — "OBS: SEM O CARREGADOR" — justamente a informação que muda a
 * decisão de quem vai dar lance.
 *
 * Agora:
 *  • o texto encurtado tem botão "ver descrição completa";
 *  • a ressalva do final aparece SEMPRE, fechada ou aberta, em destaque;
 *  • as quebras de linha e os bullets do cadastro são respeitados
 *    (`whitespace-pre-line`), em vez de virarem um bloco só.
 *
 * @param {{texto?: string, sempreAberta?: boolean, className?: string}} props
 */
export default function DescricaoDoLote({ texto, sempreAberta = false, className = '' }) {
  const [aberta, setAberta] = useState(false);
  const { completo, resumo, aviso, cortou } = resumoDaDescricao(texto);

  if (!completo) return null;

  const mostrandoTudo = sempreAberta || aberta;
  // Aberto, o texto completo já inclui a linha de aviso — não repetir embaixo.
  const corpo = mostrandoTudo ? completo : resumo;

  return (
    <div className={`mb-3 ${className}`}>
      <p className="whitespace-pre-line break-words text-[13px] leading-relaxed text-gray-300">
        {corpo}
      </p>

      {/* 🔴 A ressalva nunca fica escondida atrás do "ver mais". */}
      {aviso && !mostrandoTudo && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10
                      px-2.5 py-1.5 text-[12px] font-bold leading-snug text-amber-300">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="break-words">{aviso}</span>
        </p>
      )}

      {cortou && !sempreAberta && (
        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          aria-expanded={aberta}
          className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold
                     text-emerald-400 hover:text-emerald-300"
        >
          {aberta ? 'ver menos' : 'ver descrição completa'}
          {aberta
            ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}
