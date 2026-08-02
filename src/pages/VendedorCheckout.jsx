import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { fmtBR } from "@/lib/money";
import { Loader2, ShoppingBag, QrCode, Copy, CheckCircle2, UserPlus, Clock } from "lucide-react";
import VendedorProductStrip from "@/components/vendedor/VendedorProductStrip";
import VendedorProductPreviewModal from "@/components/vendedor/VendedorProductPreviewModal";

const VALOR_ADESAO = 1497;

// 💳 ETAPA 1 do fluxo "Seja Vendedor" — pagamento único de R$1.497 que libera o
// saldo pra escolher produtos na Etapa 2 (/VendedorEscolherProdutos). Não é
// clicável a vitrine de produtos aqui: é só decoração, pra não distrair do pagamento.
export default function VendedorCheckout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [pix, setPix] = useState(null); // { payment_id, pix_qr_code, pix_payload }
  const [confirmed, setConfirmed] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const prods = await base44.entities.Product.filter({ catalog_active: true }, "-created_date", 500);
        setProducts(prods || []);

        const saved = localStorage.getItem("currentUser");
        if (!saved) {
          setLoading(false);
          return;
        }
        const localUser = JSON.parse(saved);

        const fresh = await base44.entities.AppUser.filter({ id: localUser.id });
        const freshUser = fresh?.[0] || localUser;
        setUser(freshUser);

        // Já pagou e tem saldo esperando? Vai direto escolher os produtos.
        if ((freshUser.seller_credit_balance || 0) > 0) {
          navigate(createPageUrl("VendedorEscolherProdutos"), { replace: true });
          return;
        }
      } catch (e) {
        console.debug("Erro ao carregar checkout de vendedor:", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const blockBeforePayment = () => {
    toast.info("Faça seu pagamento para poder escolher seus produtos.");
  };

  const handlePagar = async () => {
    if (!user) {
      window.dispatchEvent(new Event("openLoginModal"));
      return;
    }
    setCreating(true);
    try {
      const res = await base44.functions.invoke("createSellerAdhesionPayment", {
        user_id: user.id,
        amount: VALOR_ADESAO,
        buyer_name: user.full_name,
        buyer_email: user.email,
        buyer_cpf: user.cpf,
      });
      if (res?.data?.success) {
        setPix(res.data);
        startPolling(res.data.payment_id);
      } else {
        toast.error(res?.data?.error || "Não foi possível gerar o pagamento.");
      }
    } catch (e) {
      toast.error("Erro ao gerar pagamento. Tente novamente.");
    } finally {
      setCreating(false);
    }
  };

  const startPolling = (paymentId) => {
    const check = async () => {
      try {
        const res = await base44.functions.invoke("checkPaymentStatus", { payment_id: paymentId });
        const status = res?.data?.status;
        if (status === "confirmed" || status === "approved") {
          clearInterval(pollRef.current);
          setConfirmed(true);
          // aguarda o webhook creditar o saldo, então segue pra escolha de produtos
          setTimeout(async () => {
            const fresh = await base44.entities.AppUser.filter({ id: user.id });
            const freshUser = fresh?.[0];
            if (freshUser) localStorage.setItem("currentUser", JSON.stringify(freshUser));
            navigate(createPageUrl("VendedorEscolherProdutos"), { replace: true });
          }, 1500);
        }
      } catch (e) { /* tenta de novo no próximo tick */ }
    };
    pollRef.current = setInterval(check, 4000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });
    check();
  };

  const copyPix = () => {
    if (!pix?.pix_payload) return;
    navigator.clipboard.writeText(pix.pix_payload);
    toast.success("Código PIX copiado!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-nz-verde animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-nz-tinta px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border border-nz-verde/30 bg-nz-verde-fundo text-nz-verde">
            <ShoppingBag className="w-4 h-4" /> Adesão Vendedor
          </span>
          <h1 className="mt-4 text-2xl sm:text-3xl font-black">Faça sua primeira compra acima de R$ 1.497</h1>
          <p className="mt-2 text-nz-tinta-fraca text-sm">
            Pague uma vez e o saldo é liberado na hora pra você escolher seus produtos na Loja Virtual.
          </p>
        </div>

        <div onClick={pix ? undefined : blockBeforePayment} className="rounded-2xl border border-nz-borda bg-nz-cinza-fundo p-3">
          <VendedorProductStrip products={products.slice(0, 20)} />
          <button
            onClick={(e) => { e.stopPropagation(); pix ? blockBeforePayment() : setShowPreview(true); }}
            className="w-full mt-2 text-sm font-semibold text-nz-verde hover:underline"
          >
            Ver produtos da Loja Virtual
          </button>
        </div>

        <div className="rounded-2xl border-2 border-nz-verde/30 bg-white mt-6 p-6 text-center">
          {!user ? (
            <div className="py-2">
              <UserPlus className="w-9 h-9 text-nz-verde mx-auto mb-2" />
              <p className="font-bold text-nz-tinta">Cadastre-se primeiro como usuário para concluir sua compra</p>
              <p className="text-sm text-nz-tinta-fraca mt-1.5 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> É rápido, leva menos de um minuto
              </p>
              <button
                onClick={() => window.dispatchEvent(new Event("openLoginModal"))}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-white text-lg bg-nz-verde hover:bg-nz-verde/90 transition-colors"
              >
                <UserPlus className="w-5 h-5" /> Cadastrar / Entrar
              </button>
            </div>
          ) : confirmed ? (
            <div className="py-4">
              <CheckCircle2 className="w-10 h-10 text-nz-verde mx-auto mb-2" />
              <p className="font-bold text-nz-verde">Pagamento confirmado! Liberando seu saldo…</p>
            </div>
          ) : pix ? (
            <div>
              <p className="font-bold mb-3">Escaneie ou copie o código PIX</p>
              {pix.pix_qr_code && (
                <img src={pix.pix_qr_code} alt="QR Code PIX" className="w-48 h-48 mx-auto rounded-xl border border-nz-borda" />
              )}
              <button
                onClick={copyPix}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-nz-verde hover:bg-nz-verde/90"
              >
                <Copy className="w-4 h-4" /> Copiar código PIX
              </button>
              <p className="text-xs text-nz-tinta-fraca mt-3 flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Aguardando confirmação do pagamento…
              </p>
            </div>
          ) : (
            <div>
              <p className="text-3xl font-black text-nz-tinta">R$ {fmtBR(VALOR_ADESAO)}</p>
              <p className="text-sm text-nz-tinta-fraca mt-1">Pagamento único via PIX</p>
              <button
                onClick={handlePagar}
                disabled={creating}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-white text-lg bg-nz-verde hover:bg-nz-verde/90 disabled:opacity-60 transition-colors"
              >
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                Pagar e liberar meu saldo
              </button>
            </div>
          )}
        </div>
      </div>

      <VendedorProductPreviewModal open={showPreview} onClose={() => setShowPreview(false)} products={products} />
    </div>
  );
}