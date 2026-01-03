import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Zap, Sparkles, ArrowRight } from 'lucide-react';

export default function EarningsSimulator() {
  const [people, setPeople] = useState(10);
  const [selectedTicket, setSelectedTicket] = useState(497);
  const [showResult, setShowResult] = useState(false);

  const tickets = [197, 297, 397, 497, 597, 697, 797, 897, 997];

  const totalSales = people * selectedTicket;
  const yourEarnings = totalSales * 0.03;

  useEffect(() => {
    setShowResult(false);
    const timer = setTimeout(() => setShowResult(true), 300);
    return () => clearTimeout(timer);
  }, [people, selectedTicket]);

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4">
      {/* Header com efeito brilhante */}
      <motion.div 
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-6 py-3 rounded-full border border-yellow-500/30 mb-4">
          <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
          <span className="text-yellow-400 font-bold">Simulador de Ganhos</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-white mb-3 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
          Calcule Seu Potencial de Renda
        </h2>
        <p className="text-gray-400 text-lg">Veja quanto você pode ganhar como Influenciador!</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Card 1: Quantidade de Pessoas */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-2xl p-8 border-2 border-blue-500/30 hover:border-blue-400/60 transition-all duration-300 shadow-2xl hover:shadow-blue-500/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <Users className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Indicados Ativos</h3>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="100000"
                  value={people}
                  onChange={(e) => setPeople(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(people / 100000) * 100}%, #374151 ${(people / 100000) * 100}%, #374151 100%)`
                  }}
                />
              </div>
              
              <div className="flex items-center justify-center">
                <motion.div 
                  key={people}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl font-black text-blue-400"
                >
                  {people}
                </motion.div>
                <span className="text-gray-400 text-xl ml-3">pessoas</span>
              </div>
              
              <div className="text-center text-sm text-gray-500">
                Arraste para ajustar (1-100.000)
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Ticket Médio */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative"
        >
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-2xl p-8 border-2 border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 shadow-2xl hover:shadow-purple-500/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
                <DollarSign className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Ticket Médio</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {tickets.map((ticket) => (
                  <motion.button
                    key={ticket}
                    onClick={() => setSelectedTicket(ticket)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`py-3 px-4 rounded-xl font-bold transition-all duration-300 ${
                      selectedTicket === ticket
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 border-2 border-purple-400'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border-2 border-gray-700'
                    }`}
                  >
                    R$ {ticket}
                  </motion.button>
                ))}
              </div>
              
              <div className="flex items-center justify-center mt-6">
                <motion.div 
                  key={selectedTicket}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-5xl font-black text-purple-400"
                >
                  R$ {selectedTicket}
                </motion.div>
              </div>
              
              <div className="text-center text-sm text-gray-500">
                Valor médio por arremate
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Card de Resultado - DESTAQUE MÁXIMO */}
      <AnimatePresence mode="wait">
        {showResult && (
          <motion.div
            key={`${people}-${selectedTicket}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 blur-3xl"></div>
            
            <div className="relative bg-gradient-to-br from-gray-900 via-green-900/30 to-emerald-900/30 rounded-3xl p-10 border-4 border-green-500/50 shadow-2xl overflow-hidden">
              {/* Efeito de brilho animado */}
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-0 left-0 w-32 h-32 bg-green-500/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>

              <div className="relative z-10">
                {/* Título com ícone */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-10 h-10 text-yellow-400" />
                  </motion.div>
                  <h3 className="text-3xl md:text-4xl font-black text-white">
                    Seus Ganhos Mensais
                  </h3>
                </div>

                {/* Cálculo Visual */}
                <div className="flex flex-wrap items-center justify-center gap-4 mb-8 text-xl md:text-2xl font-bold">
                  <motion.div 
                    className="flex items-center gap-2 bg-blue-500/20 px-6 py-3 rounded-xl border border-blue-500/30"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Users className="w-6 h-6 text-blue-400" />
                    <span className="text-blue-400">{people} pessoas</span>
                  </motion.div>
                  
                  <span className="text-gray-500">×</span>
                  
                  <motion.div 
                    className="flex items-center gap-2 bg-purple-500/20 px-6 py-3 rounded-xl border border-purple-500/30"
                    whileHover={{ scale: 1.05 }}
                  >
                    <DollarSign className="w-6 h-6 text-purple-400" />
                    <span className="text-purple-400">R$ {selectedTicket}</span>
                  </motion.div>
                  
                  <span className="text-gray-500">×</span>
                  
                  <motion.div 
                    className="bg-yellow-500/20 px-6 py-3 rounded-xl border border-yellow-500/30"
                    whileHover={{ scale: 1.05 }}
                  >
                    <span className="text-yellow-400">3%</span>
                  </motion.div>
                  
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <ArrowRight className="w-8 h-8 text-green-400" />
                  </motion.div>
                </div>

                {/* Valor GIGANTE de destaque */}
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-400 mb-2">Você recebe por mês:</div>
                  <motion.div
                    key={yourEarnings}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="text-7xl md:text-8xl font-black bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent"
                    style={{
                      textShadow: '0 0 80px rgba(52, 211, 153, 0.5)'
                    }}
                  >
                    R$ {yourEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </motion.div>
                </div>

                {/* Info adicional */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                    <div className="text-green-400 text-sm mb-1">Faturamento Total da Rede</div>
                    <div className="text-white text-2xl font-bold">
                      R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <div className="text-emerald-400 text-sm mb-1">Ganho Anual Estimado</div>
                    <div className="text-white text-2xl font-bold">
                      R$ {(yourEarnings * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="text-center">
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        '0 0 20px rgba(52, 211, 153, 0.3)',
                        '0 0 40px rgba(52, 211, 153, 0.6)',
                        '0 0 20px rgba(52, 211, 153, 0.3)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="inline-block"
                  >
                    <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-8 py-4 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-white" />
                        <span className="text-white font-black text-xl">
                          Comece a ganhar agora! 🚀
                        </span>
                      </div>
                    </div>
                  </motion.div>
                  <p className="text-gray-400 text-sm mt-4">
                    * Valores calculados com base em 3% de comissão por arremate
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
          transition: all 0.2s;
        }
        
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 20px rgba(59, 130, 246, 1);
        }
        
        .slider-thumb::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
          transition: all 0.2s;
        }
        
        .slider-thumb::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 20px rgba(59, 130, 246, 1);
        }
      `}</style>
    </div>
  );
}