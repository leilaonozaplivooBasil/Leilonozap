import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// ↩️ BOTÃO VOLTAR ÚNICO DO SISTEMA (FASE 3).
// Antes cada tela tinha o seu (ou nenhum): umas com "← Voltar" simples, outras
// com "← Voltar ao Painel" de outro estilo, e várias sem saída nenhuma.
// Pílula discreta, toque mínimo de 44px, funciona no tema claro e no escuro.
//
// Volta para a página anterior. Quando não houver histórico (link direto,
// abrir do WhatsApp, PWA recém-aberto), cai no destino de segurança.
export default function BotaoVoltar({ texto = 'Voltar', destino = '/', tema = 'escuro', className = '' }) {
  const navigate = useNavigate();

  const voltar = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(destino);
  };

  const cor = tema === 'claro'
    ? 'bg-white border-nz-borda text-gray-600 hover:bg-nz-cinza-fundo hover:text-nz-verde'
    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white';

  return (
    <button
      type="button"
      onClick={voltar}
      aria-label={texto}
      className={`inline-flex h-11 items-center gap-2 px-4 rounded-full border text-sm font-medium transition-colors ${cor} ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {texto}
    </button>
  );
}