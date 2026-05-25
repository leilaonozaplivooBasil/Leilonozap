import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, LogIn, FileText } from "lucide-react";
import LandingHero from "@/components/portal/LandingHero";
import LandingBenefits from "@/components/portal/LandingBenefits";
import LandingHowItWorks from "@/components/portal/LandingHowItWorks";
import LandingCTA from "@/components/portal/LandingCTA";
import PortalFooter from "@/components/portal/PortalFooter";
import LoginModal from "@/components/common/LoginModal";
import SolicitarCadastroModal from "@/components/portal/SolicitarCadastroModal";

export default function PortalLojista() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSolicitar, setShowSolicitar] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <LandingHero
        icon={Store}
        iconColor="bg-gradient-to-br from-purple-500 to-purple-700"
        badge="Sob Análise"
        title="Seja um Lojista"
        subtitle="Sua loja virtual completa, pronta para vender."
        description="Receba produtos selecionados pela nossa central, gerencie sua equipe de vendedores e tenha um painel completo de controle financeiro e operacional."
      />

      <LandingBenefits
        title="Por que ser Lojista?"
        accentColor="text-purple-400"
        items={[
          { title: "Estoque garantido", description: "Acesso a produtos selecionados com preço de licenciado." },
          { title: "Equipe de vendedores", description: "Recrute vendedores e acompanhe a performance de todos." },
          { title: "Dashboard completo", description: "Vendas, comissões, estoque e financeiro em um só lugar." },
          { title: "PDV integrado", description: "Sistema de ponto de venda físico + virtual no mesmo painel." },
        ]}
      />

      <LandingHowItWorks
        accentColor="bg-purple-600"
        steps={[
          { title: "Solicite o cadastro", description: "Conte sobre seu negócio e cidade de atuação." },
          { title: "Análise comercial", description: "Nossa equipe avalia em até 48h." },
          { title: "Onboarding", description: "Configuração da loja + treinamento operacional." },
          { title: "Comece a operar", description: "Receba estoque e comece a vender." },
        ]}
      />

      <LandingCTA
        title="Pronto para abrir sua loja?"
        primaryLabel="Já tenho conta — Entrar"
        primaryIcon={LogIn}
        primaryColor="bg-purple-600 hover:bg-purple-500"
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
            navigate("/LojistaDashboard");
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
        perfilNome="Lojista"
      />
    </div>
  );
}