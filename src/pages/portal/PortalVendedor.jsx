import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, LogIn, HelpCircle } from "lucide-react";
import LandingHero from "@/components/portal/LandingHero";
import LandingBenefits from "@/components/portal/LandingBenefits";
import LandingHowItWorks from "@/components/portal/LandingHowItWorks";
import LandingCTA from "@/components/portal/LandingCTA";
import PortalFooter from "@/components/portal/PortalFooter";
import LoginModal from "@/components/common/LoginModal";
import VendedorSemConviteModal from "@/components/portal/VendedorSemConviteModal";

export default function PortalVendedor() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSemConvite, setShowSemConvite] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <LandingHero
        icon={Users}
        iconColor="bg-gradient-to-br from-gray-600 to-gray-800"
        badge="Acesso Apenas por Convite"
        title="Painel do Vendedor"
        subtitle="Exclusivo para quem foi recrutado por um Licenciado."
        description="Se você foi convidado por um Licenciado parceiro, este é o seu painel. Aqui você acompanha suas vendas, comissões e solicita saques diretamente."
      />

      <LandingBenefits
        title="O que você tem como Vendedor"
        accentColor="text-gray-300"
        items={[
          { title: "Painel próprio", description: "Acompanhe vendas, comissões e ranking em tempo real." },
          { title: "Comissão por venda", description: "Receba comissão direta sobre tudo que vender." },
          { title: "Sem investimento inicial", description: "Você não paga nada para começar — é apenas recrutado." },
          { title: "Saque rápido", description: "Solicite seu saque quando quiser, processamento ágil." },
        ]}
      />

      <LandingHowItWorks
        accentColor="bg-gray-700"
        steps={[
          { title: "Licenciado te convida", description: "Um Licenciado parceiro cadastra você no painel dele." },
          { title: "Você recebe o link", description: "Um link mágico chega por WhatsApp ou e-mail." },
          { title: "Defina sua senha", description: "Clique no link e crie sua senha de acesso." },
          { title: "Venda e receba", description: "Comece a vender e veja sua comissão crescer." },
        ]}
      />

      <LandingCTA
        title="Já é Vendedor?"
        description="Se você já recebeu o convite, entre com seu e-mail e senha. Senão, veja como funciona."
        primaryLabel="Já recebi meu convite — Entrar"
        primaryIcon={LogIn}
        primaryColor="bg-gray-700 hover:bg-gray-600"
        secondaryLabel="Ainda não recebi convite"
        secondaryIcon={HelpCircle}
        onPrimaryClick={() => setShowLogin(true)}
        onSecondaryClick={() => setShowSemConvite(true)}
      />

      <PortalFooter />

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            navigate("/SellerPanel");
          }}
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowSemConvite(true);
          }}
        />
      )}

      <VendedorSemConviteModal
        isOpen={showSemConvite}
        onClose={() => setShowSemConvite(false)}
      />
    </div>
  );
}