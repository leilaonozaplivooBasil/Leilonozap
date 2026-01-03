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
    <div className="w-full max-w-5xl mx-auto py-6 px-4">
      {/* Header com efeito brilhante */}
      <motion.div 
        className="text-center mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-2 rounded-full border border-yellow-500/30 mb-3">
          <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
          <span className="text-yellow-400 font-semibold text-sm">Simulador de Ganhos</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white mb-2 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
          Calcule Seu Potencial de Renda
        </h2>
        <p className="text-gray-400 text-sm">Veja quanto você pode ganhar como Influenciador!</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Card 1: Quantidade de Pessoas */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-4 border-2 border-green-500/30 hover:border-green-400/60 transition-all duration-300 shadow-xl hover:shadow-green-500/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Indicados Ativos</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={people}
                  onChange={(e) => setPeople(Math.min(100000, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-32 text-4xl font-black text-green-400 bg-transparent text-center border-b-2 border-green-500/30 focus:border-green-400 focus:outline-none"
                />
                <span className="text-gray-400 text-base">pessoas</span>
              </div>
              
              <div className="text-center text-xs text-gray-500">
                Digite o valor (1-100.000)
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
          <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/30 rounded-xl p-4 border-2 border-gray-600/40 hover:border-gray-500/60 transition-all duration-300 shadow-xl hover:shadow-gray-500/20 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-gray-600/30 rounded-lg border border-gray-500/30">
                <DollarSign className="w-5 h-5 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-white">Ticket Médio</h3>
            </div>
            
            <div className="flex-1 flex flex-col justify-center space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {tickets.map((ticket) => (
                  <motion.button
                    key={ticket}
                    onClick={() => setSelectedTicket(ticket)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                      selectedTicket === ticket
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50 border-2 border-green-400'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border-2 border-gray-700'
                    }`}
                  >
                    R$ {ticket}
                  </motion.button>
                ))}
              </div>
              
              <div className="flex items-center justify-center">
                <motion.div 
                  key={selectedTicket}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-black text-gray-200"
                >
                  R$ {selectedTicket}
                </motion.div>
              </div>
              
              <div className="text-center text-xs text-gray-500">
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
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 border-2 border-green-500/50 shadow-xl overflow-hidden">
              {/* Efeito de brilho animado */}
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-0 left-0 w-24 h-24 bg-green-500/30 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-500/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>

              <div className="relative z-10">
                {/* Título com ícone */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-6 h-6 text-yellow-400" />
                  </motion.div>
                  <h3 className="text-xl md:text-2xl font-black text-white">
                    Seus Ganhos Mensais
                  </h3>
                </div>

                {/* Cálculo Visual */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-4 text-sm md:text-base font-bold">
                  <motion.div 
                    className="flex items-center gap-1.5 bg-green-500/20 px-3 py-2 rounded-lg border border-green-500/30"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Users className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">{people} pessoas</span>
                  </motion.div>

                  <span className="text-gray-500 text-sm">×</span>

                  <motion.div 
                    className="flex items-center gap-1.5 bg-gray-600/30 px-3 py-2 rounded-lg border border-gray-500/30"
                    whileHover={{ scale: 1.05 }}
                  >
                    <DollarSign className="w-4 h-4 text-gray-300" />
                    <span className="text-gray-300">R$ {selectedTicket}</span>
                  </motion.div>
                  
                  <span className="text-gray-500 text-sm">×</span>
                  
                  <motion.div 
                    className="bg-yellow-500/20 px-3 py-2 rounded-lg border border-yellow-500/30"
                    whileHover={{ scale: 1.05 }}
                  >
                    <span className="text-yellow-400">3%</span>
                  </motion.div>
                  
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5 text-green-400" />
                  </motion.div>
                </div>

                {/* Valor GIGANTE de destaque */}
                <div className="text-center mb-4">
                  <div className="text-xs text-gray-400 mb-1">Você recebe por mês:</div>
                  <motion.div
                    key={yourEarnings}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent"
                    style={{
                      textShadow: '0 0 60px rgba(52, 211, 153, 0.5)'
                    }}
                  >
                    R$ {yourEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </motion.div>
                </div>

                {/* Info adicional */}
                <div className="grid md:grid-cols-2 gap-3 mb-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                    <div className="text-green-400 text-xs mb-0.5">Faturamento Total da Rede</div>
                    <div className="text-white text-lg font-bold">
                      R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                    <div className="text-emerald-400 text-xs mb-0.5">Ganho Anual Estimado</div>
                    <div className="text-white text-lg font-bold">
                      R$ {(yourEarnings * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="text-center">
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        '0 0 15px rgba(52, 211, 153, 0.3)',
                        '0 0 30px rgba(52, 211, 153, 0.6)',
                        '0 0 15px rgba(52, 211, 153, 0.3)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="inline-block"
                  >
                    <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-6 py-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-white" />
                        <span className="text-white font-black text-base">
                          Comece a ganhar agora! 🚀
                        </span>
                      </div>
                    </div>
                  </motion.div>
                  <p className="text-gray-400 text-xs mt-3">
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
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.8);
          transition: all 0.2s;
        }
        
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 15px rgba(59, 130, 246, 1);
        }
        
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.8);
          transition: all 0.2s;
        }
        
        .slider-thumb::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 15px rgba(59, 130, 246, 1);
        }
      `}</style>
    </div>
  );
}