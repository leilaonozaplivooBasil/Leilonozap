import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { fmtBR } from "@/lib/money";
import { Loader2, QrCode, Copy, CheckCircle2 } from "lucide-react";

// 💳 Cobra a diferença do frete (não coberta pela adesão) via PIX, antes de liberar
// o "Fechar pedido". Reaproveita o mesmo motor de confirmação do resto do site
// (checkPaymentStatus + mpWebhook), sem inventar um fluxo de pagamento novo.
export default function VendedorFretePagamento({ amount, cep, freteId, items, user, onPaid }) {
  const [creating, setCreating] = useState(false);
  const [pix, setPix] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const startPolling = (paymentId) => {
    const check = async () => {
      try {
        const res = await base44.functions.invoke("checkPaymentStatus", { payment_id: paymentId });
        const status = res?.data?.status || res?.status;
        if (status === "confirmed" || status === "approved") {
          clearInterval(pollRef.current);
          setConfirmed(true);
          setTimeout(() => onPaid?.(), 800);
        }
      } catch (_) { /* tenta de novo no próximo tick */ }
    };
    pollRef.current = setInterval(check, 4000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });
    check();
  };

  const handlePagar = async () => {
    setCreating(true);
    try {
      const res = await base44.functions.invoke("createSellerFreightPayment", {
        user_id: user.id,
        items,
        cep,
        frete_id: freteId,
        buyer_name: user.full_name,
        buyer_email: user.email,
        buyer_cpf: user.cpf,
      });
      if (res?.success) {
        setPix(res);
        startPolling(res.payment_id);
      } else {
        toast.error(res?.error || "Não foi possível gerar o PIX do frete.");
      }
    } catch (_) {
      toast.error("Erro ao gerar pagamento do frete. Tente novamente.");
    } finally {
      setCreating(false);
    }
  };

  const copyPix = () => {
    if (!pix?.pix_payload) return;
    navigator.clipboard.writeText(pix.pix_payload);
    toast.success("Código PIX copiado!");
  };

  if (confirmed) {
    return (
      <div className="mt-3 rounded-xl border border-nz-verde/30 bg-nz-verde-fundo p-4 text-center">
        <CheckCircle2 className="w-8 h-8 text-nz-verde mx-auto mb-1" />
        <p className="font-bold text-nz-verde">Frete pago! Já pode fechar o pedido.</p>
      </div>
    );
  }

  if (pix) {
    return (
      <div className="mt-3 rounded-xl border border-nz-borda bg-white p-4 text-center">
        <p className="font-bold mb-2 text-sm">Escaneie ou copie o código PIX do frete</p>
        {pix.pix_qr_code && <img src={pix.pix_qr_code} alt="QR Code PIX do frete" className="w-40 h-40 mx-auto rounded-lg border border-nz-borda" />}
        <button onClick={copyPix} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-white bg-nz-verde hover:bg-nz-verde/90">
          <Copy className="w-4 h-4" /> Copiar código PIX
        </button>
        <p className="text-xs text-nz-tinta-fraca mt-2 flex items-center justify-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Aguardando confirmação do pagamento…
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm text-amber-800">
        O frete de <strong>R$ {fmtBR(amount)}</strong> não está incluso no saldo da sua primeira compra — pague via PIX para liberar o fechamento do pedido.
      </p>
      <button
        onClick={handlePagar}
        disabled={creating}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-white bg-nz-verde hover:bg-nz-verde/90 disabled:opacity-60"
      >
        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
        Pagar frete R$ {fmtBR(amount)} via PIX
      </button>
    </div>
  );
}