import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import HeroRecepcao from '@/components/recepcao/HeroRecepcao';
import PersonagensRede from '@/components/recepcao/PersonagensRede';
import BlocoVitrine from '@/components/recepcao/BlocoVitrine';
import MidiaFlutuante from '@/components/recepcao/MidiaFlutuante';
import BlocoAoVivo from '@/components/recepcao/BlocoAoVivo';
import CartaoCarteira from '@/components/recepcao/CartaoCarteira';
import BlocoRede from '@/components/recepcao/BlocoRede';
import BlocoEntretenimento from '@/components/recepcao/BlocoEntretenimento';
import SetoresClean from '@/components/recepcao/SetoresClean';

// Página de entrada em formato vitrine: blocos empilhados de largura total,
// tipografia grande centralizada e produto flutuando sem moldura.
// Alternância cromática obrigatória — e UM único bloco escuro (o clímax).
export default function Recepcao() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ leiloes: 0, produtos: 0 });
  const [produtos, setProdutos] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [{ count: lc }, { count: pc }] = await Promise.all([
          supabase.from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('catalog_active', true),
        ]);
        setStats({ leiloes: lc || 0, produtos: pc || 0 });
        const { data } = await supabase
          .from('products')
          .select('id,description,price_catalog,image_urls,market_value')
          .eq('catalog_active', true)
          .order('is_featured', { ascending: false })
          .limit(8);
        setProdutos((data || []).filter((p) => p.image_urls && p.image_urls[0]));
      } catch (e) { /* silencioso */ }
    })();
  }, []);

  const buscar = (e) => {
    e.preventDefault();
    navigate('/Loja-Virtual' + (q.trim() ? `?search=${encodeURIComponent(q.trim())}` : ''));
  };

  const nomeUsuario = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || 'null');
      return u?.full_name || null;
    } catch { return null; }
  })();

  return (
    <div className="w-full overflow-x-hidden bg-white text-nz-tinta">
      {/* 1 — HERO */}
      <HeroRecepcao
        stats={stats}
        produtoDestaque={produtos[0]}
        q={q}
        setQ={setQ}
        onBuscar={buscar}
      />

      <div className="h-3 bg-white" />

      {/* 2 — OS PAPÉIS DA REDE (die-cut) */}
      <PersonagensRede />

      <div className="h-3 bg-white" />

      {/* 3 — LOJA VIRTUAL */}
      <BlocoVitrine
        tema="cinza"
        titulo="Loja Virtual"
        subtitulo={`${stats.produtos > 0 ? `${stats.produtos} produtos` : 'Milhares de produtos'} com entrega em todo o Brasil.`}
        primario={{ label: 'Comprar agora', to: '/Loja-Virtual' }}
        secundario={{ label: 'Saber mais', to: '/Loja-Virtual' }}
      >
        <MidiaFlutuante
          src={produtos[1]?.image_urls?.[0] || produtos[0]?.image_urls?.[0]}
          alt={produtos[1]?.description || ''}
          altura={340}
        />
      </BlocoVitrine>

      <div className="h-3 bg-white" />

      {/* 4 — LEILÃO AO VIVO (único bloco escuro) */}
      <BlocoAoVivo />

      <div className="h-3 bg-white" />

      {/* 5 — CARTEIRA DIGITAL */}
      <BlocoVitrine
        tema="verde"
        titulo="Carteira NoZap"
        subtitulo="Seu saldo, seus lances e suas comissões num só lugar. PIX na hora."
        primario={{ label: 'Abrir carteira', to: '/Carteira' }}
        secundario={{ label: 'Como funciona', to: '/Licensing' }}
      >
        <CartaoCarteira nome={nomeUsuario} />
      </BlocoVitrine>

      <div className="h-3 bg-white" />

      {/* 6 — COMISSÕES DA REDE */}
      <BlocoVitrine
        tema="branco"
        titulo="Indique. Fature."
        subtitulo="Ganhe comissão em cada venda da sua rede, em todos os níveis."
        primario={{ label: 'Entrar na rede', to: '/Licensing' }}
        secundario={{ label: 'Ver os planos', to: '/Evoluir' }}
      >
        <BlocoRede />
      </BlocoVitrine>

      {/* 7 — ENTRETENIMENTO (grid 2 colunas) */}
      <BlocoEntretenimento />

      {/* 8 — TODAS AS PORTAS DO NEGÓCIO */}
      <SetoresClean />
    </div>
  );
}