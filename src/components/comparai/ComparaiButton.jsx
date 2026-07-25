import React, { useState, useEffect } from 'react';
import ComparaiModal from './ComparaiModal';
import CompareAquiIcon from '@/assets/compareaqui-icon.webp';

export default function ComparaiButton({ auction, mode, trigger }) {
  const [showModal, setShowModal] = useState(false);

  // trigger="event": NÃO renderiza botão próprio — a sala de leilão usa o botão
  // CompareAQUI de baixo (LojaFloatActions) e este componente só serve o modal
  // com a comparação REAL do produto do leilão (pedido Gabriel 25/07: um botão só).
  const isEventTriggered = trigger === 'event';
  useEffect(() => {
    if (!isEventTriggered) return undefined;
    const open = () => setShowModal(true);
    window.addEventListener('openComparai', open);
    return () => window.removeEventListener('openComparai', open);
  }, [isEventTriggered]);

  if (!auction) return null;

  if (isEventTriggered) {
    return showModal ? (
      <ComparaiModal
        auction={auction}
        isProduct={mode === 'catalog'}
        onClose={() => setShowModal(false)}
      />
    ) : null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="comparai-button-position z-50 w-16 h-16 rounded-full shadow-2xl shadow-blue-500/50 transition-all duration-300 hover:scale-110 p-0 border-0 bg-transparent cursor-pointer animate-float"
        title="CompareAQUI — compare preços"
      >
        <img
          src={CompareAquiIcon}
          alt="CompareAQUI"
          className="w-full h-full object-cover rounded-full"
        />
        
        <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></div>
      </button>

      {showModal && (
        <ComparaiModal 
          auction={auction} 
          isProduct={mode === 'catalog'}
          onClose={() => setShowModal(false)} 
        />
      )}

      <style>{`
        /* 📱 MOBILE - Posiciona mais acima para não sobrepor o lance mínimo */
        .comparai-button-position {
          position: fixed;
          bottom: 180px;
          left: 6px;
        }
        
        /* 💻 DESKTOP - Posição mais alta também */
        @media (min-width: 1024px) {
          .comparai-button-position {
            bottom: 120px;
            left: 24px;
          }
        }
        
        @keyframes float-comparai {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float-comparai 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}