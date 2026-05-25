import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hammer, LogIn, FileText } from "lucide-react";
import LandingHero from "@/components/portal/LandingHero";
import LandingBenefits from "@/components/portal/LandingBenefits";
import LandingHowItWorks from "@/components/portal/LandingHowItWorks";
import LandingCTA from "@/components/portal/LandingCTA";
import PortalFooter from "@/components/portal/PortalFooter";
import LoginModal from "@/components/common/LoginModal";
import SolicitarCadastroModal from "@/components/portal/SolicitarCadastroModal";

export default function PortalLeiloeiro() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSolicitar, setShowSolicitar] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <LandingHero
        icon={Hammer}
        iconColor="bg-gradient-to-br from-red-500 to-red-700"
        badge="Sob Análise"
        title="Seja um Leiloeiro Parceiro"
        subtitle="Conduza leilões oficiais com toda a infraestrutura da plataforma."
        description="Cadastre seus lotes, gerencie investidores e arrematantes, e conduza operações oficiais com suporte completo da equipe Leilão NoZap."
      />

      <LandingBenefits
        title="Benefícios para o Leiloeiro"
        accentColor="text-red-400"
        items={[
          { title: "CRM de investidores", description: "Gerencie sua carteira de investidores em um só lugar." },
          { title: "Gestão de lotes", description: "Cadastre, edite e acompanhe todos os seus lotes." },
          { title: "Suporte jurídico", description: "Documentação padronizada e suporte da nossa equipe." },
          { title: "Comissão por operação", description: "Modelo transparente e auditável de remuneração." },
        ]}
      />

      <LandingHowItWorks
        accentColor="bg-red-600"
        steps={[
          { title: "Solicite o cadastro", description: "Envie sua documentação profissional." },
          { title: "Análise de credenciais", description: "Verificamos registro e histórico." },
          { title: "Onboarding", description: "Treinamento sobre o sistema e fluxos." },
          { title: "Comece a operar", description: "Conduza seus leilões com toda estrutura." },
        ]}
      />

      <LandingCTA
        title="Vamos trabalhar juntos?"
        primaryLabel="Já tenho conta — Entrar"
        primaryIcon={LogIn}
        primaryColor="bg-red-600 hover:bg-red-500"
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
            navigate("/GestaoLotes");
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
        perfilNome="Leiloeiro"
      />
    </div>
  );
}