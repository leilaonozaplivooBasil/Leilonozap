import React, { useState, useEffect } from 'react';
import WalletDrawer from './WalletDrawer';

/**
 * Carteira global — abre em qualquer página via evento 'openWallet'
 * (disparado pelo item "Carteira" do menu do usuário, desktop e mobile).
 */
export default function GlobalWalletDrawer() {
  const [open, setOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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
    return () => window.removeEventListener('openWallet', handler);
  }, []);

  if (!currentUser) return null;
  return <WalletDrawer open={open} onClose={() => setOpen(false)} currentUser={currentUser} />;
}
