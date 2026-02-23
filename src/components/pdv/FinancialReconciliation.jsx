import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw, DollarSign, Wallet, TrendingDown, Lock, AlertCircle } from 'lucide-react';

export default function FinancialReconciliation({ selectedDate }) {
  const [asaasData, setAsaasData] = useState(null);
  const [walletsData, setWalletsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReconciliation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const date = selectedDate || new Date().toISOString().split('T')[0];

      const [asaasResult, walletsResult] = await Promise.all([
        base44.functions.invoke('getAsaasReconciliation', { date }),
        base44.functions.invoke('getWalletsReconciliation', { date })
      ]);

      const asaas = asaasResult?.data || asaasResult;
      const wallets = walletsResult?.data || walletsResult;

      if (!asaas.success || !wallets.success) {
        throw new Error('Erro ao buscar dados de reconciliação');
      }

      setAsaasData(asaas);
      setWalletsData(wallets);
    } catch (err) {
      console.error('Erro ao carregar reconciliação:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReconciliation();

    // Auto-refresh a cada 5 minutos
    const interval = setInterval(loadReconciliation, 300000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-bold text-red-900 mb-2">Erro ao carregar dados</p>
              <p className="text-sm text-red-700">{error}</p>
              <Button
                onClick={loadReconciliation}
                className="mt-4 bg-red-600 hover:bg-red-700"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const asaasTotal = asaasData?.total_received || 0;
  const walletsCredited = walletsData?.total_credited_today || 0;
  const walletsUsed = walletsData?.total_used_today || 0;
  const globalCustody = walletsData?.global_balance || 0;
  const difference = asaasTotal - walletsCredited;

  return (
    <div className="space-y-6">
      {/* Header com botão de atualização */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">💰 Conciliação Financeira</h2>
          <p className="text-sm text-gray-400">
            Data: {new Date(asaasData?.date || new Date()).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Button
          onClick={loadReconciliation}
          className="bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recebido Asaas */}
        <Card className="bg-gradient-to-br from-green-900 to-green-800 border-green-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-10 h-10 text-green-400" />
              <div className="bg-green-400/20 rounded-full px-2 py-1">
                <p className="text-xs text-green-300">{asaasData?.payments_count || 0} pagamentos</p>
              </div>
            </div>
            <p className="text-sm text-green-300 mb-1">Total Recebido (Asaas)</p>
            <p className="text-3xl font-bold text-white">
              R$ {asaasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className="mt-3 pt-3 border-t border-green-700/50 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-green-300">PIX:</span>
                <span className="text-white font-semibold">R$ {(asaasData?.breakdown?.pix || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-300">Boleto:</span>
                <span className="text-white font-semibold">R$ {(asaasData?.breakdown?.boleto || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-300">Cartão:</span>
                <span className="text-white font-semibold">R$ {(asaasData?.breakdown?.credit_card || 0).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Creditado em Carteiras */}
        <Card className="bg-gradient-to-br from-blue-900 to-blue-800 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Wallet className="w-10 h-10 text-blue-400" />
              <div className="bg-blue-400/20 rounded-full px-2 py-1">
                <p className="text-xs text-blue-300">{walletsData?.deposits_count || 0} depósitos</p>
              </div>
            </div>
            <p className="text-sm text-blue-300 mb-1">Creditado em Carteiras</p>
            <p className="text-3xl font-bold text-white">
              R$ {walletsCredited.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className="mt-3 pt-3 border-t border-blue-700/50 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-blue-300">Carteira Digital:</span>
                <span className="text-white font-semibold">R$ {(walletsData?.breakdown?.digital_wallet || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-blue-300">Carteira Comissão:</span>
                <span className="text-white font-semibold">R$ {(walletsData?.breakdown?.commission_wallet || 0).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Usado em Vendas */}
        <Card className="bg-gradient-to-br from-orange-900 to-orange-800 border-orange-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <TrendingDown className="w-10 h-10 text-orange-400" />
              <div className="bg-orange-400/20 rounded-full px-2 py-1">
                <p className="text-xs text-orange-300">{walletsData?.usage_count || 0} transações</p>
              </div>
            </div>
            <p className="text-sm text-orange-300 mb-1">Usado em Vendas</p>
            <p className="text-3xl font-bold text-white">
              R$ {walletsUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-orange-300 mt-3">
              Pagamentos via carteira interna
            </p>
          </CardContent>
        </Card>

        {/* Saldo Global sob Custódia */}
        <Card className="bg-gradient-to-br from-purple-900 to-purple-800 border-purple-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Lock className="w-10 h-10 text-purple-400" />
            </div>
            <p className="text-sm text-purple-300 mb-1">Saldo sob Custódia</p>
            <p className="text-3xl font-bold text-white">
              R$ {globalCustody.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-purple-300 mt-3">
              Todas as carteiras do sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Card de diferença (Asaas - Creditado) */}
      <Card className={`${difference >= 0 ? 'bg-gradient-to-br from-green-900 to-green-800 border-green-600' : 'bg-gradient-to-br from-red-900 to-red-800 border-red-600'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 mb-2">
                Diferença (Asaas - Creditado em Carteiras)
              </p>
              <p className={`text-4xl font-bold ${difference >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {difference >= 0 ? '+' : ''} R$ {difference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-white/60 mt-2">
                {difference >= 0 
                  ? '✅ Valor positivo indica pagamentos processados não creditados ainda'
                  : '⚠️ Valor negativo indica possível inconsistência'
                }
              </p>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${difference >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <span className="text-3xl">{difference >= 0 ? '✓' : '⚠'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo detalhado */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">📊 Resumo Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-300">Total Recebido Asaas:</span>
              <span className="text-white font-bold">R$ {asaasTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-300">Total Creditado Carteiras:</span>
              <span className="text-blue-400 font-bold">R$ {walletsCredited.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-300">Total Usado em Vendas:</span>
              <span className="text-orange-400 font-bold">R$ {walletsUsed.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-300">Diferença:</span>
              <span className={`font-bold ${difference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {difference >= 0 ? '+' : ''} R$ {difference.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-300 font-bold">Saldo Global sob Custódia:</span>
              <span className="text-purple-400 font-bold text-xl">R$ {globalCustody.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}