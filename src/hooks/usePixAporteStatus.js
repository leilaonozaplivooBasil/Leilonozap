import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

// 💚 Vigia o PIX do aporte do Parceiro até o pagamento ser confirmado.
//
// Por que não só setInterval: no celular o navegador CONGELA timers quando o
// parceiro sai para o app do banco. Ao voltar, o intervalo pode ficar minutos
// parado e a tela mente que não pagou. Por isso, além do ciclo de 8s, a
// checagem também dispara na hora em visibilitychange e focus.
//
// ⚠️ SOMENTE LEITURA: usa a mesma function checkPartnerPlanPayment do botão
// manual. Não cria pagamento, não altera valor, não movimenta saldo.
const INTERVALO_MS = 8000;
const LIMITE_MS = 15 * 60 * 1000; // 15 min: PIX velho, para de consultar

export default function usePixAporteStatus(billingId, onConfirmado) {
  const [verificando, setVerificando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [expirado, setExpirado] = useState(false);
  const emVooRef = useRef(false);
  const confirmadoRef = useRef(false);
  const inicioRef = useRef(Date.now());
  const onConfirmadoRef = useRef(onConfirmado);
  onConfirmadoRef.current = onConfirmado;

  // Uma única rotina de checagem, compartilhada pelo ciclo e pelos eventos.
  const verificar = async () => {
    if (!billingId || confirmadoRef.current || emVooRef.current) return false;
    emVooRef.current = true;
    setVerificando(true);
    try {
      const resp = await base44.functions.invoke('checkPartnerPlanPayment', {
        billing_id: billingId,
      });
      const pago = resp?.data?.is_paid || resp?.is_paid;
      if (pago) {
        confirmadoRef.current = true;
        setConfirmado(true);
        onConfirmadoRef.current?.();
        return true;
      }
      return false;
    } catch {
      return false; // rede oscilou: o próximo ciclo tenta de novo
    } finally {
      emVooRef.current = false;
      setVerificando(false);
    }
  };

  useEffect(() => {
    if (!billingId) return;
    confirmadoRef.current = false;
    setConfirmado(false);
    setExpirado(false);
    inicioRef.current = Date.now();

    const expirou = () => Date.now() - inicioRef.current > LIMITE_MS;

    const ciclo = setInterval(() => {
      if (confirmadoRef.current) return;
      if (expirou()) {
        setExpirado(true);
        clearInterval(ciclo);
        return;
      }
      // aba oculta: não gasta rede à toa — o retorno já dispara a checagem
      if (document.visibilityState === 'visible') verificar();
    }, INTERVALO_MS);

    // 📱 Voltou do app do banco: confere IMEDIATAMENTE
    const aoVoltar = () => {
      if (confirmadoRef.current || expirou()) return;
      if (document.visibilityState === 'visible') verificar();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);

    return () => {
      clearInterval(ciclo);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
    };
     
  }, [billingId]);

  return { verificando, confirmado, expirado, verificarAgora: verificar };
}