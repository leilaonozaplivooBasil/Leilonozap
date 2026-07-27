import React, { useEffect, useState } from 'react';
import { fmtBR } from '@/lib/money';
import { DollarSign } from 'lucide-react';

export default function FloatingBalance({ balance }) {
  const [imageError, setImageError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <>
      <div className="floating-balance-amulet">
        <div className="amulet-content">
          {!imageError ? (
            <img 
              src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/24e65328b_image.png" 
              alt="Amuleto Valora" 
              className="amulet-coin"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="amulet-coin-fallback">
              <DollarSign className="w-5 h-5" />
            </div>
          )}
          <span className="amulet-balance">R$ {fmtBR(balance)}</span>
        </div>
      </div>
      <style>{`
        .floating-balance-amulet {
          position: fixed;
          z-index: 50;
          animation: enter-amulet 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        
        /* 📱 MOBILE - Posiciona no topo, não sobrepõe conteúdo */
        @media (max-width: 1023px) {
          .floating-balance-amulet {
            top: 80px;
            right: 16px;
          }
        }
        
        /* 💻 DESKTOP - Posiciona no canto superior esquerdo */
        @media (min-width: 1024px) {
          .floating-balance-amulet {
            top: 80px;
            left: 20px;
          }
        }

        .amulet-content {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(17, 24, 39, 0.95);
          padding: 10px 14px;
          border-radius: 999px;
          border: 2px solid #1DB24A;
          box-shadow: 0 4px 20px rgba(29, 178, 74, 0.4), 0 0 30px rgba(16, 185, 129, 0.3);
          backdrop-filter: blur(12px);
          animation: float-amulet 4s ease-in-out infinite, pulse-glow 2s ease-in-out infinite;
        }

        .amulet-coin {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          animation: spin-coin 10s linear infinite;
          filter: drop-shadow(0 0 10px rgba(29, 178, 74, 0.6));
        }
        
        .amulet-coin-fallback {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
        }

        .amulet-balance {
          color: white;
          font-weight: 700;
          font-size: 18px;
          text-shadow: 0 0 10px #1DB24A, 0 2px 4px rgba(0,0,0,0.5);
          letter-spacing: 0.5px;
        }

        @keyframes enter-amulet {
          from {
            opacity: 0;
            transform: scale(0.5) translateX(-80px) rotate(-180deg);
          }
          to {
            opacity: 1;
            transform: scale(1) translateX(0) rotate(0deg);
          }
        }

        @keyframes float-amulet {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes spin-coin {
          from {
            transform: rotateY(0deg);
          }
          to {
            transform: rotateY(360deg);
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(29, 178, 74, 0.4), 0 0 30px rgba(16, 185, 129, 0.3);
          }
          50% {
            box-shadow: 0 4px 25px rgba(29, 178, 74, 0.6), 0 0 40px rgba(16, 185, 129, 0.5);
          }
        }
      `}</style>
    </>
  );
}