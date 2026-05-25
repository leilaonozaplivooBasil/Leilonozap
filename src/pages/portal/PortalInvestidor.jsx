import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, LogIn, FileText } from "lucide-react";
import LandingHero from "@/components/portal/LandingHero";
import LandingBenefits from "@/components/portal/LandingBenefits";
import LandingHowItWorks from "@/components/portal/LandingHowItWorks";
import LandingCTA from "@/components/portal/LandingCTA";
import PortalFooter from "@/components/portal/PortalFooter";
import LoginModal from "@/components/common/LoginModal";
import SolicitarCadastroModal from "@/components/portal/SolicitarCadastroModal";

export default function PortalInvestidor() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSolicitar, setShowSolicitar] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <LandingHero
        icon={TrendingUp}
        iconColor="bg-gradient-to-br from-amber-500 to-yellow-600"
        badge="Sob Análise"
        title="Seja um Investidor"
        subtitle="Aplique capital em lotes selecionados. Receba rentabilidade real."
        description="Aporte capital em lotes de leilão pré-analisados, acompanhe a rentabilidade em tempo real e participe do mercado de revenda com segurança e transparência."
      />

      <LandingBenefits
        title="Por que investir conosco?"
        accentColor="text-amber-400"
        items={[
          { title: "Lotes pré-analisados", description: "Cada lote passa por análise de viabilidade antes da oferta." },
          { title: "Marketplace exclusivo", description: "Acesso a lotes com curadoria e previsão de retorno." },
          { title: "Painel completo", description: "Acompanhe capital alocado, disponível e rentabilidade." },
          { title: "Transparência total", description: "Histórico completo de cada operação na sua carteira." },
        ]}
      />

      <LandingHowItWorks
        accentColor="bg-amber-600"
        steps={[
          { title: "Solicite o cadastro", description: "Análise de perfil e adequação." },
          { title: "Aprovação", description: "Equipe valida em até 48h." },
          { title: "Aporte capital", description: "Deposite na sua carteira de investidor." },
          { title: "Escolha os lotes", description: "Invista no marketplace e acompanhe o retorno." },
        ]}
      />

      <LandingCTA
        title="Quer começar a investir?"
        primaryLabel="Já tenho conta — Entrar"
        primaryIcon={LogIn}
        primaryColor="bg-amber-600 hover:bg-amber-500"
        secondaryLabel="Solicitar Cadastro"
        secondaryIcon={FileText}
        onPrimaryClick={() => setShowLogin(true)}
        onSecondaryClick={() => setShowSolicitar(true)}
      />

      <PortalFooter />

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            navigate("/CarteiraInvestidor");
          }}
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowSolicitar(true);
          }}
        />
      )}

      <SolicitarCadastroModal
        isOpen={showSolicitar}
        onClose={() => setShowSolicitar(false)}
        perfilNome="Investidor"
      />
    </div>
  );
}