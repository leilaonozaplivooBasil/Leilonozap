import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Wallet, Clock, Sparkles, ArrowRightLeft } from 'lucide-react';

// 💳 Cartão de saldo — estilo Mercado Pago (fundo claro, cards com borda
// cinza), mantendo o selo digital verde pulsante que já existia.
export default function WalletBalanceCard({ cardRef, totalAvailable, pendingWithdrawalAmount, isSaiDeBaixo, onUseNow, onWithdraw, onTransfer }) {
  // 🔥 Carteira na cor do fogo da logo (decisão do dono, 08/08/2026)
  const accentText = isSaiDeBaixo ? 'text-red-600' : 'text-nz-fogo';
  const accentBg = isSaiDeBaixo ? 'from-red-500 to-red-700' : 'from-nz-fogo-claro to-nz-fogo-escuro';

  return (
    <Card ref={cardRef} className="mb-8 bg-white border-gray-200 shadow-sm">
      <CardContent className="relative p-6 md:px-10 md:py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12">
          <div className="w-full md:w-auto">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border mb-3 ${isSaiDeBaixo ? 'text-red-600 border-red-200 bg-red-50' : 'text-nz-verde border-nz-verde/20 bg-nz-verde-fundo'}`}>
              <Wallet className="w-3 h-3" /> Comissão a receber
            </span>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-5xl font-black text-gray-900 tracking-tight">
                R$ {totalAvailable.toFixed(2)}
              </span>
            </div>
            {/* ITEM 1 DA AUDITORIA — este número é COMISSÃO, não é o saldo da
                carteira digital. Nomes iguais para grandezas diferentes faziam o
                usuário achar que o sistema tinha perdido dinheiro dele. */}
            <p className="text-xs mb-4 text-gray-500">
              das suas vendas · saque a partir de R$ 30
            </p>

            <div className="h-px bg-gray-100 my-2 max-w-[320px]" />

            {pendingWithdrawalAmount > 0 &&
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 max-w-[320px]">
                <p className="text-sm text-orange-600 font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Saque em Processo: R$ {pendingWithdrawalAmount.toFixed(2)}
                </p>
                <p className="text-xs text-orange-500/80 mt-1">Aguardando aprovação</p>
              </div>
            }

            <div className="flex flex-wrap gap-2 max-w-[320px]">
              <Button
                onClick={onUseNow}
                className={`text-white font-semibold h-11 text-sm shadow-sm flex-1 min-w-[130px] ${isSaiDeBaixo ?
                  'bg-red-600 hover:bg-red-700' :
                  'bg-nz-verde-claro hover:bg-nz-verde'}`}>
                <Zap className="w-4 h-4 mr-2" />
                Usar Agora
              </Button>
              <Button
                onClick={onWithdraw}
                variant="outline"
                className="border-nz-marrom/30 text-gray-700 font-medium h-11 text-sm flex-1 min-w-[130px] hover:bg-nz-marrom-fundo/40">
                <Wallet className="w-4 h-4 mr-2" />
                Sacar
              </Button>
              {onTransfer &&
                <Button
                  onClick={onTransfer}
                  variant="outline"
                  className="border-nz-marrom/30 text-gray-700 font-medium h-11 text-sm w-full hover:bg-nz-marrom-fundo/40">
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Transferir Saldo
                </Button>
              }
            </div>
          </div>

          {/* Selo digital pulsante */}
          <div className="relative w-32 h-32 flex items-center justify-center flex-shrink-0 mr-2 sm:mr-6 md:mr-8">
            <span className={`absolute inset-0 rounded-full border-2 animate-ping ${isSaiDeBaixo ? 'border-red-300' : 'border-nz-fogo/45'}`} style={{ animationDuration: '2.6s' }} />
            <span className={`absolute inset-3 rounded-full border ${isSaiDeBaixo ? 'border-red-200' : 'border-nz-fogo/25'}`} />
            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl bg-gradient-to-br ${accentBg}`}>
              <Wallet className="w-10 h-10 text-white drop-shadow-lg" />
              <Sparkles className={`w-5 h-5 absolute -top-1 -right-1 text-white ${isSaiDeBaixo ? '' : 'animate-pulse'}`} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}