import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { fmtBR } from "@/lib/money";
import { Loader2, CheckCircle2, Truck, Store } from "lucide-react";
import VendedorProductPicker from "@/components/vendedor/VendedorProductPicker";
import VendedorCartBar from "@/components/vendedor/VendedorCartBar";
import CalculadoraFrete from "@/components/frete/CalculadoraFrete";

// 🛍️ ETAPA 2 do fluxo "Seja Vendedor" — usa o saldo da adesão (já pago) para
// escolher QUALQUER produto da Loja Virtual. Fecha o pedido só quando o total
// escolhido atinge o saldo disponível.
export default function VendedorEscolherProdutos() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [done, setDone] = useState(false);
  // 🚚 Entrega — retirar (sem custo) ou receber em casa (frete calculado pelos produtos escolhidos)
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [freteSel, setFreteSel] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem("currentUser");
        if (!saved) {
          navigate(createPageUrl("SejaVendedor"), { replace: true });
          return;
        }
        const localUser = JSON.parse(saved);
        const fresh = await base44.entities.AppUser.filter({ id: localUser.id });
        const freshUser = fresh?.[0] || localUser;

        if (!(freshUser.seller_credit_balance > 0)) {
          navigate(createPageUrl("VendedorCheckout"), { replace: true });
          return;
        }
        setUser(freshUser);

        const prods = await base44.entities.Product.filter({ catalog_active: true }, "-created_date", 240);
        setProducts(prods || []);
      } catch (e) {
        console.debug("Erro ao carregar escolha de produtos:", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const total = useMemo(
    () => Object.values(cart).reduce((sum, it) => sum + it.qty * (it.product.price_catalog || 0), 0),
    [cart]
  );

  const freteItems = useMemo(
    () => Object.values(cart).map((it) => ({ id: it.product.id, quantidade: it.qty, valor: it.product.price_catalog || 0 })),
    [cart]
  );
  const canClose = !!user && total >= user.seller_credit_balance && total > 0;

  const addToCart = (p) => {
    setCart((prev) => ({
      ...prev,
      [p.id]: { product: p, qty: (prev[p.id]?.qty || 0) + 1 },
    }));
  };

  const removeFromCart = (p) => {
    setCart((prev) => {
      const current = prev[p.id];
      if (!current) return prev;
      const nextQty = current.qty - 1;
      const next = { ...prev };
      if (nextQty <= 0) delete next[p.id];
      else next[p.id] = { ...current, qty: nextQty };
      return next;
    });
  };

  const handleFecharPedido = async () => {
    if (!user || total < user.seller_credit_balance) return;
    if (deliveryMethod === "delivery" && !freteSel) {
      toast.error("Calcule o frete e escolha a transportadora para continuar.");
      return;
    }
    setClosing(true);
    try {
      const items = Object.values(cart).map((it) => ({ product_id: it.product.id, qty: it.qty }));
      const carrier = deliveryMethod === "delivery"
        ? [freteSel?.empresa, freteSel?.nome].filter(Boolean).join(" ") || "A combinar"
        : "Retirada na loja";

      const res = await base44.functions.invoke("finalizeSellerOrder", {
        user_id: user.id,
        items,
        delivery_method: deliveryMethod,
        carrier,
      });

      if (!res?.success) {
        toast.error(res?.error || "Erro ao fechar o pedido. Tente novamente.");
        return;
      }

      const updatedUser = {
        ...user,
        seller_credit_balance: 0,
        is_seller: true,
        career_levels: res.career_levels || Array.from(new Set([...(user.career_levels || []), "vendedor"])),
      };
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

      setDone(true);
      toast.success("Pedido confirmado! Você já é um Vendedor.");
      setTimeout(() => navigate(createPageUrl("SellerPanel"), { replace: true }), 2000);
    } catch (e) {
      toast.error("Erro ao fechar o pedido. Tente novamente.");
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-nz-verde animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-center px-4">
        <div>
          <CheckCircle2 className="w-14 h-14 text-nz-verde mx-auto mb-3" />
          <h1 className="text-2xl font-black text-nz-tinta">Pedido confirmado!</h1>
          <p className="text-nz-tinta-fraca mt-2">Você já é um Vendedor. Redirecionando para seu painel…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-nz-tinta px-4 py-8 pb-32">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-black">Escolha os produtos da sua primeira compra</h1>
          <p className="text-nz-tinta-fraca text-sm mt-1">
            Seu saldo: <strong className="text-nz-verde">R$ {fmtBR(user?.seller_credit_balance || 0)}</strong> — escolha
            à vontade em qualquer produto da Loja Virtual.
          </p>
        </div>

        <VendedorProductPicker products={products} cart={cart} onAdd={addToCart} onRemove={removeFromCart} />

        {/* 🚚 Entrega — aparece quando o carrinho já bateu o valor da adesão, pronto pra fechar */}
        {canClose && (
          <div className="mt-6 rounded-2xl border border-nz-borda bg-nz-cinza-fundo p-4 sm:p-5">
            <h2 className="font-bold text-nz-tinta mb-3">Como você quer receber seus produtos?</h2>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setDeliveryMethod("pickup")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${deliveryMethod === "pickup" ? "border-nz-verde bg-nz-verde-fundo text-nz-verde" : "border-nz-borda bg-white text-nz-tinta-fraca"}`}
              >
                <Store className="w-4 h-4" /> Retirar
              </button>
              <button
                onClick={() => setDeliveryMethod("delivery")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${deliveryMethod === "delivery" ? "border-nz-verde bg-nz-verde-fundo text-nz-verde" : "border-nz-borda bg-white text-nz-tinta-fraca"}`}
              >
                <Truck className="w-4 h-4" /> Receber em casa
              </button>
            </div>

            {deliveryMethod === "delivery" && (
              <CalculadoraFrete items={freteItems} autoCalcular onSelecionar={setFreteSel} titulo="Calcular frete até você" />
            )}
          </div>
        )}
      </div>

      <VendedorCartBar total={total} balance={user?.seller_credit_balance || 1497} onClose={handleFecharPedido} closing={closing} />
    </div>
  );
}