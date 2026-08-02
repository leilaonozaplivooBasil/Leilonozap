import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const defaultPhases = [
    {
        id: 0,
        title: "1. Você indica seu amigo",
        icon: "🚶",
        color: "text-gray-500",
        description: "Compartilhe seu link"
    },
    {
        id: 1,
        title: "2. Amigo se cadastra",
        icon: "📱",
        color: "text-green-400",
        description: "Ele entra no app"
    },
    {
        id: 2,
        title: "3. Amigo arremata",
        icon: "🔨",
        color: "text-green-400",
        description: "Faz uma compra"
    },
    {
        id: 3,
        title: "4. Você ganha R$!",
        icon: "💰",
        color: "text-green-400",
        description: "5% em Dinheiro Real"
    }
];

export default function JourneyAnimation({ customPhases, journeyTitle, theme = 'nozap' }) {
    const phases = customPhases || defaultPhases;
    const [currentPhase, setCurrentPhase] = useState(0);
    const audioContextRef = useRef(null);
    
    const isSaiDeBaixo = theme === 'saidebaixo';

    const playCoinSound = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window['webkitAudioContext'])();
        }
        // Retoma o contexto caso esteja suspenso (política de autoplay dos browsers modernos)
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        try {
            const ctx = audioContextRef.current;
            const now = ctx.currentTime;

            // 🔔 SOM DE CAIXA REGISTRADORA "CHA-CHING" — sino metálico de duas notas
            // + brilho agudo, som real de dinheiro entrando, sem ruído de papel.
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

            // Duas notas do "cha-ching" (E6 -> G6)
            playBell(1318.51, now, 0.4, 0.3);
            playBell(1567.98, now + 0.09, 0.5, 0.32);

            // Brilho metálico por cima, reforça o "ching" de moeda
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
                
                // Toca som quando chega na fase 3 (ganhar V$)
                if (next === 3) {
                    playCoinSound();
                }
                
                return next;
            });
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="py-12 px-4">
            {/* TÍTULO */}
            <h2 className={`text-2xl md:text-3xl font-bold text-center mb-8 ${
                isSaiDeBaixo 
                    ? 'bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent' 
                    : 'bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent'
            }`}>
                {journeyTitle || "Toda vez que seu cliente comprar, você ganha! 💸"}
            </h2>

            {/* LINHA DE PROGRESSO */}
            <div className="max-w-4xl mx-auto mb-12">
                <div className="relative">
                    {/* Linha de fundo - passa pelo centro dos círculos - ATRÁS (z-0) */}
                    <div className={`absolute top-8 left-0 right-0 h-1 ${isSaiDeBaixo ? 'bg-gray-300' : 'bg-gray-700'}`} style={{ left: '32px', right: '32px', zIndex: 0 }} />
                    
                    {/* Linha de progresso - ATRÁS (z-0) */}
                    <motion.div 
                        className={`absolute top-8 h-1 ${isSaiDeBaixo ? 'bg-red-600' : 'bg-green-500'}`}
                        style={{ left: '32px', zIndex: 0 }}
                        initial={{ width: '0%' }}
                        animate={{ 
                            width: `calc(${(currentPhase / (phases.length - 1)) * 100}% - 32px)` 
                        }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                    
                    <div className="flex items-center justify-between relative z-10">
                        {/* ETAPAS */}
                        {phases.map((phase, index) => (
                            <div key={phase.id} className="relative flex flex-col items-center">
                                {/* Círculo */}
                                <motion.div 
                                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-500 relative ${
                                        index <= currentPhase 
                                            ? isSaiDeBaixo 
                                                ? 'bg-red-600 shadow-lg shadow-red-600/50' 
                                                : 'bg-green-500 shadow-lg shadow-green-500/50'
                                            : isSaiDeBaixo
                                                ? 'bg-gray-300'
                                                : 'bg-gray-700'
                                    }`}
                                    style={{ zIndex: 20 }}
                                    animate={{
                                        scale: index === currentPhase ? [1, 1.2, 1] : 1,
                                    }}
                                    transition={{ duration: 0.5 }}
                                >
                                    {phase.icon}
                                </motion.div>
                                
                                {/* Texto abaixo */}
                                <div className="mt-4 text-center">
                                    <p className={`text-sm font-bold ${
                                        index <= currentPhase 
                                            ? isSaiDeBaixo ? 'text-red-600' : 'text-green-400' 
                                            : isSaiDeBaixo ? 'text-gray-600' : 'text-gray-500'
                                    }`}>
                                        {phase.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ANIMAÇÃO DO BONECO */}
            <div className={`max-w-3xl mx-auto rounded-2xl p-8 relative overflow-hidden ${
                isSaiDeBaixo ? 'bg-gray-100 border-2 border-gray-300' : 'bg-gray-800/30'
            }`}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPhase}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.5 }}
                        className="text-center"
                    >
                        <div className="text-6xl mb-4">
                            {phases[currentPhase].icon}
                        </div>
                        <h3 className={`text-2xl font-bold mb-4 ${
                            isSaiDeBaixo 
                                ? currentPhase === 0 ? 'text-gray-700' : 'text-red-600'
                                : phases[currentPhase].color
                        }`}>
                            {phases[currentPhase].description}
                        </h3>
                        <p className={`text-base ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                            {phases[currentPhase].title}
                        </p>

                        {/* MOEDA CAINDO (só na fase 4) */}
                        {currentPhase === 3 && (
                            <motion.div
                                className="absolute top-0 left-1/2 -translate-x-1/2"
                                initial={{ y: -100, opacity: 0, rotate: 0 }}
                                animate={{ 
                                    y: 150, 
                                    opacity: [0, 1, 1, 0],
                                    rotate: 360
                                }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            >
                                <div className="text-6xl">💰</div>
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>


            </div>

        </div>
    );
}