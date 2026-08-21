import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import { useCopiarPix } from '@/hooks/useCopiarPix';
import usePixAporteStatus from '@/hooks/usePixAporteStatus';
import ParceiroPixConfirmado from './ParceiroPixConfirmado';
import ParceiroPixRecusado from './ParceiroPixRecusado';

// 💚 Tela do QR Code PIX do aporte + verificação de pagamento.
// ⚠️ Lógica financeira copiada 1:1 de InvestorDashboard (mesma function
// checkPartnerPlanPayment, mesmo billing_id, mesmo comportamento).
export default function ParceiroPixQrCode({ pixData, valor, plano, onCancelar, onPagamentoConfirmado }) {
  const { copiado: pixCopiado, copiar: copiarPix } = useCopiarPix();
  const { copiado: pixCopiado2, copiar: copiarPix2 } = useCopiarPix();
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  // 🔄 Confirmação automática: ciclo de 8s + checagem imediata ao voltar do
  // app do banco. O botão manual abaixo continua existindo.
  const { verificando, confirmado, expirado, recusado, motivoRecusa } = usePixAporteStatus(
    pixData?.billing_id,
    () => {
      toast.success('✅ Pagamento PIX confirmado!');
    }
  );

  // ✅ Confirmado: mostra o comprovante antes de fechar o modal
  if (confirmado) {
    return (
      <ParceiroPixConfirmado
        plano={plano}
        valor={valor}
        onConcluir={onPagamentoConfirmado}
      />
    );
  }

  // ❌ Cobrança recusada pelo Mercado Pago: mostra o motivo em vez de girar sem fim
  if (recusado) {
    return (
      <ParceiroPixRecusado valor={valor} motivoDetalhe={motivoRecusa} onGerarNovo={onCancelar} />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      <h3 className="text-lg font-bold text-pc-tinta text-center">Pague com PIX</h3>
      <div className="bg-white p-4">
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
        className={`w-full min-h-[48px] font-bold py-4 text-base transition-colors ${pixCopiado ? 'bg-pc-ouro-claro text-pc-preto hover:bg-pc-ouro-claro' : 'bg-pc-ouro text-pc-preto hover:bg-pc-ouro-claro'}`}
      >
        {pixCopiado ? '✅ Código PIX copiado!' : 'Copiar Código PIX e Ir para Banco'}
      </Button>

      <div className="bg-pc-preto-2 p-3 border border-pc-borda">
        <p className="text-[10px] uppercase tracking-[0.15em] text-pc-ouro mb-2 font-semibold">Código PIX (Copia e Cola)</p>
        <div className="flex gap-2">
          <Input
            value={pixData.pix_code}
            readOnly
            className="text-xs bg-pc-preto border-pc-borda text-pc-tinta font-mono"
          />
          <Button
            onClick={() => copiarPix2(pixData.pix_code)}
            size="icon"
            variant="outline"
            className={`flex-shrink-0 border-pc-ouro transition-colors ${pixCopiado2 ? 'bg-pc-ouro text-pc-preto hover:bg-pc-ouro' : 'bg-pc-preto text-pc-ouro hover:bg-pc-preto-2'}`}
          >
            {pixCopiado2 ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <p className="text-2xl font-bold text-pc-ouro text-center">
        R$ {(valor || 0).toLocaleString('pt-BR')}
      </p>

      {/* ⏳ Estado da espera — o parceiro não fica no vácuo */}
      <p className="flex items-center justify-center gap-2 text-center text-[11px] text-pc-tinta-fraca">
        {expirado ? (
          <>Este PIX está aberto há muito tempo. Use o botão abaixo ou gere um novo código.</>
        ) : (
          <>
            <Loader2 className={`h-3.5 w-3.5 ${verificando ? 'animate-spin' : ''}`} />
            Aguardando a confirmação do PIX — assim que o banco confirmar, esta tela avisa
            automaticamente.
          </>
        )}
      </p>

      <Button
        onClick={async () => {
          setIsCheckingPayment(true);
          try {
            toast.info('Verificando pagamento PIX...');
            const response = await plataforma.functions.invoke('checkPartnerPlanPayment', {
              billing_id: pixData.billing_id,
            });
            if (response?.data?.is_paid || response?.is_paid) {
              toast.success('✅ Pagamento PIX confirmado!');
              await onPagamentoConfirmado();
            } else if (response?.data?.is_rejected || response?.is_rejected) {
              // o próprio ciclo automático já troca a tela pelo aviso com o motivo
              toast.error('Cobrança recusada pelo Mercado Pago. Veja o motivo na tela.');
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
        className="w-full min-h-[48px] bg-transparent border border-pc-ouro text-pc-ouro hover:bg-pc-ouro hover:text-pc-preto font-bold py-4"
      >
        {isCheckingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Já efetuei o PIX (verificar pagamento)</>}
      </Button>

      <Button
        onClick={onCancelar}
        variant="outline"
        className="w-full min-h-[48px] bg-pc-preto-2 hover:border-pc-ouro hover:bg-pc-preto-2 border-pc-borda text-pc-tinta"
      >
        Cancelar
      </Button>
    </motion.div>
  );
}