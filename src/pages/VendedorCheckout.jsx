import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { fmtBR } from "@/lib/money";
import { Loader2, ShoppingBag, QrCode, Copy, CheckCircle2, UserPlus, Clock, CreditCard, Wallet } from "lucide-react";
import VendedorProductStrip from "@/components/vendedor/VendedorProductStrip";
import VendedorProductPreviewModal from "@/components/vendedor/VendedorProductPreviewModal";
import VendedorAddressForm from "@/components/vendedor/VendedorAddressForm";

// 🆕 Mesmo checkout serve Vendedor (R$1.497) e Licenciado (R$100.000) — só muda o
// texto e o valor. O tipo vem por ?tipo=licenciado na URL e persiste no
// sessionStorage pra sobreviver ao redirect de volta do pagamento com cartão.
const TIPO_CONFIG = {
  vendedor: { label: "Vendedor", valor: 1497 },
  licenciado: { label: "Licenciado", valor: 100000 },
};

// 💳 ETAPA 1 do fluxo "Seja Vendedor/Licenciado" — pagamento único que libera o
// saldo pra escolher produtos na Etapa 2 (/VendedorEscolherProdutos). Não é
// clicável a vitrine de produtos aqui: é só decoração, pra não distrair do pagamento.
export default function VendedorCheckout() {
  const navigate = useNavigate();
  const [tipo] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("tipo");
      if (fromUrl === "licenciado" || fromUrl === "vendedor") {
        sessionStorage.setItem("sejaTipo", fromUrl);
        return fromUrl;
      }
      // Retorno do pagamento com cartão (Mercado Pago) traz payment_id na URL, sem
      // ?tipo= — nesse caso (e só nesse) usa o tipo salvo antes do redirect.
      if (params.get("payment_id")) {
        return sessionStorage.getItem("sejaTipo") === "licenciado" ? "licenciado" : "vendedor";
      }
      return "vendedor";
    } catch { return "vendedor"; }
  });
  const cfg = TIPO_CONFIG[tipo];
  const VALOR_ADESAO = cfg.valor;
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [pix, setPix] = useState(null); // { payment_id, pix_qr_code, pix_payload }
  const [confirmed, setConfirmed] = useState(false);
  const pollRef = useRef(null);
  const [address, setAddress] = useState({ zip: "", number: "", street: "", complement: "", neighborhood: "", city: "", state: "" });
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [gateway, setGateway] = useState("pix"); // "pix" | "card" | "test_balance"

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
        setAddress({
          zip: freshUser.address_zip_code || "",
          number: freshUser.address_number || "",
          street: freshUser.address_street || "",
          complement: freshUser.address_complement || "",
          neighborhood: freshUser.address_neighborhood || "",
          city: freshUser.address_city || "",
          state: freshUser.address_state || "",
        });

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

  // 📮 Autocompleta rua/bairro/cidade/UF quando o CEP fica completo (igual à nossa página de Checkout)
  useEffect(() => {
    const cleanCep = (address.zip || "").replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    let cancelled = false;
    (async () => {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (cancelled || data.erro) return;
        setAddress((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      } catch (e) { /* silencioso, usuário preenche na mão */ }
      finally { if (!cancelled) setIsLoadingCep(false); }
    })();
    return () => { cancelled = true; };
  }, [address.zip]);

  const isAddressComplete = address.zip?.trim() && address.number?.trim() && address.street?.trim() && address.city?.trim() && address.state?.trim();

  const blockBeforePayment = () => {
    toast.info("Faça seu pagamento para poder escolher seus produtos.");
  };

  const handlePagar = async () => {
    if (!user) {
      window.dispatchEvent(new Event("openLoginModal"));
      return;
    }
    if (!isAddressComplete) {
      toast.error("Preencha seu endereço de entrega antes de continuar.");
      return;
    }
    setCreating(true);
    try {
      // 🧪 Saldo de teste (admin) — não gera PIX/cartão, debita o saldo de teste e libera direto
      if (gateway === "test_balance") {
        const res = await base44.functions.invoke("payAdhesionWithTestBalance", {
          user_id: user.id,
          amount: VALOR_ADESAO,
        });
        if (res?.success) {
          setConfirmed(true);
          setTimeout(async () => {
            const fresh = await base44.entities.AppUser.filter({ id: user.id });
            const freshUser = fresh?.[0];
            if (freshUser) localStorage.setItem("currentUser", JSON.stringify(freshUser));
            navigate(createPageUrl("VendedorEscolherProdutos"), { replace: true });
          }, 1200);
        } else {
          toast.error(res?.error || "Saldo de teste insuficiente.");
        }
        setCreating(false);
        return;
      }
      const res = await base44.functions.invoke("createSellerAdhesionPayment", {
        user_id: user.id,
        amount: VALOR_ADESAO,
        buyer_name: user.full_name,
        buyer_email: user.email,
        buyer_cpf: user.cpf,
        address,
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
            <ShoppingBag className="w-4 h-4" /> Adesão {cfg.label}
          </span>
          <h1 className="mt-4 text-2xl sm:text-3xl font-black">Faça sua primeira compra acima de R$ {fmtBR(VALOR_ADESAO)}</h1>
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

        {user && !confirmed && (
          <VendedorAddressForm address={address} onChange={setAddress} isLoadingCep={isLoadingCep} />
        )}

        <div className="rounded-2xl border-2 border-nz-verde/30 bg-white mt-6 p-6 text-center">
          {!user ? (
            <div className="py-2">
              <UserPlus className="w-9 h-9 text-nz-verde mx-auto mb-2" />
              <p className="font-bold text-nz-tinta">Cadastre-se primeiro como usuário para concluir sua compra</p>
              <p className="text-sm text-nz-tinta-fraca mt-1.5 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> É rápido, leva menos de um minuto
              </p>
              <button
                onClick={() => {
                  sessionStorage.setItem("registerReturnTo", createPageUrl("VendedorCheckout"));
                  navigate(createPageUrl("Register"));
                }}
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
              <p className="text-sm text-nz-tinta-fraca mt-1">Pagamento único</p>

              <div className={`mt-4 grid gap-2 ${(user?.test_wallet_balance || 0) >= VALOR_ADESAO ? "grid-cols-3" : "grid-cols-2"}`}>
                <button
                  onClick={() => setGateway("pix")}
                  className={`py-2.5 rounded-lg font-bold text-sm border-2 transition-colors flex items-center justify-center gap-1.5 ${gateway === "pix" ? "border-nz-verde bg-nz-verde-fundo text-nz-verde" : "border-nz-borda text-nz-tinta-fraca"}`}
                >
                  <QrCode className="w-4 h-4" /> PIX
                </button>
                <button
                  onClick={() => setGateway("card")}
                  className={`py-2.5 rounded-lg font-bold text-sm border-2 transition-colors flex items-center justify-center gap-1.5 ${gateway === "card" ? "border-nz-verde bg-nz-verde-fundo text-nz-verde" : "border-nz-borda text-nz-tinta-fraca"}`}
                >
                  <CreditCard className="w-4 h-4" /> Cartão (até 12x)
                </button>
                {(user?.test_wallet_balance || 0) >= VALOR_ADESAO && (
                  <button
                    onClick={() => setGateway("test_balance")}
                    className={`py-2.5 rounded-lg font-bold text-sm border-2 transition-colors flex items-center justify-center gap-1.5 ${gateway === "test_balance" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-nz-borda text-nz-tinta-fraca"}`}
                  >
                    <Wallet className="w-4 h-4" /> Saldo Teste
                  </button>
                )}
              </div>

              <button
                onClick={handlePagar}
                disabled={creating || !isAddressComplete}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-white text-lg bg-nz-verde hover:bg-nz-verde/90 disabled:opacity-60 transition-colors"
              >
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : gateway === "card" ? <CreditCard className="w-5 h-5" /> : gateway === "test_balance" ? <Wallet className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                {gateway === "card" ? "Ir para pagamento com cartão" : gateway === "test_balance" ? "Pagar com saldo de teste" : "Pagar e liberar meu saldo"}
              </button>
              {!isAddressComplete && (
                <p className="text-xs text-nz-tinta-fraca mt-2">Preencha seu endereço de entrega acima para continuar.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <VendedorProductPreviewModal open={showPreview} onClose={() => setShowPreview(false)} products={products} />
    </div>
  );
}