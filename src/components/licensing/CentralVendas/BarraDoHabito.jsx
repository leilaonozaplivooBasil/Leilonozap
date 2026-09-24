import React from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';

// ◀ ▶ A BARRA DO HÁBITO ABERTO — o que entra no lugar da grade (24/09/2026)
//
// Dono: "quando eu clicar no Sonho, o quadro do Compromisso, Lista, Contato,
// Apresentação, Acompanhamento, Verificação e Duplicação precisa sumir... a
// ideia funciona igual a lupa da loja virtual quando eu procuro um produto...
// e me dando a possibilidade de ir para frente e para trás."
//
// Três coisas e nada mais: voltar pro índice, o anterior, o seguinte. Um
// quarto elemento aqui seria recriar, em miniatura, o problema que esta tela
// veio resolver.
//
// 🔁 O ‹ › DÁ A VOLTA de propósito (o 8 leva ao 1, o 1 leva ao 8). Um seletor
// que apaga na ponta faz a pessoa achar que travou — e, no método, o ciclo
// realmente recomeça: da Duplicação se volta pro Sonho.
export default function BarraDoHabito({ numero = 1, total = 8, aoVoltar, aoAnterior, aoProximo }) {
  return (
    <div className="flex items-center justify-between gap-2" data-teste="barra-do-habito">
      <button
        type="button"
        onClick={aoVoltar}
        data-teste="voltar-aos-habitos"
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/[0.05] px-3.5 py-2.5 text-[13px] font-bold text-white/70 hover:text-white transition-all"
      >
        <LayoutGrid className="w-4 h-4" /> os 8 hábitos
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={aoAnterior}
          data-teste="habito-anterior"
          aria-label="hábito anterior"
          className="rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/[0.05] p-2.5 text-white/60 hover:text-white transition-all"
        ><ChevronLeft className="w-4 h-4" /></button>
        {/* o "03 / 08" não é enfeite: é ele que diz que existem oito e onde
            se está, agora que as outras sete não estão mais na tela */}
        <span className="text-[11px] font-bold tracking-[0.18em] text-white/35 tabular-nums px-1">
          {String(numero).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={aoProximo}
          data-teste="habito-proximo"
          aria-label="próximo hábito"
          className="rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/[0.05] p-2.5 text-white/60 hover:text-white transition-all"
        ><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
