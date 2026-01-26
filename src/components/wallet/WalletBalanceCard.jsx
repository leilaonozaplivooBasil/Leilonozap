import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Wallet, Clock } from 'lucide-react';

export default function WalletBalanceCard({ 
  totalAvailable, 
  pendingWithdrawalAmount, 
  isSaiDeBaixo, 
  onUseInAuctions, 
  onWithdraw,
  walletCardRef 
}) {
  return (
    <Card 
      ref={walletCardRef} 
      className={`mb-8 bg-gradient-to-br backdrop-blur-sm overflow-hidden ${
        isSaiDeBaixo ?
        'from-red-900/30 to-red-800/20 border-red-500/30' :
        'from-green-900/30 to-green-800/20 border-green-500/30'
      }`}
    >
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-2">Saldo Disponível</h3>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-5xl font-bold text-white">
                R$ {totalAvailable.toFixed(2)}
              </span>
            </div>

            {pendingWithdrawalAmount > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-400 font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Saque em Processo: R$ {pendingWithdrawalAmount.toFixed(2)}
                </p>
                <p className="text-xs text-yellow-300/70 mt-1">
                  Aguardando aprovação
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={onUseInAuctions}
                className={`w-full sm:flex-1 text-sm sm:text-base ${
                  isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <Zap className="w-4 h-4 mr-2" />
                Usar em Leilões
              </Button>
              <Button
                onClick={onWithdraw}
                className="w-full sm:flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm sm:text-base"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Sacar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}