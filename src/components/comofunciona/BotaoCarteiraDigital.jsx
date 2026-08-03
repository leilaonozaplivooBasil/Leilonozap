import React from 'react';
import { useNavigate } from 'react-router-dom';

// Abre a Carteira Digital REAL (modal global, evento 'openWallet') sem sair da
// página. Visitante deslogado vai pro cadastro deixando a intenção guardada —
// ao entrar, o GlobalWalletDrawer abre a carteira sozinho.
export default function BotaoCarteiraDigital() {
  const navigate = useNavigate();

  const abrir = () => {
    let logado = false;
    try {
      const salvo = localStorage.getItem('currentUser');
      const u = salvo ? JSON.parse(salvo) : null;
      logado = !!(u && u.id && u.email);
    } catch { /* storage inválido */ }

    if (logado) {
      window.dispatchEvent(new Event('openWallet'));
      return;
    }
    try { sessionStorage.setItem('pendingOpenWallet', '1'); } catch { /* ignora */ }
    navigate('/Register');
  };

  return (
    <button
      type="button"
      onClick={abrir}
      className="min-h-[44px] rounded-full border border-white/25 px-7 py-3 text-sm font-medium text-white transition-opacity hover:opacity-70"
    >
      Minha Carteira Digital
    </button>
  );
}