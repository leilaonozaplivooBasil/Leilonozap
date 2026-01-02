import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuctioneerFloat({ phase, message, onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Fase 4 (VENDIDO) fica mais tempo
    const duration = phase === 4 ? 4000 : 5000;
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 500);
    }, duration);

    return () => clearTimeout(timer);
  }, [onComplete, phase, message]);

  const phaseConfig = {
    1: {
      balloonBg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
      balloonBorder: 'border-yellow-600',
      balloonText: 'text-yellow-900',
      balloonShadow: 'shadow-2xl shadow-yellow-500/40',
      intensity: 'normal',
      hammerIcon: '🔨'
    },
    2: {
      balloonBg: 'bg-gradient-to-br from-orange-50 to-orange-100',
      balloonBorder: 'border-orange-600',
      balloonText: 'text-orange-900',
      balloonShadow: 'shadow-2xl shadow-orange-500/50',
      intensity: 'medium',
      hammerIcon: '🔨🔨'
    },
    3: {
      balloonBg: 'bg-gradient-to-br from-red-50 to-red-100',
      balloonBorder: 'border-red-700',
      balloonText: 'text-red-900',
      balloonShadow: 'shadow-2xl shadow-red-500/60',
      intensity: 'urgent',
      hammerIcon: '🔨🔨🔨'
    },
    4: {
      balloonBg: 'bg-gradient-to-br from-green-400 to-yellow-400',
      balloonBorder: 'border-green-500',
      balloonText: 'text-white',
      balloonShadow: 'shadow-2xl shadow-green-500/80',
      intensity: 'celebration',
      hammerIcon: '🎉'
    }
  };

  const config = phaseConfig[phase] || phaseConfig[1];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: -500, opacity: 0, scale: 0.7 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: -500, opacity: 0, scale: 0.7 }}
          transition={{ type: "spring", stiffness: 100, damping: 18 }}
          className="fixed z-[9999] pointer-events-none auctioneer-position"
        >
          <div className="relative flex items-end gap-3">
            
            {/* 🎭 LEILOEIRO COM PNG TRANSPARENTE */}
            <motion.div
              animate={{
                y: config.intensity === 'celebration' ? [0, -15, 0] : config.intensity === 'urgent' ? [0, -12, 0] : [0, -6, 0],
                rotate: config.intensity === 'celebration' ? [0, -5, 5, -5, 0] : config.intensity === 'urgent' ? [0, -3, 3, -3, 0] : [0, -2, 2, -2, 0],
              }}
              transition={{
                y: {
                  duration: config.intensity === 'celebration' ? 0.4 : config.intensity === 'urgent' ? 0.5 : 0.8,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                rotate: {
                  duration: config.intensity === 'celebration' ? 0.3 : config.intensity === 'urgent' ? 0.4 : 0.7,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              className="relative z-10"
            >
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/d97d32ed2_image.png"
                alt="Leiloeiro"
                className="auctioneer-image object-contain drop-shadow-2xl"
                style={{
                  filter: config.intensity === 'celebration' 
                    ? 'drop-shadow(0 0 30px rgba(34, 197, 94, 0.8)) drop-shadow(0 8px 20px rgba(0, 0, 0, 0.4))' 
                    : config.intensity === 'urgent' 
                    ? 'drop-shadow(0 0 25px rgba(239, 68, 68, 0.7)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4))' 
                    : 'drop-shadow(0 0 15px rgba(0, 0, 0, 0.3)) drop-shadow(0 6px 12px rgba(0, 0, 0, 0.3))'
                }}
              />
            </motion.div>

            {/* 🎈 BALÃO DE FALA */}
            <motion.div
              initial={{ scale: 0, opacity: 0, x: -50 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="relative"
            >
              <div className={`${config.balloonBg} ${config.balloonText} balloon-content rounded-3xl border-3 ${config.balloonBorder} ${config.balloonShadow}`}>
                <p className={`font-black balloon-text text-center leading-tight ${
                  config.intensity === 'celebration' ? 'animate-pulse text-2xl' : config.intensity === 'urgent' ? 'animate-pulse' : ''
                }`}>
                  {config.hammerIcon} {message}
                </p>
              </div>
              
              {/* PONTA DO BALÃO */}
              <div 
                className={`absolute top-1/2 -left-3 transform -translate-y-1/2 w-0 h-0 border-t-[14px] border-t-transparent border-b-[14px] border-b-transparent border-r-[18px] ${config.balloonBorder.replace('border-', 'border-r-')}`}
                style={{
                  filter: 'drop-shadow(-2px 0 0 rgba(0,0,0,0.1))'
                }}
              ></div>
            </motion.div>

            {/* ✨ EFEITO DE IMPACTO PARA CELEBRAÇÃO */}
            {config.intensity === 'celebration' && (
              <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-green-500 opacity-20 blur-3xl"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}

            {/* ✨ EFEITO DE IMPACTO PARA URGÊNCIA */}
            {config.intensity === 'urgent' && (
              <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-red-500 opacity-20 blur-3xl"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
          </div>
        </motion.div>
      )}
      
      <style jsx>{`
        /* 📱 MOBILE - Posiciona ACIMA do Comparai */
        .auctioneer-position {
          bottom: 200px;
          left: 6px;
        }
        
        .auctioneer-image {
          width: 100px;
          height: 100px;
        }
        
        .balloon-content {
          padding: 10px 14px;
          min-width: 200px;
          max-width: 280px;
        }
        
        .balloon-text {
          font-size: 15px;
        }
        
        /* 💻 DESKTOP - Posiciona ACIMA da área de lances, entre o card e o input */
        @media (min-width: 1024px) {
          .auctioneer-position {
            bottom: 140px;
            left: 24px;
          }
          
          .auctioneer-image {
            width: 110px;
            height: 110px;
          }
          
          .balloon-content {
            padding: 12px 16px;
            min-width: 220px;
            max-width: 300px;
          }
          
          .balloon-text {
            font-size: 17px;
          }
        }
      `}</style>
    </AnimatePresence>
  );
}