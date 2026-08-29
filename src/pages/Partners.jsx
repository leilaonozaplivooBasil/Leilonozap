import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import LoginModal from '@/components/common/LoginModal';
import ParceiroApresentacao from '@/components/parceiro/ParceiroApresentacao';
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
      {/* Os doze blocos vivem em ParceiroApresentacao, compartilhados com o link
          interno /ApresentacaoParceiro. Aqui fica só a porta. */}
      <ParceiroApresentacao onSolicitarAcesso={irParaPainel} />

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