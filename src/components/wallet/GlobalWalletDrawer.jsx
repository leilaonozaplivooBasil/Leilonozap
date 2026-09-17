import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import WalletDrawer from './WalletDrawer';

/**
 * Carteira global — abre em qualquer página via evento 'openWallet'
 * (disparado pelo item "Carteira" do menu do usuário, desktop e mobile).
 */
export default function GlobalWalletDrawer() {
  const [open, setOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();

  // 🔴 17/09/2026 — A GAVETA FICAVA PRESA POR CIMA DA TELA SEGUINTE.
  //
  // "A tela seguinte não abriu e todos os botões do formulário ficaram
  // intocáveis. Quando apertei recarregar, caí na tela de finalizar compra."
  //
  // Era isso mesmo: o botão do cartão chama `onClose()` e logo em seguida
  // `navigate()`. A navegação ACONTECIA (por isso o recarregar caía no
  // checkout) e o checkout até renderizava — mas as duas camadas da gaveta
  // (fundo preto z-90 e painel z-95) continuavam na tela por cima dele,
  // engolindo todo clique. Medido num Chromium: 3,5s depois do clique o fundo
  // seguia com opacidade 1, ou seja, a saída nem tinha começado.
  //
  // Fechar por AQUI, e não só no botão, é o que resolve de verdade: a gaveta
  // deixa de depender de cada caminho lembrar de se fechar. Qualquer navegação
  // — a de hoje e a que alguém criar amanhã — fecha a carteira.
  useEffect(() => {
    setOpen(false);
  }, [location.key]);

  useEffect(() => {
    const handler = () => {
      try {
        const saved = localStorage.getItem('currentUser');
        if (!saved) return;
        setCurrentUser(JSON.parse(saved));
        setOpen(true);
      } catch { /* usuário inválido */ }
    };
    window.addEventListener('openWallet', handler);
    // Intenção guardada antes do cadastro/login (ex.: botão do /ComoFunciona):
    // assim que o usuário existe, a carteira abre sozinha.
    try {
      if (sessionStorage.getItem('pendingOpenWallet') === '1') {
        sessionStorage.removeItem('pendingOpenWallet');
        handler();
      }
    } catch { /* storage indisponível */ }
    return () => window.removeEventListener('openWallet', handler);
  }, []);

  if (!currentUser) return null;
  return <WalletDrawer open={open} onClose={() => setOpen(false)} currentUser={currentUser} />;
}