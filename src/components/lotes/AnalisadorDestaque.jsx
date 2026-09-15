// ⭐ CARTÃO-DESTAQUE DO ANALISADOR — o mesmo selo do "Avaliador Inteligente de
// Leilões" (pill + título em degradê azul/índigo), levando para /AnaliseDeLotes.
//
// Dono (15/09/2026): "quero que ele tenha um destaque como o analisador de
// leilão. Na visão geral ele já tem até um lugar, mas está todo branco."
// O que ficava branco era uma CÓPIA inteira do analisador montada dentro do
// Estoque de Lotes (tema claro do painel repinta bg-gray-*/text-white). Aqui
// as cores são fixas (hex + estilo inline), então o cartão fica escuro em
// qualquer tema, e o analisador passa a existir num lugar só.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BarChart3, ArrowRight, FileSpreadsheet } from 'lucide-react';

const DEGRADE = { backgroundImage: 'linear-gradient(135deg, #93c5fd, #818cf8, #a855f7)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };

export default function AnalisadorDestaque({ className = '' }) {
  const navigate = useNavigate();
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-[#30363d] bg-[#0d1117] p-5 sm:p-6 ${className}`} style={{ color: '#e6edf3' }}>
      <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full pointer-events-none" style={{ background: 'rgba(59,130,246,0.14)', filter: 'blur(80px)' }} />
      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full border border-[#30363d] bg-[#161b22]">
            <BarChart3 size={15} style={{ color: '#60a5fa' }} />
            <span className="text-[11px] font-semibold tracking-wide" style={{ color: '#cbd5e1' }}>AVALIADOR INTELIGENTE DE LEILÕES</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight pb-0.5" style={DEGRADE}>Analisador de Lotes</h2>
          <p className="text-sm mt-1 max-w-2xl" style={{ color: '#8b949e' }}>
            Importe a planilha do leilão (Mercado Livre ou Casa &amp; Vídeo) e veja score, custo por unidade, ticket por grade e a lista completa dos itens.
            De lá você envia para o estoque, publica no Marketplace ou nas Oportunidades do Dia.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(createPageUrl('AnaliseDeLotes'))}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold min-h-[44px] shadow-lg transition-transform hover:-translate-y-0.5"
          style={{ backgroundImage: 'linear-gradient(90deg, #2563eb, #4f46e5)', color: '#ffffff' }}
        >
          <FileSpreadsheet size={16} /> Abrir Analisador <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
