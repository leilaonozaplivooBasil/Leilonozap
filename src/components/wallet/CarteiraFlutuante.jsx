import React, { useState, useEffect, useCallback } from 'react';
import { Wallet } from 'lucide-react';
import { fmtBR } from '@/lib/money';
import { plataforma } from '@/api/plataformaClient';

// 💰 PONTO 84 — CARTEIRA FLUTUANTE (DESKTOP)
// No PONTO 82 a carteira saiu do flutuante da sala e foi pro cabeçalho — mas o
// botão do cabeçalho é `md:hidden` (só celular). No desktop a barra do topo já
// está cheia (Comprar/Leilões/Lucre + Rank Premiado + carrinho + usuário) e a
// carteira simplesmente desapareceu.
// Aqui ela volta como pill flutuante no canto INFERIOR ESQUERDO — canto vazio na
// sala (o CompareAQUI e a Leila saíram dela no PONTO 87) — ancorada na altura do
// FloatingDock pra nunca cobrir o botão "Dar Lance".
// ⚠️ SÓ DESKTOP: no celular a carteira já existe na navbar; renderizar aqui
// duplicaria o mesmo botão na tela.
export default function CarteiraFlutuante({ user }) {
  const [balance, setBalance] = useState(null);
  const [held, setHeld] = useState(0);

  const carregarSaldo = useCallback(async () => {
    if (!user?.id) return;
    try {
      const result = await plataforma.functions.invoke('getDigitalWalletBalance', { user_id: user.id });
      const data = result?.data || result;
      if (typeof data?.balance === 'number') {
        setBalance(data.balance);
        setHeld(data.held_balance || 0);
      }
    } catch {
      /* silencioso: sem saldo o pill mostra "· · ·" e continua abrindo a carteira */
    }
  }, [user?.id]);

  useEffect(() => {
    carregarSaldo();
    // 📱 Voltar do banco / trocar de aba = saldo revalidado na hora (protocolo
    // multi-dispositivo: nada de confiar só em intervalo, que pausa em background).
    const revalidar = () => { if (document.visibilityState === 'visible') carregarSaldo(); };
    window.addEventListener('visibilitychange', revalidar);
    window.addEventListener('focus', carregarSaldo);
    return () => {
      window.removeEventListener('visibilitychange', revalidar);
      window.removeEventListener('focus', carregarSaldo);
    };
  }, [carregarSaldo]);

  if (!user?.id) return null;

  return (
    <button
      type="button"
      title="Minha Carteira"
      aria-label="Abrir minha carteira"
      className="nz-cf nz-dock-bottom"
      onClick={() => window.dispatchEvent(new Event('openWallet'))}
    >
      <span className="nz-cf-icon"><Wallet size={16} strokeWidth={2.3} /></span>
      <span className="nz-cf-text">
        <span className="nz-cf-label">Carteira</span>
        <span className="nz-cf-value">{typeof balance === 'number' ? `R$ ${fmtBR(balance)}` : '· · ·'}</span>
        {held > 0 && <span className="nz-cf-held">Em lances: R$ {fmtBR(held)}</span>}
      </span>
      <style>{`
        .nz-cf {
          display: none;
          position: fixed;
          left: 16px;
          z-index: 60;
          align-items: center;
          gap: 10px;
          padding: 8px 18px 8px 8px;
          border-radius: 9999px;
          background: linear-gradient(112deg, rgba(16,185,129,0.14), rgba(6,40,27,0.86) 50%, rgba(4,28,19,0.92));
          border: 1px solid rgba(52,211,153,0.4);
          backdrop-filter: blur(18px) saturate(1.35);
          -webkit-backdrop-filter: blur(18px) saturate(1.35);
          box-shadow: 0 6px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.14);
          cursor: pointer;
          transition: border-color .2s ease, transform .2s ease;
        }
        .nz-cf:hover { border-color: rgba(110,231,183,0.8); transform: translateY(-2px); }
        /* SÓ DESKTOP — no celular a carteira vive na barra do topo */
        @media (min-width: 1024px) { .nz-cf { display: flex; } }
        .nz-cf-icon {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 9999px;
          background: linear-gradient(140deg, #34d399, #10b981 55%, #059669);
          color: #04281a;
          box-shadow: 0 3px 12px rgba(16,185,129,0.5), inset 0 1px 1px rgba(255,255,255,0.5);
        }
        .nz-cf-text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.15; }
        .nz-cf-label {
          font-size: 8.5px; font-weight: 700; letter-spacing: 0.2em;
          text-transform: uppercase; color: rgba(110,231,183,0.85);
        }
        .nz-cf-value {
          font-size: 14.5px; font-weight: 800; color: #f2fdf8;
          font-variant-numeric: tabular-nums;
        }
        .nz-cf-held { font-size: 9px; font-weight: 600; color: rgba(251,191,36,0.85); }
      `}</style>
    </button>
  );
}