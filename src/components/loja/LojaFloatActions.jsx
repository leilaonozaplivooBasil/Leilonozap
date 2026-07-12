import React from 'react';
import { MessageCircle } from 'lucide-react';
import LivooMark from '@/components/livoo/LivooMark';
import ComparaiIcon from '@/assets/comparai-icon.png';

const SUPORTE_PHONE = '5521984072064';
// 🔗 Por ora o botão "Ao vivo" leva direto ao feed da Livoo Live.
// Depois que a conta da Leilão NoZap na Livoo for criada, é só trocar por ela.
const LIVOO_FEED = 'https://livoolive.com.br/app';

// Stack único de botões flutuantes à direita da loja (mesmo tamanho e espaçamento):
// Ao vivo (Livoo Live) · Comparai · Suporte (WhatsApp).
export default function LojaFloatActions() {
  const supTxt = encodeURIComponent('Olá! Preciso de ajuda na Loja Leilão NoZap.');
  const Label = ({ children }) => <span className="text-[10px] text-gray-200 font-semibold mt-0.5 drop-shadow text-center leading-none">{children}</span>;

  return (
    <div className="fixed right-4 bottom-5 z-50 flex flex-col items-center gap-3">
      {/* 1) Ao vivo — abre o feed da Livoo Live (padrão pulsante) */}
      <a href={LIVOO_FEED} target="_blank" rel="noreferrer" title="Ao vivo pela Livoo Live" className="flex flex-col items-center">
        <span
          className="relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: 'linear-gradient(135deg,#E91E83,#ff6b35)', boxShadow: '0 8px 24px rgba(233,30,131,.45)' }}
        >
          <span aria-hidden className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: '#E91E83' }} />
          <LivooMark size={26} plain className="relative text-white" />
        </span>
        <Label>Ao vivo</Label>
      </a>

      {/* 2) Comparai */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => window.dispatchEvent(new Event('openComparai'))}
          title="Comparai — compare o preço antes de comprar"
          className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 relative"
          style={{ boxShadow: '0 8px 24px rgba(37,99,235,.45)' }}
        >
          <img src={ComparaiIcon} alt="Comparai" className="w-full h-full object-cover rounded-full" />
          <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20" />
        </button>
        <Label>Comparai</Label>
      </div>

      {/* 3) Suporte (WhatsApp) */}
      <a href={`https://wa.me/${SUPORTE_PHONE}?text=${supTxt}`} target="_blank" rel="noreferrer" title="Suporte pelo WhatsApp" className="flex flex-col items-center">
        <span className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl flex items-center justify-center transition-transform hover:scale-110" style={{ boxShadow: '0 8px 24px rgba(34,197,94,.45)' }}>
          <MessageCircle className="w-7 h-7 text-white" />
        </span>
        <Label>Suporte</Label>
      </a>
    </div>
  );
}
