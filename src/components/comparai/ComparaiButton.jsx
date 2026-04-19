import React, { useState } from 'react';
import ComparaiModal from './ComparaiModal';

export default function ComparaiButton({ auction, mode }) {
  const [showModal, setShowModal] = useState(false);

  if (!auction) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="comparai-button-position z-50 w-16 h-16 rounded-full shadow-2xl shadow-blue-500/50 transition-all duration-300 hover:scale-110 p-0 border-0 bg-transparent cursor-pointer animate-float"
        title="Comparar Preços com Comparai"
      >
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/d36767bcd_image.png"
          alt="Comparai"
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