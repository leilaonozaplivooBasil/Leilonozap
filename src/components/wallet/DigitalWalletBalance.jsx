import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DigitalWalletBalance({ userId, showActions = true }) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadBalance();
  }, [userId]);

  const loadBalance = async () => {
    try {
      const wallets = await base44.entities.DigitalWallet.filter({ user_id: userId });
      
      if (wallets && wallets.length > 0) {
        // Pega o saldo total somando todas as wallets
        const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
        setBalance(totalBalance);

        // Se há múltiplas wallets, consolidar em uma só (limpeza)
        if (wallets.length > 1) {
          console.log(`⚠️ Consolidando ${wallets.length} wallets duplicadas para user ${userId}`);
          // Mantém a primeira, deleta as demais após mover saldo
          const primary = wallets[0];
          for (let i = 1; i < wallets.length; i++) {
            try {
              await base44.entities.DigitalWallet.delete(wallets[i].id);
            } catch (e) {
              console.debug('Erro ao remover wallet duplicada:', e.message);
            }
          }
          // Atualiza a primária com o saldo consolidado
          if (totalBalance !== (primary.balance || 0)) {
            await base44.entities.DigitalWallet.update(primary.id, { balance: totalBalance });
          }
        }
      } else {
        // NÃO cria wallet automaticamente - será criada apenas pelo webhook ao receber pagamento
        setBalance(0);
      }
    } catch (error) {
      console.error('Erro ao carregar saldo digital:', error);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-xl bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const CardWrapper = showActions ? Link : 'div';
  const cardProps = showActions ? { to: createPageUrl('WalletHistory') } : {};

  return (
    <CardWrapper {...cardProps}>
      <Card className={`backdrop-blur-xl bg-white/5 border-white/10 shadow-2xl ${showActions ? 'hover:border-green-400/30 cursor-pointer transition-all' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                  Carteira Digital
                </p>
              </div>
              <p className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                R$ {balance.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Saldo disponível para leilões</p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"></div>
              <div className="relative p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl border border-green-400/20">
                <Wallet className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}