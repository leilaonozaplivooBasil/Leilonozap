import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Wallet } from "lucide-react";

export default function WithdrawalsHistoryTab({ isSaiDeBaixo, isLoadingWithdrawals, myWithdrawals }) {
  return (
    <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
      <CardHeader>
        <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Histórico de Saques</CardTitle>
        <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
          Acompanhe suas solicitações de saque
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingWithdrawals ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : myWithdrawals.length > 0 ? (
          <div className="space-y-4">
            {myWithdrawals.map((withdrawal) => (
              <Card key={withdrawal.id} className="bg-gray-700/50 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl font-bold text-green-400">
                          R$ {withdrawal.amount.toFixed(2)}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${withdrawal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          withdrawal.status === 'approved' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            withdrawal.status === 'processing' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                              withdrawal.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                          {withdrawal.status === 'pending' && '⏳ Aguardando Aprovação'}
                          {withdrawal.status === 'approved' && '✅ Aprovado'}
                          {withdrawal.status === 'processing' && '🔄 Processando'}
                          {withdrawal.status === 'completed' && '✅ Concluído'}
                          {withdrawal.status === 'rejected' && '❌ Rejeitado'}
                          {withdrawal.status === 'failed' && '❌ Falhou'}
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-gray-400">
                        <p><strong className="text-gray-300">Chave PIX:</strong> {withdrawal.pix_key} ({withdrawal.pix_key_type})</p>
                        <p><strong className="text-gray-300">Solicitado em:</strong> {new Date(withdrawal.created_date).toLocaleString('pt-BR')}</p>
                        {withdrawal.processed_date && (
                          <p className="text-green-400"><strong>Processado em:</strong> {new Date(withdrawal.processed_date).toLocaleString('pt-BR')}</p>
                        )}
                        {withdrawal.notes && (
                          <p className="text-gray-500 italic mt-2">Obs: {withdrawal.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Wallet className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="font-semibold">Nenhum saque solicitado ainda</p>
            <p className="text-sm mt-2">Use o botão "Sacar Dinheiro" para solicitar seu primeiro saque</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}