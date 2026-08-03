import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Wallet, Clock, Sparkles } from 'lucide-react';

// 💳 Cartão de saldo — visual "fintech premium", 100% digital (sem foto de
// cédula física: o saldo é usado em Leilões e na Loja Virtual, nunca sacado
// em espécie na mão). Glassmorphism + selo digital pulsante no lugar do dinheiro.
export default function WalletBalanceCard({ cardRef, totalAvailable, pendingWithdrawalAmount, isSaiDeBaixo, onUseNow, onWithdraw }) {
  const accent = isSaiDeBaixo ? 'red' : 'emerald';

  return (
    <Card ref={cardRef} className={`mb-8 relative overflow-hidden backdrop-blur-xl border shadow-2xl ${isSaiDeBaixo ?
      'bg-gradient-to-br from-red-950 via-red-900/70 to-gray-950 border-red-500/30 shadow-red-900/30' :
      'bg-gradient-to-br from-emerald-950 via-gray-950 to-gray-950 border-emerald-500/25 shadow-emerald-900/30'}`
    }>
      {/* Textura digital sutil (grade + brilho) — substitui a foto de cédulas */}
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
        backgroundImage: `linear-gradient(${isSaiDeBaixo ? '#ef4444' : '#10b981'}22 1px, transparent 1px), linear-gradient(90deg, ${isSaiDeBaixo ? '#ef4444' : '#10b981'}22 1px, transparent 1px)`,
        backgroundSize: '28px 28px'
      }} />
      <div className={`absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none ${isSaiDeBaixo ? 'bg-red-500' : 'bg-emerald-400'}`} />

      <CardContent className="relative p-6 md:px-12 md:py-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12">
          <div className="w-full md:w-auto">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border mb-3 ${isSaiDeBaixo ? 'text-red-300 border-red-500/40 bg-red-500/10' : 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'}`}>
              <Wallet className="w-3 h-3" /> Saldo Disponível
            </span>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-5xl font-black text-white tracking-tight drop-shadow-[0_2px_12px_rgba(16,185,129,0.35)]">
                R$ {totalAvailable.toFixed(2)}
              </span>
            </div>
            <p className={`text-xs mb-4 ${isSaiDeBaixo ? 'text-red-300/60' : 'text-emerald-300/60'}`}>
              Use em Leilões ou na Loja Virtual — 100% digital, sem burocracia.
            </p>

            <div className={`h-px bg-gradient-to-r from-transparent to-transparent my-2 max-w-[280px] ${isSaiDeBaixo ? 'via-red-500/30' : 'via-emerald-500/30'}`} />

            {pendingWithdrawalAmount > 0 &&
              <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 mb-4 max-w-[280px]">
                <p className="text-sm text-yellow-400 font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Saque em Processo: R$ {pendingWithdrawalAmount.toFixed(2)}
                </p>
                <p className="text-xs text-yellow-300/70 mt-1">Aguardando aprovação</p>
              </div>
            }

            <div className="flex flex-col gap-2 max-w-[280px]">
              <Button
                onClick={onUseNow}
                className={`text-white font-semibold h-11 text-sm shadow-lg transition-all duration-300 hover:scale-[1.02] ${isSaiDeBaixo ?
                  'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-red-500/20 hover:shadow-red-500/40' :
                  'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-emerald-400 hover:to-green-500 shadow-green-500/20 hover:shadow-green-500/40'}`}>
                <Zap className="w-4 h-4 mr-2" />
                Usar Agora
              </Button>
              <Button
                onClick={onWithdraw}
                className={`bg-gray-800/60 border text-white font-medium h-11 text-sm transition-all duration-300 hover:bg-gray-700 hover:shadow-md ${isSaiDeBaixo ?
                  'border-gray-600/50 hover:border-red-500/50 hover:shadow-red-500/20' :
                  'border-gray-600/50 hover:border-emerald-500/50 hover:shadow-emerald-500/20'}`}>
                <Wallet className="w-4 h-4 mr-2" />
                Sacar
              </Button>
            </div>
          </div>

          {/* Selo digital pulsante — substitui a pilha de cédulas físicas */}
          <div className="relative w-40 h-40 flex items-center justify-center flex-shrink-0">
            <span className={`absolute inset-0 rounded-full border-2 animate-ping ${isSaiDeBaixo ? 'border-red-500/30' : 'border-emerald-400/30'}`} style={{ animationDuration: '2.6s' }} />
            <span className={`absolute inset-3 rounded-full border ${isSaiDeBaixo ? 'border-red-500/40' : 'border-emerald-400/40'}`} />
            <div className={`relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl ${isSaiDeBaixo ?
              'bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/40' :
              'bg-gradient-to-br from-emerald-400 to-green-600 shadow-emerald-500/40'}`}>
              <Wallet className="w-12 h-12 text-white drop-shadow-lg" />
              <Sparkles className={`w-5 h-5 absolute -top-1 -right-1 text-white ${isSaiDeBaixo ? '' : 'animate-pulse'}`} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}