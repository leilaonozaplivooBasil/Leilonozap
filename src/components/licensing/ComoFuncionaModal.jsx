import React from 'react';
import { X, HelpCircle, BookOpen } from 'lucide-react';
import TiraDuvidas from '@/components/licensing/TiraDuvidas';
import { useSegurarCamada } from '@/hooks/useCamadaModal';

// 🎓❓ COMO FUNCIONA, de qualquer tela (09/09/2026).
//
// Dono, ao vivo: "quando ela tiver dúvida ela vai no Como Funciona pra
// dominar a plataforma, ficar independente sem depender do TEC nem do
// fundador... a plataforma tem que ser uma professora dela mesma foda."
//
// O Guia do Usuário já existia — mas só dentro da própria aba dele. Fazer a
// pessoa perdida em ADM X-Game NAVEGAR até achar a aba certa antes de poder
// perguntar é o oposto de "professora sempre ali". Este modal é a resposta
// rápida: abre de cima do botão "Como Funciona" (fixo em toda tela da Top
// College), traz o MESMO Tira Dúvidas de sempre — já sabendo em qual tela a
// pessoa está perdida, pelo `pagina` — e deixa um link pra quem quiser o guia
// completo dos 8 Hábitos.
//
// 🪟 useSegurarCamada(): os outros flutuantes (X-Music, Leila) já sabem
// sumir quando um modal está na frente — este modal se registra do mesmo
// jeito, pra não competir por atenção com o resto da tela.
export default function ComoFuncionaModal({ usuario, pagina, onFechar, onAbrirGuia }) {
  useSegurarCamada();
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={onFechar}>
      <div
        className="w-full max-w-lg rounded-2xl border border-white/12 bg-[var(--xeos-preto)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-teste="como-funciona-modal"
      >
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" /> Como Funciona
            </p>
            <p className="text-white/60 text-[12px] mt-0.5">
              {pagina ? `Você está em: ${pagina}` : 'Pergunte do seu jeito — a resposta vem na hora.'}
            </p>
          </div>
          <button type="button" onClick={onFechar} className="shrink-0 rounded-full p-1.5 text-white/45 hover:bg-white/10 hover:text-white" data-teste="como-funciona-fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 sm:px-5 py-4 space-y-3">
          <TiraDuvidas usuario={usuario} pagina={pagina || 'Top College'} />
          <button
            type="button"
            onClick={onAbrirGuia}
            data-teste="como-funciona-ver-guia"
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-[12px] font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white"
          >
            <BookOpen className="w-3.5 h-3.5" /> Ver o guia completo — os 8 Hábitos, quem é quem, e mais
          </button>
        </div>
      </div>
    </div>
  );
}
