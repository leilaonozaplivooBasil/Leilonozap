import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useCopiarPix } from '@/hooks/useCopiarPix';

// 💚 Tela do QR Code PIX do aporte + verificação de pagamento.
// ⚠️ Lógica financeira copiada 1:1 de InvestorDashboard (mesma function
// checkPartnerPlanPayment, mesmo billing_id, mesmo comportamento).
export default function ParceiroPixQrCode({ pixData, valor, onCancelar, onPagamentoConfirmado }) {
  const { copiado: pixCopiado, copiar: copiarPix } = useCopiarPix();
  const { copiado: pixCopiado2, copiar: copiarPix2 } = useCopiarPix();
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      <h3 className="text-lg font-bold text-white text-center">💚 Pague com PIX</h3>
      <div className="bg-white rounded-lg p-4">
        <img src={pixData.qr_code_base64} alt="QR Code PIX" className="w-64 h-64 mx-auto" />
      </div>

      <Button
        onClick={async () => {
          const ok = await copiarPix(pixData.pix_code);
          if (!ok) return; // não copiou: não manda o cliente pro banco sem o código
          const isAndroid = /Android/i.test(navigator.userAgent);
          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
          if (isAndroid || isIOS) {
            setTimeout(() => {
              window.location.href = 'intent://pay#Intent;scheme=http;end';
            }, 300);
          }
        }}
        className={`w-full text-white font-bold py-4 text-base transition-colors ${pixCopiado ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-green-700 hover:bg-green-800'}`}
      >
        {pixCopiado ? '✅ Código PIX copiado!' : 'Copiar Código PIX e Ir para Banco'}
      </Button>

      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
        <p className="text-xs text-gray-400 mb-2 font-semibold">CÓDIGO PIX (Copia e Cola):</p>
        <div className="flex gap-2">
          <Input
            value={pixData.pix_code}
            readOnly
            className="text-xs bg-gray-700 border-gray-600 text-white font-mono"
          />
          <Button
            onClick={() => copiarPix2(pixData.pix_code)}
            size="icon"
            variant="outline"
            className={`flex-shrink-0 border-green-600 transition-colors ${pixCopiado2 ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-green-700 hover:bg-green-600'}`}
          >
            {pixCopiado2 ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <p className="text-2xl font-bold text-green-400 text-center">
        R$ {(valor || 0).toLocaleString('pt-BR')}
      </p>

      <Button
        onClick={async () => {
          setIsCheckingPayment(true);
          try {
            toast.info('Verificando pagamento PIX...');
            const response = await base44.functions.invoke('checkPartnerPlanPayment', {
              billing_id: pixData.billing_id,
            });
            if (response?.data?.is_paid || response?.is_paid) {
              toast.success('✅ Pagamento PIX confirmado!');
              await onPagamentoConfirmado();
            } else {
              toast.info('⏳ Pagamento PIX ainda não identificado. Aguarde alguns segundos e tente novamente.');
            }
          } catch (error) {
            toast.error('Erro ao verificar pagamento: ' + error.message);
          } finally {
            setIsCheckingPayment(false);
          }
        }}
        disabled={isCheckingPayment}
        className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-4"
      >
        {isCheckingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <>💰 Já efetuei o PIX (verificar pagamento)</>}
      </Button>

      <Button
        onClick={onCancelar}
        variant="outline"
        className="w-full bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300"
      >
        Cancelar
      </Button>
    </motion.div>
  );
}