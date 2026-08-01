import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// 📊 PAINEL DO ARREMATANTE — carregamento 100% LEITURA.
// Nada aqui escreve saldo, lance, reserva ou comissão.
// Atualiza sozinho ao voltar pro app (visibilitychange + focus), porque
// setInterval sozinho congela em background no celular.
export default function usePainelArrematante() {
  const [user, setUser] = useState(null);
  const [saldo, setSaldo] = useState({ disponivel: 0, alocado: 0 });
  const [disputando, setDisputando] = useState([]);
  const [lances, setLances] = useState([]);
  const [arremates, setArremates] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const carregandoRef = useRef(false);

  const carregar = useCallback(async () => {
    if (carregandoRef.current) return; // evita corrida ao voltar do banco
    carregandoRef.current = true;
    try {
      const salvo = localStorage.getItem('currentUser');
      if (!salvo) { setUser(null); return; }
      const u = JSON.parse(salvo);
      if (!u?.id) { setUser(null); return; }
      setUser(u);

      const [carteiraRes, extratoRes, minhasMsgs, ativos, ganhos] = await Promise.all([
        base44.functions.invoke('getMyWallet', { user_id: u.id }).catch(() => null),
        base44.functions.invoke('getDigitalWalletHistory', { user_id: u.id }).catch(() => null),
        base44.entities.AuctionMessage
          .filter({ sender_id: u.id, message_type: 'bid' }, '-created_date', 200)
          .catch(() => []),
        base44.entities.Auction.filter({ status: 'active' }, '-updated_date', 500).catch(() => []),
        base44.entities.Auction.filter({ winner_id: u.id }, '-updated_date', 50).catch(() => []),
      ]);

      const carteira = carteiraRes?.data || carteiraRes || {};
      setSaldo({
        disponivel: Number(carteira.saldo_disponivel) || 0,
        alocado: Number(carteira.saldo_alocado) || 0,
      });

      // ===== DISPUTANDO AGORA: meus lances × leilões ativos =====
      const msgs = Array.isArray(minhasMsgs) ? minhasMsgs : [];
      const ativosLista = Array.isArray(ativos) ? ativos : [];
      const porId = new Map(ativosLista.map((a) => [a.id, a]));
      const meuUltimo = new Map(); // auction_id → maior lance meu
      for (const m of msgs) {
        const v = Number(m.bid_amount) || 0;
        if (!m.auction_id || !v) continue;
        if (!meuUltimo.has(m.auction_id) || v > meuUltimo.get(m.auction_id)) {
          meuUltimo.set(m.auction_id, v);
        }
      }
      const emDisputa = [];
      for (const [auctionId, meuLance] of meuUltimo.entries()) {
        const a = porId.get(auctionId);
        if (!a) continue; // leilão já encerrado — não é "disputando agora"
        emDisputa.push({
          auction: a,
          meuLance,
          ganhando: a.winner_id === u.id,
        });
      }
      emDisputa.sort((x, y) => new Date(x.auction.end_time || 0) - new Date(y.auction.end_time || 0));
      setDisputando(emDisputa);

      // ===== MINI EXTRATO: só os lances, últimos 10 =====
      const todas = extratoRes?.data?.transactions || extratoRes?.transactions || [];
      setLances((Array.isArray(todas) ? todas : []).filter((t) => t.type === 'bid').slice(0, 10));

      // ===== MEUS ARREMATES: últimos 3 encerrados =====
      const ganhosLista = (Array.isArray(ganhos) ? ganhos : []).filter(
        (a) => ['sold', 'ended', 'processing'].includes(a.status) &&
          !a.is_investment_plan && !/\bplano\b/i.test(a.title || '')
      );
      setArremates(ganhosLista);
    } finally {
      carregandoRef.current = false;
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const aoVoltar = () => { if (document.visibilityState === 'visible') carregar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', carregar);
    const t = setInterval(carregar, 30000);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', carregar);
      clearInterval(t);
    };
  }, [carregar]);

  return { user, saldo, disputando, lances, arremates, carregando, recarregar: carregar };
}