import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, LogIn, UserPlus } from "lucide-react";
import LandingHero from "@/components/portal/LandingHero";
import LandingBenefits from "@/components/portal/LandingBenefits";
import LandingHowItWorks from "@/components/portal/LandingHowItWorks";
import LandingCTA from "@/components/portal/LandingCTA";
import PortalFooter from "@/components/portal/PortalFooter";
import LoginModal from "@/components/common/LoginModal";

export default function PortalLojaVirtual() {
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <LandingHero
        icon={ShoppingBag}
        iconColor="bg-gradient-to-br from-orange-500 to-orange-700"
        badge="Acesso Imediato"
        title="Loja Virtual NoZap"
        subtitle="Compre direto. Sem leilão. Sem disputa."
        description="Produtos selecionados com preço fixo, pagamento via PIX e entrega para todo o Brasil. Catálogo atualizado todos os dias com ofertas exclusivas."
      />

      <LandingBenefits
        title="Por que comprar aqui?"
        accentColor="text-orange-400"
        items={[
          { title: "Preço fixo", description: "Sem disputa, sem ansiedade. Você vê o preço e compra." },
          { title: "Entrega Brasil todo", description: "Calculamos o frete automaticamente no checkout." },
          { title: "Pagamento via PIX", description: "Aprovação instantânea — produto separado para envio." },
          { title: "Rastreamento", description: "Acompanhe seu pedido do envio até a entrega." },
        ]}
      />

      <LandingHowItWorks
        accentColor="bg-orange-600"
        steps={[
          { title: "Explore o catálogo", description: "Navegue por categorias e veja descontos." },
          { title: "Adicione ao carrinho", description: "Escolha o que quiser e finalize." },
          { title: "Pague com PIX", description: "QR Code com confirmação automática." },
          { title: "Receba em casa", description: "Frete calculado e produto rastreável." },
        ]}
      />

      <LandingCTA
        title="Quer começar a comprar?"
        description="O cadastro é rápido. Depois é só explorar e arrematar ofertas exclusivas."
        primaryLabel="Já tenho conta — Entrar"
        primaryIcon={LogIn}
        primaryColor="bg-orange-600 hover:bg-orange-500"
        secondaryLabel="Quero me cadastrar"
        secondaryIcon={UserPlus}
        onPrimaryClick={() => setShowLogin(true)}
        onSecondaryClick={() => navigate("/Register")}
      />

      <PortalFooter />

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            navigate("/Loja-Virtual");
          }}
          onSwitchToRegister={() => {
            setShowLogin(false);
            navigate("/Register");
          }}
        />
      )}
    </div>
  );
}