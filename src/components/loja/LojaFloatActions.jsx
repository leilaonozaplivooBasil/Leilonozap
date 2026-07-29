import React from 'react';
import { MessageCircle } from 'lucide-react';
import CompareAquiIcon from '@/assets/compareaqui-icon.webp';
import leilaSuporte from '@/assets/leila-suporte.webp';
import useScrollDrift from '@/hooks/useScrollDrift';

const SUPORTE_PHONE = '5521984072064';
// 🔗 Por ora o botão "Ao vivo" leva direto ao feed da Livoo Live.
// Depois que a conta da Leilão NoZap na Livoo for criada, é só trocar por ela.
const LIVOO_FEED = 'https://livoolive.com.br/app';

// Stack único de botões flutuantes da loja: CompareAQUI (esquerda) e Suporte Leila (direita).
// 📱 MOBILE: precisam acompanhar a rolagem de forma FLUIDA — colados à viewport (fixed),
// subindo junto com o dedo, nunca "parados" num ponto da página. O translateZ(0) força
// compositing na GPU (iOS Safari engasga o fixed durante o recolhimento da barra de URL)
// e o env(safe-area-inset-bottom) mantém os botões acima da home bar do iPhone/PWA.
export default function LojaFloatActions() {
  const supTxt = encodeURIComponent('Olá! Preciso de ajuda na Loja Leilão NoZap.');
  const Label = ({ children }) => <span className="text-[9px] sm:text-[10px] text-gray-200 font-semibold mt-0.5 drop-shadow text-center leading-none">{children}</span>;

  // 🌊 Flutuação magnética com a rolagem (pedido do Gabriel 26/07, TODAS as telas):
  // página descendo → os botões SOBEM; página subindo → eles DESCEM; parou de rolar
  // → assentam de volta. Lógica compartilhada em useScrollDrift.
  const driftCls = useScrollDrift();

  return (
    <>
      <style>{`
        @media (max-width: 639px) {
          .loja-float { bottom: calc(6rem + env(safe-area-inset-bottom, 0px)); }
        }
      `}</style>
      {/* CompareAQUI — canto ESQUERDO inferior (rebranding oficial Heloim 23/07) */}
      <div className={`loja-float ${driftCls} fixed left-3 bottom-24 sm:left-4 sm:bottom-24 z-50 flex flex-col items-center`}>
        <button
          onClick={() => window.dispatchEvent(new Event('openComparai'))}
          title="CompareAQUI — compare o preço antes de comprar"
          className="w-11 h-11 sm:w-14 sm:h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 relative"
          style={{ boxShadow: '0 8px 24px rgba(37,99,255,.45)' }}
        >
          <img src={CompareAquiIcon} alt="CompareAQUI" className="w-full h-full object-cover rounded-full" />
          <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20" />
        </button>
        <Label>CompareAQUI</Label>
      </div>

      {/* Suporte com a Leila (avatar 3D) — canto DIREITO inferior. Animado pra chamar clique.
          O 'Ao vivo' flutuante foi removido; a live fica no botão 'AO VIVO AGORA' do topo. */}
      <style>{`
        @keyframes leilaBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        .leila-bob { animation: leilaBob 2.6s ease-in-out infinite; }
        @media (prefers-reduced-motion:reduce){ .leila-bob{animation:none} }
      `}</style>
      <div className={`loja-float ${driftCls} fixed right-3 bottom-24 sm:right-4 sm:bottom-24 z-50 flex flex-col items-center gap-3`}>
        <a href={`https://wa.me/${SUPORTE_PHONE}?text=${supTxt}`} target="_blank" rel="noreferrer" title="Fale com a Leila — Suporte no WhatsApp" className="group flex flex-col items-center">
          <span className="leila-bob relative block">
            {/* anel pulsante verde pra sinalizar que é clicável */}
            <span aria-hidden className="absolute inset-0 rounded-full animate-ping opacity-30 bg-green-400" />
            <span className="relative block w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-green-400 shadow-2xl transition-transform group-hover:scale-110" style={{ boxShadow: '0 10px 28px rgba(34,197,94,.5)', background: 'radial-gradient(circle at 50% 30%, #14324a, #0b1018)' }}>
              <img src={leilaSuporte} alt="Leila — Suporte" className="w-full h-full object-cover object-top" loading="lazy" />
            </span>
            {/* selo WhatsApp */}
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500 border-2 grid place-items-center" style={{ borderColor: '#0b1018' }}>
              <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
            </span>
          </span>
          <Label>Fale com a Leila</Label>
        </a>
      </div>
    </>
  );
}