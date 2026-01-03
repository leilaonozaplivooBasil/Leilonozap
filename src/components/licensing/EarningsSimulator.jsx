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
        <div className="relative">
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-4 border-2 border-green-500/30">
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
                  className="w-32 text-4xl font-black text-white bg-transparent text-center border-b-2 border-green-500/30 focus:border-green-400 focus:outline-none custom-number-input"
                />
                <span className="text-white text-base font-bold">pessoas</span>
              </div>

              <div className="text-center text-xs text-gray-400">
                Digite o número de pessoas indicadas
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Ticket Médio */}
        <div className="relative">
          <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/30 rounded-xl p-4 border-2 border-gray-600/40 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-gray-600/30 rounded-lg border border-gray-500/30">
                <DollarSign className="w-5 h-5 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-white">Ticket Médio</h3>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {tickets.map((ticket) => (
                  <button
                    key={ticket}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold ${
                      selectedTicket === ticket
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-2 border-green-400'
                        : 'bg-gray-800 text-gray-400 border-2 border-gray-700'
                    }`}
                  >
                    R$ {ticket}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-white">R$</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={selectedTicket}
                  onChange={(e) => setSelectedTicket(Math.min(10000, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-32 text-4xl font-black text-white bg-transparent text-center border-b-2 border-gray-500/30 focus:border-gray-400 focus:outline-none custom-number-input"
                />
              </div>

              <div className="text-center text-xs text-gray-400">
                Digite o valor médio por arremate
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card de Resultado - DESTAQUE MÁXIMO */}
      {showResult && (
          <div className="relative">
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 border-2 border-green-500/50 overflow-hidden">


              <div className="relative z-10">
                {/* Título com ícone */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl md:text-2xl font-black text-white">
                    Seus Ganhos Mensais
                  </h3>
                </div>

                {/* Cálculo Visual */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-4 text-sm md:text-base font-bold">
                  <div className="flex items-center gap-1.5 bg-green-500/20 px-3 py-2 rounded-lg border border-green-500/30">
                    <Users className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">{people} pessoas</span>
                  </div>

                  <span className="text-gray-500 text-sm">×</span>

                  <div className="flex items-center gap-1.5 bg-gray-600/30 px-3 py-2 rounded-lg border border-gray-500/30">
                    <DollarSign className="w-4 h-4 text-gray-300" />
                    <span className="text-gray-300">R$ {selectedTicket}</span>
                  </div>

                  <span className="text-gray-500 text-sm">×</span>

                  <div className="bg-yellow-500/20 px-3 py-2 rounded-lg border border-yellow-500/30">
                    <span className="text-yellow-400">3%</span>
                  </div>

                  <ArrowRight className="w-5 h-5 text-green-400" />
                </div>

                {/* Valor GIGANTE de destaque */}
                <div className="text-center mb-4">
                  <div className="text-xs text-white font-bold mb-1">Você recebe por mês:</div>
                  <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    R$ {yourEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Info adicional */}
                <div className="grid md:grid-cols-2 gap-3 mb-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                    <div className="text-white text-xs font-bold mb-0.5">Faturamento Total da Rede</div>
                    <div className="text-white text-lg font-bold">
                      R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                    <div className="text-white text-xs font-bold mb-0.5">Ganho Anual Estimado</div>
                    <div className="text-white text-lg font-bold">
                      R$ {(yourEarnings * 12).toLocaleString('pt-BR', { minimumFractionDigals: 2 })}
                    </div>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="text-center">
                  <div className="inline-block">
                    <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-6 py-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-white" />
                        <span className="text-white font-black text-base">
                          Comece a ganhar agora! 🚀
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-white text-xs font-bold mt-3">
                    * Valores calculados com base em 3% de comissão por arremate
                  </p>
                </div>
              </div>
            </div>
            </div>
            )}

      <style>{`
        /* Estilo customizado para input number */
        .custom-number-input::-webkit-outer-spin-button,
        .custom-number-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
          width: 20px;
          height: 20px;
          background: transparent;
          cursor: pointer;
          position: relative;
        }

        .custom-number-input {
          -moz-appearance: textfield;
        }

        /* Setas customizadas para Chrome/Safari/Edge */
        .custom-number-input::-webkit-inner-spin-button {
          opacity: 1;
          width: 20px;
          height: 40px;
          cursor: pointer;
          position: absolute;
          right: 0;
          background: transparent;
        }

        .custom-number-input::-webkit-outer-spin-button {
          -webkit-appearance: inner-spin-button;
          background: transparent;
          opacity: 1;
        }

        /* Remove fundo e estiliza apenas as setas */
        input[type="number"]::-webkit-inner-spin-button {
          opacity: 1;
          cursor: pointer;
          background: transparent;
          color: #22c55e;
        }

        input[type="number"]::-webkit-outer-spin-button {
          opacity: 1;
          cursor: pointer;
          background: transparent;
        }
      `}</style>
    </div>
  );
}