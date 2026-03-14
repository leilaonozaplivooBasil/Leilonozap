import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from 'lucide-react';
import { toast } from "sonner";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function WithdrawalModal({ user, totalAvailable, onClose, onSuccess }) {
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('CPF');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (!amount || amount <= 0 || isNaN(amount)) { toast.error('Valor inválido'); return; }
    if (amount < 30) { toast.error('Saque mínimo é de R$ 30,00'); return; }
    if (amount > totalAvailable) { toast.error('Saldo indisponível'); return; }
    if (!pixKey || pixKey.trim() === '') { toast.error('Informe a chave PIX'); return; }

    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('requestWithdrawal', {
        amount, pix_key: pixKey, pix_key_type: pixKeyType
      });
      const data = response?.data;
      if (data?.success) {
        toast.success(data.message || 'Saque solicitado com sucesso!');
        onSuccess();
      } else {
        toast.error(data?.error || 'Erro ao solicitar saque');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('❌ ERRO 404: Função de saque não encontrada.');
        try {
          await base44.entities.SystemLog.create({
            step: 'WITHDRAWAL_404_ERROR', status: 'error',
            message: 'Função requestWithdrawal retornou 404',
            component_name: 'WithdrawalModal', entity_id: user.id,
            payload: { error: error.message, status: error.response?.status, timestamp: new Date().toISOString() }
          });
        } catch {}
      } else if (error.message?.includes('Network')) {
        toast.error('❌ Erro de conexão.');
      } else {
        toast.error(`❌ Erro: ${error.message || 'Erro desconhecido'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h3 className="text-2xl font-bold text-white">💸 Solicitar Saque</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" disabled={isProcessing}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
            <p className="text-sm text-gray-300 mb-1">Saldo Disponível para Saque:</p>
            <p className="text-3xl font-bold text-green-400">R$ {totalAvailable.toFixed(2)}</p>
          </div>
          <div>
            <Label className="text-gray-300">Valor do Saque</Label>
            <Input type="number" value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value)} placeholder="0.00" min="30" className="bg-gray-700 border-gray-600 text-white text-lg" disabled={isProcessing} />
            <p className="text-xs text-gray-400 mt-1">Valor mínimo: R$ 30,00</p>
          </div>
          <div>
            <Label className="text-gray-300">Tipo de Chave PIX</Label>
            <select value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value)} className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white" disabled={isProcessing}>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="EMAIL">E-mail</option>
              <option value="PHONE">Telefone</option>
              <option value="RANDOM">Chave Aleatória</option>
            </select>
          </div>
          <div>
            <Label className="text-gray-300">Chave PIX</Label>
            <Input type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Sua chave PIX" className="bg-gray-700 border-gray-600 text-white" disabled={isProcessing} />
          </div>
          <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
            <p className="text-sm text-blue-300">ℹ️ O saque será processado em até 2 dias úteis após aprovação.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1 border-gray-600 text-gray-300" disabled={isProcessing}>Cancelar</Button>
            <Button type="button" onClick={handleSubmit} className="flex-1 bg-green-600 hover:bg-green-700" disabled={isProcessing}>
              {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Processando...</> : 'Solicitar Saque'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}