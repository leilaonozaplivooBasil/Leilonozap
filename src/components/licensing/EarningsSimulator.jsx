import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Zap, Sparkles, ArrowRight } from 'lucide-react';

export default function EarningsSimulator({ theme = 'nozap' }) {
  const [people, setPeople] = useState(''); // começa vazio — usuário digita sem apagar nada
  const [selectedTicket, setSelectedTicket] = useState(497);
  const [showResult, setShowResult] = useState(false);

  const tickets = [197, 297, 397, 497, 597, 697, 797, 897, 997];

  const isSaiDeBaixo = theme === 'saidebaixo';

  const peopleNum = parseInt(people) || 0;
  const totalSales = peopleNum * selectedTicket;
  const yourEarnings = totalSales * 0.03;

  useEffect(() => {
    setShowResult(false);
    if (!peopleNum) return; // sem indicados, não mostra o resultado
    const timer = setTimeout(() => setShowResult(true), 300);
    return () => clearTimeout(timer);
  }, [peopleNum, selectedTicket]);

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4">
      {/* Header com efeito brilhante */}
      <motion.div 
        className="text-center mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className={`inline-flex items-center gap-2 bg-gradient-to-r px-4 py-2 rounded-full border mb-3 ${
          isSaiDeBaixo 
            ? 'from-red-500/20 to-orange-500/20 border-red-500/30' 
            : 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
        }`}>
          <Sparkles className={`w-4 h-4 animate-pulse ${isSaiDeBaixo ? 'text-red-600' : 'text-yellow-400'}`} />
          <span className={`font-semibold text-sm ${isSaiDeBaixo ? 'text-red-600' : 'text-yellow-400'}`}>Simulador de Ganhos</span>
        </div>
        <h2 className={`text-2xl md:text-3xl font-black mb-2 ${
          isSaiDeBaixo 
            ? 'text-gray-900' 
            : 'text-white bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent'
        }`}>
          Calcule Seu Potencial de Renda
        </h2>
        <p className={`text-sm ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>Veja quanto você pode ganhar como Influenciador!</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Card 1: Quantidade de Pessoas */}
        <div className="relative">
          <div className={`bg-gradient-to-br rounded-xl p-4 border-2 ${
            isSaiDeBaixo 
              ? 'from-red-50 to-red-100/50 border-red-300' 
              : 'from-green-900/40 to-green-800/20 border-green-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-lg border ${
                isSaiDeBaixo 
                  ? 'bg-red-500/20 border-red-500/30' 
                  : 'bg-green-500/20 border-green-500/30'
              }`}>
                <Users className={`w-5 h-5 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`} />
              </div>
              <h3 className={`text-lg font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Indicados Ativos</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={people}
                  placeholder="0"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') { setPeople(''); return; }
                    setPeople(String(Math.min(100000, Math.max(1, parseInt(v) || 1))));
                  }}
                  className={`w-32 text-4xl font-black bg-transparent text-center border-b-2 focus:outline-none custom-number-input ${
                    isSaiDeBaixo
                      ? 'text-gray-900 border-red-500/30 focus:border-red-600 placeholder-gray-400/50'
                      : 'text-white border-green-500/30 focus:border-green-400 placeholder-white/25'
                  }`}
                />
                <span className={`text-base font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>pessoas</span>
              </div>

              <div className={`text-center text-xs ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                Insira o número de indicados
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Ticket Médio */}
        <div className="relative">
          <div className={`bg-gradient-to-br rounded-xl p-4 border-2 h-full flex flex-col ${
            isSaiDeBaixo 
              ? 'from-gray-100 to-gray-200/50 border-gray-400/40' 
              : 'from-gray-800/60 to-gray-700/30 border-gray-600/40'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-lg border ${
                isSaiDeBaixo 
                  ? 'bg-gray-300/30 border-gray-400/30' 
                  : 'bg-gray-600/30 border-gray-500/30'
              }`}>
                <DollarSign className={`w-5 h-5 ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`} />
              </div>
              <h3 className={`text-lg font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Ticket Médio</h3>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {tickets.map((ticket) => (
                  <button
                    key={ticket}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold ${
                      selectedTicket === ticket
                        ? isSaiDeBaixo
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border-2 border-red-500'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-2 border-green-400'
                        : isSaiDeBaixo
                          ? 'bg-gray-200 text-gray-700 border-2 border-gray-300'
                          : 'bg-gray-800 text-gray-400 border-2 border-gray-700'
                    }`}
                  >
                    R$ {ticket}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className={`text-2xl font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>R$</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={selectedTicket}
                  onChange={(e) => setSelectedTicket(Math.min(10000, Math.max(1, parseInt(e.target.value) || 1)))}
                  className={`w-32 text-4xl font-black bg-transparent text-center border-b-2 focus:outline-none custom-number-input ${
                    isSaiDeBaixo 
                      ? 'text-gray-900 border-gray-400/30 focus:border-gray-600' 
                      : 'text-white border-gray-500/30 focus:border-gray-400'
                  }`}
                />
              </div>

              <div className={`text-center text-xs ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                Digite o valor médio por arremate
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card de Resultado - DESTAQUE MÁXIMO */}
      {showResult && (
          <div className="relative">
            <div className={`relative bg-gradient-to-br rounded-2xl p-6 border-2 overflow-hidden ${
              isSaiDeBaixo 
                ? 'from-white via-gray-50 to-gray-100 border-red-500/50' 
                : 'from-gray-900 via-gray-800 to-gray-900 border-green-500/50'
            }`}>


              <div className="relative z-10">
                {/* Título com ícone */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Zap className={`w-6 h-6 ${isSaiDeBaixo ? 'text-red-600' : 'text-yellow-400'}`} />
                  <h3 className={`text-xl md:text-2xl font-black ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                    Seus Ganhos Mensais
                  </h3>
                </div>

                {/* Cálculo Visual */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-4 text-sm md:text-base font-bold">
                  <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${
                    isSaiDeBaixo 
                      ? 'bg-red-500/20 border-red-500/30' 
                      : 'bg-green-500/20 border-green-500/30'
                  }`}>
                    <Users className={`w-4 h-4 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`} />
                    <span className={isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}>{peopleNum} pessoas</span>
                  </div>

                  <span className={`text-sm ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-500'}`}>×</span>

                  <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${
                    isSaiDeBaixo 
                      ? 'bg-gray-300/30 border-gray-400/30' 
                      : 'bg-gray-600/30 border-gray-500/30'
                  }`}>
                    <DollarSign className={`w-4 h-4 ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`} />
                    <span className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>R$ {selectedTicket}</span>
                  </div>

                  <span className="text-gray-500 text-sm">×</span>

                  <div className={`px-3 py-2 rounded-lg border ${
                    isSaiDeBaixo 
                      ? 'bg-orange-500/20 border-orange-500/30' 
                      : 'bg-yellow-500/20 border-yellow-500/30'
                  }`}>
                    <span className={isSaiDeBaixo ? 'text-orange-600' : 'text-yellow-400'}>3%</span>
                  </div>

                  <ArrowRight className={`w-5 h-5 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`} />
                </div>

                {/* Valor GIGANTE de destaque */}
                <div className="text-center mb-4">
                  <div className={`text-xs font-bold mb-1 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Você recebe por mês:</div>
                  <div className={`text-4xl md:text-5xl font-black ${
                    isSaiDeBaixo 
                      ? 'text-red-600' 
                      : 'bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent'
                  }`}>
                    R$ {yourEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Info adicional */}
                <div className="grid md:grid-cols-2 gap-3 mb-4">
                  <div className={`border rounded-lg p-3 text-center ${
                    isSaiDeBaixo 
                      ? 'bg-red-50 border-red-300' 
                      : 'bg-green-500/10 border-green-500/20'
                  }`}>
                    <div className={`text-xs font-bold mb-0.5 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Faturamento Total da Rede</div>
                    <div className={`text-lg font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                      R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className={`border rounded-lg p-3 text-center ${
                    isSaiDeBaixo 
                      ? 'bg-orange-50 border-orange-300' 
                      : 'bg-emerald-500/10 border-emerald-500/20'
                  }`}>
                    <div className={`text-xs font-bold mb-0.5 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Ganho Anual Estimado</div>
                    <div className={`text-lg font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                      R$ {(yourEarnings * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="text-center">
                  <div className="inline-block">
                    <div className={`bg-gradient-to-r px-6 py-3 rounded-xl ${
                      isSaiDeBaixo 
                        ? 'from-red-600 via-red-700 to-red-800' 
                        : 'from-green-600 via-emerald-600 to-teal-600'
                    }`}>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-white" />
                        <span className="text-white font-black text-base">
                          Comece a ganhar agora! 🚀
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className={`text-xs font-bold mt-3 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                    * Valores calculados com base em 3% de comissão por arremate
                  </p>
                </div>
              </div>
            </div>
            </div>
            )}

      <style>{`
        /* Input de display: sem setas de spinner pra centralizar o número de verdade */
        .custom-number-input::-webkit-outer-spin-button,
        .custom-number-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
          display: none;
        }
        .custom-number-input {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>
    </div>
  );
}