import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import LoginModal from '@/components/common/LoginModal';
import ParceiroAbertura from '@/components/parceiro/ParceiroAbertura';
import ParceiroTracao from '@/components/parceiro/ParceiroTracao';
import ParceiroOrigens from '@/components/parceiro/ParceiroOrigens';
import ParceiroCuradoria from '@/components/parceiro/ParceiroCuradoria';
import ParceiroRelacaoEouNaoE from '@/components/parceiro/ParceiroRelacaoEouNaoE';
import ParceiroCiclo from '@/components/parceiro/ParceiroCiclo';
import ParceiroVitrineOperacao from '@/components/parceiro/ParceiroVitrineOperacao';
import ParceiroCanaisVenda from '@/components/parceiro/ParceiroCanaisVenda';
import ParceiroBoard from '@/components/parceiro/ParceiroBoard';
import ParceiroFormalizacao from '@/components/parceiro/ParceiroFormalizacao';
import ParceiroCTA from '@/components/parceiro/ParceiroCTA';
import ParceiroDisclaimer from '@/components/parceiro/ParceiroDisclaimer';

// 🖤 PARCEIRO DE COMPRA — vitrine pública de captação privada.
// ⚠️ REGRA PERMANENTE: esta página NÃO exibe valor financeiro algum
// (aporte, cota, faixas, projeções, dados bancários). Tudo isso vive no
// Painel do Parceiro, atrás de cadastro + termo de confidencialidade.
// Vocabulário: parceria comercial, aporte, cota-alvo, repasse, resultado apurado.
// PROIBIDO na área pública: investimento, rendimento, garantido, risco zero.
export default function PartnersPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 🖤 Tema preto exclusivo desta página: marca o body enquanto ela está montada
  // e limpa ao sair. Alcança rodapé/flutuante (que vivem no Layout) sem alterar
  // nenhum componente global — as outras telas seguem exatamente como são.
  useEffect(() => {
    document.body.classList.add('pc-tema');
    return () => document.body.classList.remove('pc-tema');
  }, []);

  useEffect(() => {
    try {
      const savedUserJSON = localStorage.getItem('currentUser');
      setCurrentUser(savedUserJSON ? JSON.parse(savedUserJSON) : null);
    } catch (error) {
      setCurrentUser(null);
    }
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setShowLoginModal(false);
    setTimeout(() => navigate(createPageUrl('InvestorDashboard')), 500);
  };

  // Já logado vai direto pro painel; visitante abre o login (comportamento original)
  const irParaPainel = () => {
    if (currentUser) {
      navigate(createPageUrl('InvestorDashboard'));
      return;
    }
    setShowLoginModal(true);
  };

  return (
    <>
      <div className="min-h-screen bg-pc-preto">
        <ParceiroAbertura onSolicitarAcesso={irParaPainel} />
        <ParceiroTracao />
        <ParceiroOrigens />
        <ParceiroCuradoria />
        <ParceiroRelacaoEouNaoE />
        <ParceiroCiclo />
        <ParceiroVitrineOperacao />
        <ParceiroCanaisVenda />
        <ParceiroBoard />
        <ParceiroFormalizacao />
        <ParceiroCTA onSolicitarAcesso={irParaPainel} onAcessarPainel={irParaPainel} />
        <ParceiroDisclaimer />
      </div>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={handleLoginSuccess}
          onSwitchToRegister={() => setShowLoginModal(false)}
        />
      )}
    </>
  );
}