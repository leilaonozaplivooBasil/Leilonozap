import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gavel, LogIn, UserPlus } from "lucide-react";
import LandingHero from "@/components/portal/LandingHero";
import LandingBenefits from "@/components/portal/LandingBenefits";
import LandingHowItWorks from "@/components/portal/LandingHowItWorks";
import LandingCTA from "@/components/portal/LandingCTA";
import PortalFooter from "@/components/portal/PortalFooter";
import LoginModal from "@/components/common/LoginModal";

export default function PortalArrematante() {
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <LandingHero
        icon={Gavel}
        iconColor="bg-gradient-to-br from-emerald-500 to-emerald-700"
        badge="Acesso Imediato"
        title="Seja um Arrematante"
        subtitle="Lances em tempo real. Descontos de até 90%."
        description="Participe de leilões diários online e arremate eletrônicos, eletrodomésticos, móveis e muito mais. Tudo com sistema seguro, transparente e em tempo real."
      />

      <LandingBenefits
        title="Por que ser Arrematante?"
        accentColor="text-emerald-400"
        items={[
          { title: "Até 90% de desconto", description: "Arremate produtos abaixo do valor de mercado todos os dias." },
          { title: "Lances em tempo real", description: "Disputa ao vivo, com chat integrado e martelo automático." },
          { title: "Cadastro grátis", description: "Crie sua conta em 1 minuto e comece a dar lances imediatamente." },
          { title: "Pagamento seguro", description: "PIX via ASAAS com confirmação automática e nota fiscal." },
        ]}
      />

      <LandingHowItWorks
        accentColor="bg-emerald-600"
        steps={[
          { title: "Cadastre-se grátis", description: "Email, telefone e CPF — pronto em 1 minuto." },
          { title: "Adicione saldo", description: "Carregue sua carteira via PIX para dar lances." },
          { title: "Dê seu lance", description: "Acompanhe leilões ao vivo e dispute em tempo real." },
          { title: "Receba o produto", description: "Pagou, arrematou — entrega para todo Brasil." },
        ]}
      />

      <LandingCTA
        title="Comece agora"
        description="Cadastro grátis. Sem mensalidade. Você só paga pelo que arrematar."
        primaryLabel="Já tenho conta — Entrar"
        primaryIcon={LogIn}
        primaryColor="bg-emerald-600 hover:bg-emerald-500"
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
            navigate("/leiloes");
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