import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Smartphone, Hammer, Banknote } from 'lucide-react';

const phases = [
  { icon: Share2, label: "Compartilhe seu link", description: "Envie seu link exclusivo para amigos e clientes" },
  { icon: Smartphone, label: "Ele entra no app", description: "Seu indicado se cadastra gratuitamente" },
  { icon: Hammer, label: "Faz uma compra", description: "Ele arremata ou compra na Loja Virtual" },
  { icon: Banknote, label: "5% em Dinheiro Real", description: "Você recebe a comissão direto na sua carteira" }
];

// 🎯 Substitui o antigo "joguinho" com emojis por um stepper profissional, sem
// emojis, com ícones lucide e uma chuva de dinheiro (Banknote) + som de caixa
// registradora ao chegar na etapa dos 5%.
export default function ProfessionalJourney({ theme = 'nozap' }) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [showMoneyRain, setShowMoneyRain] = useState(false);
  const audioContextRef = useRef(null);
  const isSaiDeBaixo = theme === 'saidebaixo';
  const accent = isSaiDeBaixo ? 'red' : 'nz-verde';

  const playCoinSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window['webkitAudioContext'])();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    try {
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;

      const playBell = (freq, startTime, duration = 0.45, peak = 0.32) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      playBell(1318.51, now, 0.4, 0.3);
      playBell(1567.98, now + 0.09, 0.5, 0.32);

      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);
      shimmer.type = 'triangle';
      shimmer.frequency.setValueAtTime(2400, now);
      shimmerGain.gain.setValueAtTime(0.0001, now);
      shimmerGain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      shimmer.start(now);
      shimmer.stop(now + 0.55);
    } catch (error) {
      console.error("Erro ao tocar som:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhase((prev) => {
        const next = (prev + 1) % phases.length;
        if (next === 3) {
          playCoinSound();
          setShowMoneyRain(true);
          setTimeout(() => setShowMoneyRain(false), 1400);
        }
        return next;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="py-10 px-4">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-nz-tinta">
        Toda vez que seu cliente comprar,{' '}
        <span className={isSaiDeBaixo ? 'text-red-600' : 'text-nz-verde'}>você ganha!</span>
      </h2>

      {/* Stepper */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="relative flex items-center justify-between">
          <div className="absolute top-7 h-0.5 bg-nz-borda" style={{ left: '28px', right: '28px' }} />
          <motion.div
            className={`absolute top-7 h-0.5 ${isSaiDeBaixo ? 'bg-red-600' : 'bg-nz-verde'}`}
            style={{ left: '28px' }}
            animate={{ width: `calc(${(currentPhase / (phases.length - 1)) * 100}% - 28px)` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
          {phases.map((phase, i) => {
            const Icon = phase.icon;
            const active = i <= currentPhase;
            return (
              <div key={i} className="relative z-10 flex flex-col items-center gap-2 flex-1 px-1">
                <motion.div
                  className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${active ?
                    (isSaiDeBaixo ? 'bg-red-600 border-red-600' : 'bg-nz-verde border-nz-verde') :
                    'bg-white border-nz-borda'}`}
                  animate={{ scale: i === currentPhase ? [1, 1.12, 1] : 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Icon className={`w-6 h-6 ${active ? 'text-white' : 'text-nz-tinta-fraca'}`} />
                </motion.div>
                <span className={`text-[11px] sm:text-xs font-semibold text-center leading-tight ${active ?
                  (isSaiDeBaixo ? 'text-red-600' : 'text-nz-verde') : 'text-nz-tinta-fraca'}`}>
                  {phase.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel de detalhe + chuva de dinheiro */}
      <div className="max-w-xl mx-auto relative overflow-hidden rounded-2xl border border-nz-borda bg-nz-verde-fundo p-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            {React.createElement(phases[currentPhase].icon, {
              className: `w-10 h-10 mx-auto mb-3 ${isSaiDeBaixo ? 'text-red-600' : 'text-nz-verde'}`
            })}
            <h3 className="text-lg font-bold text-nz-tinta mb-1">{phases[currentPhase].label}</h3>
            <p className="text-sm text-nz-tinta-fraca">{phases[currentPhase].description}</p>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {showMoneyRain && Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-0"
              style={{ left: `${6 + i * 12}%` }}
              initial={{ y: -40, opacity: 0, rotate: 0 }}
              animate={{ y: 220, opacity: [0, 1, 1, 0], rotate: i % 2 ? 300 : -300 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, delay: i * 0.05, ease: 'easeIn' }}
            >
              <Banknote className={`w-6 h-6 drop-shadow ${isSaiDeBaixo ? 'text-red-600' : 'text-nz-verde'}`} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}