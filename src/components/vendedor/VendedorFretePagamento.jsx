import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { plataforma } from "@/api/plataformaClient";
import { fmtBR } from "@/lib/money";
import { Loader2, QrCode, Copy, CheckCircle2, CreditCard } from "lucide-react";

// 💳 Cobra o frete (se houver) + o complemento do valor (quando o total escolhido passa do
// saldo da adesão) em UM ÚNICO pagamento — PIX ou cartão — antes de liberar "Fechar pedido".
// Reaproveita o mesmo motor de confirmação do resto do site (checkPaymentStatus + mpWebhook).
export default function VendedorFretePagamento({ freteValor = 0, complemento = 0, deliveryMethod, cep, freteId, items, user, onPaid }) {
  const [gateway, setGateway] = useState("pix");
  const [creating, setCreating] = useState(false);
  const [pix, setPix] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const pollRef = useRef(null);

  const amount = Math.round((Number(freteValor) + Number(complemento)) * 100) / 100;

  useEffect(() => () => clearInterval(pollRef.current), []);

  // 💳 Retorno do Checkout Pro (cartão): a Mercado Pago redireciona de volta com
  // payment_id na URL — retoma o mesmo polling usado no PIX pra confirmar o pagamento.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payId = params.get("payment_id");
    const payStatus = params.get("status");
    if (payId && payStatus) {
      window.history.replaceState(null, "", window.location.pathname);
      startPolling(payId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPolling = (paymentId) => {
    const check = async () => {
      try {
        const res = await plataforma.functions.invoke("checkPaymentStatus", { payment_id: paymentId });
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
      const res = await plataforma.functions.invoke("createSellerFreightPayment", {
        user_id: user.id,
        items,
        cep,
        frete_id: freteId,
        delivery_method: deliveryMethod,
        buyer_name: user.full_name,
        buyer_email: user.email,
        buyer_cpf: user.cpf,
        gateway,
      });
      if (res?.success && res.gateway === "card") {
        window.location.href = res.url;
        return;
      }
      if (res?.success) {
        setPix(res);
        startPolling(res.payment_id);
      } else {
        toast.error(res?.error || "Não foi possível gerar o pagamento.");
      }
    } catch (_) {
      toast.error("Erro ao gerar pagamento. Tente novamente.");
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
        <p className="font-bold text-nz-verde">Pagamento confirmado! Já pode fechar o pedido.</p>
      </div>
    );
  }

  if (pix) {
    return (
      <div className="mt-3 rounded-xl border border-nz-borda bg-white p-4 text-center">
        <p className="font-bold mb-2 text-sm">Escaneie ou copie o código PIX</p>
        {pix.pix_qr_code && <img src={pix.pix_qr_code} alt="QR Code PIX" className="w-40 h-40 mx-auto rounded-lg border border-nz-borda" />}
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
        {freteValor > 0 && complemento > 0 ? (
          <>Frete (R$ {fmtBR(freteValor)}) + o valor que passou do saldo da sua primeira compra (R$ {fmtBR(complemento)}) não estão inclusos na adesão.</>
        ) : freteValor > 0 ? (
          <>O frete de <strong>R$ {fmtBR(freteValor)}</strong> não está incluso no saldo da sua primeira compra.</>
        ) : (
          <>Você escolheu R$ {fmtBR(complemento)} além do saldo da sua primeira compra.</>
        )}
        {" "}Pague para liberar o fechamento do pedido.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setGateway("pix")}
          className={`py-2.5 rounded-lg font-bold text-sm border-2 transition-colors flex items-center justify-center gap-1.5 ${gateway === "pix" ? "border-nz-verde bg-nz-verde-fundo text-nz-verde" : "border-nz-borda text-nz-tinta-fraca bg-white"}`}
        >
          <QrCode className="w-4 h-4" /> PIX
        </button>
        <button
          onClick={() => setGateway("card")}
          className={`py-2.5 rounded-lg font-bold text-sm border-2 transition-colors flex items-center justify-center gap-1.5 ${gateway === "card" ? "border-nz-verde bg-nz-verde-fundo text-nz-verde" : "border-nz-borda text-nz-tinta-fraca bg-white"}`}
        >
          <CreditCard className="w-4 h-4" /> Cartão
        </button>
      </div>
      <button
        onClick={handlePagar}
        disabled={creating}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-white bg-nz-verde hover:bg-nz-verde/90 disabled:opacity-60"
      >
        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : gateway === "card" ? <CreditCard className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
        {gateway === "card" ? `Ir para pagamento com cartão — R$ ${fmtBR(amount)}` : `Pagar R$ ${fmtBR(amount)} via PIX`}
      </button>
    </div>
  );
}