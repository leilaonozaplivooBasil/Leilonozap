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
        description: "3% em Dinheiro Real"
    }
];

export default function JourneyAnimation({ customPhases, journeyTitle }) {
    const phases = customPhases || defaultPhases;
    const [currentPhase, setCurrentPhase] = useState(0);
    const audioContextRef = useRef(null);

    const playCoinSound = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        try {
            const ctx = audioContextRef.current;
            const now = ctx.currentTime;

            // SOM DE NOTAS SENDO CONTADAS/SACADAS - "SWISH SWISH SWISH"

            // Função para criar som de nota sendo passada
            const createBillSwipe = (startTime) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                // Adiciona ruído branco para simular papel
                const noise = ctx.createBufferSource();
                const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < output.length; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                noise.buffer = noiseBuffer;

                const noiseGain = ctx.createGain();
                noise.connect(noiseGain);
                noiseGain.connect(ctx.destination);

                // Tom de papel passando
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, startTime);
                osc.frequency.exponentialRampToValueAtTime(180, startTime + 0.06);

                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

                noiseGain.gain.setValueAtTime(0, startTime);
                noiseGain.gain.linearRampToValueAtTime(0.08, startTime + 0.005);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);

                osc.start(startTime);
                osc.stop(startTime + 0.08);
                noise.start(startTime);
                noise.stop(startTime + 0.06);
            };

            // Sequência de notas sendo contadas (5 notas rápidas)
            createBillSwipe(now);
            createBillSwipe(now + 0.08);
            createBillSwipe(now + 0.16);
            createBillSwipe(now + 0.24);
            createBillSwipe(now + 0.32);

            // Som final de "pronto!" - nota aguda
            const finalBell = ctx.createOscillator();
            const finalGain = ctx.createGain();
            finalBell.connect(finalGain);
            finalGain.connect(ctx.destination);

            finalBell.type = 'sine';
            finalBell.frequency.setValueAtTime(1200, now + 0.45);
            finalBell.frequency.exponentialRampToValueAtTime(1600, now + 0.5);

            finalGain.gain.setValueAtTime(0, now + 0.45);
            finalGain.gain.linearRampToValueAtTime(0.3, now + 0.46);
            finalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

            finalBell.start(now + 0.45);
            finalBell.stop(now + 0.7);

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
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                {journeyTitle || "Sistema automático de ganhos recorrentes ✨"}
            </h2>

            {/* LINHA DE PROGRESSO */}
            <div className="max-w-4xl mx-auto mb-12">
                <div className="relative">
                    {/* Linha de fundo - passa pelo centro dos círculos */}
                    <div className="absolute top-8 left-0 right-0 h-1 bg-gray-700 z-0" style={{ left: '32px', right: '32px' }} />
                    
                    {/* Linha de progresso verde */}
                    <motion.div 
                        className="absolute top-8 h-1 bg-green-500 z-0"
                        style={{ left: '32px' }}
                        initial={{ width: '0%' }}
                        animate={{ 
                            width: `calc(${(currentPhase / (phases.length - 1)) * 100}% - 32px)` 
                        }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                    
                    <div className="flex items-center justify-between">
                        {/* ETAPAS */}
                        {phases.map((phase, index) => (
                            <div key={phase.id} className="relative z-10 flex flex-col items-center">
                                {/* Círculo */}
                                <motion.div 
                                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-500 ${
                                        index <= currentPhase 
                                            ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                                            : 'bg-gray-700'
                                    }`}
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
                                        index <= currentPhase ? 'text-green-400' : 'text-gray-500'
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
            <div className="max-w-3xl mx-auto bg-gray-800/30 rounded-2xl p-8 relative overflow-hidden">
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
                        <h3 className={`text-2xl font-bold ${phases[currentPhase].color} mb-4`}>
                            {phases[currentPhase].description}
                        </h3>
                        <p className="text-gray-400 text-base">
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