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
import { acessoParceiroLiberado, usuarioLocal } from '@/lib/parceiroAcesso';
import { useSectionTracking } from '@/lib/tracking';

// 🖤 PARCEIRO DE COMPRA — vitrine pública de captação privada.
// ⚠️ REGRA PERMANENTE: esta página NÃO exibe valor financeiro algum
// (aporte, cota, faixas, projeções, dados bancários). Tudo isso vive no
// Painel do Parceiro, atrás de cadastro + termo de confidencialidade.
// Vocabulário: parceria comercial, aporte, cota-alvo, repasse, resultado apurado.
// PROIBIDO na área pública: investimento, rendimento, garantido, risco zero.
export default function PartnersPage() {
  useSectionTracking('partners', 'Parceiro de Compra');
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  // 🔐 Só renderiza a apresentação depois de conferir cadastro + ciência
  const [liberado, setLiberado] = useState(false);

  // 🖤 Tema preto exclusivo desta página: marca o body enquanto ela está montada
  // e limpa ao sair. Alcança rodapé/flutuante (que vivem no Layout) sem alterar
  // nenhum componente global — as outras telas seguem exatamente como são.
  useEffect(() => {
    document.body.classList.add('pc-tema');
    return () => document.body.classList.remove('pc-tema');
  }, []);

  // 🔐 PORTA OBRIGATÓRIA: só entra quem está LOGADO AGORA e já declarou ciência
  // de que é captação privada. Sem sessão ativa → volta pra porta de entrada,
  // sem renderizar um pixel do conteúdo confidencial.
  //
  // 📱 Revalida ao voltar do segundo plano e ao focar a aba: se a sessão caiu ou
  // a pessoa saiu da conta em outra aba, a apresentação fecha na hora.
  useEffect(() => {
    const conferir = () => {
      setCurrentUser(usuarioLocal());
      if (acessoParceiroLiberado()) {
        setLiberado(true);
      } else {
        setLiberado(false);
        navigate('/AcessoParceiro', { replace: true });
      }
    };

    conferir();
    const aoVoltar = () => { if (!document.hidden) conferir(); };
    // 'storage' = saiu da conta em OUTRA aba; 'sessionChanged' = na mesma aba.
    // Com a apresentação já aberta, a sessão pode cair sem remontar a página —
    // por isso a reconferência é por evento, não só na montagem.
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', conferir);
    window.addEventListener('storage', conferir);
    window.addEventListener('sessionChanged', conferir);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', conferir);
      window.removeEventListener('storage', conferir);
      window.removeEventListener('sessionChanged', conferir);
    };
  }, [navigate]);

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

  if (!liberado) return <div className="min-h-screen bg-pc-preto" />;

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