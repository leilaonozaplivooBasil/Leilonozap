import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, LogIn, FileText } from "lucide-react";
import LandingHero from "@/components/portal/LandingHero";
import LandingBenefits from "@/components/portal/LandingBenefits";
import LandingHowItWorks from "@/components/portal/LandingHowItWorks";
import LandingCTA from "@/components/portal/LandingCTA";
import PortalFooter from "@/components/portal/PortalFooter";
import LoginModal from "@/components/common/LoginModal";
import SolicitarCadastroModal from "@/components/portal/SolicitarCadastroModal";

export default function PortalLicenciado() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSolicitar, setShowSolicitar] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <LandingHero
        icon={Briefcase}
        iconColor="bg-gradient-to-br from-blue-500 to-blue-700"
        badge="Sob Análise"
        title="Seja um Licenciado"
        subtitle="Construa renda recorrente com a maior rede de leilões do Brasil."
        description="Indique arrematantes, ative loja virtual, recrute vendedores e ganhe comissões em múltiplos níveis. Carreira escalonada com plano de crescimento real."
      />

      <LandingBenefits
        title="Vantagens de ser Licenciado"
        accentColor="text-blue-400"
        items={[
          { title: "Comissão recorrente", description: "Ganhe sobre cada arremate, venda do catálogo e ativação de planos." },
          { title: "Carreira escalonada", description: "Trainee → Executivo → Diretor → CEO → Conselheiro." },
          { title: "Loja virtual própria", description: "Catálogo personalizado com sua marca e seu link." },
          { title: "Suporte completo", description: "Material promocional, treinamentos e equipe dedicada." },
        ]}
      />

      <LandingHowItWorks
        accentColor="bg-blue-600"
        steps={[
          { title: "Solicite o cadastro", description: "Preencha o formulário com seus dados." },
          { title: "Análise da equipe", description: "Avaliamos seu perfil em até 48h." },
          { title: "Aprovação e treinamento", description: "Acesso liberado + treinamento de boas-vindas." },
          { title: "Comece a faturar", description: "Use seu link de indicação e ganhe comissões." },
        ]}
      />

      <LandingCTA
        title="Pronto para começar?"
        description="Se você já é Licenciado, entre na sua conta. Caso contrário, solicite seu cadastro."
        primaryLabel="Já tenho conta — Entrar"
        primaryIcon={LogIn}
        primaryColor="bg-blue-600 hover:bg-blue-500"
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
            navigate("/Licensing");
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
        perfilNome="Licenciado"
      />
    </div>
  );
}