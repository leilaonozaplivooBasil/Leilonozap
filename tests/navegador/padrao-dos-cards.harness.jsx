/**
 * Banca do PADRÃO DOS CARDS (25/09/2026).
 *
 * Dono: "os cards acabam ficando sempre diferentes uns dos outros (em tamanho e
 * diagramação)… o espaço do relógio ocupa muito espaço". Viu A e B lado a lado
 * e escolheu A. Seis cards de verdade, na MESMA grade da Home (2 por linha no
 * celular), com os casos que desalinhavam: título curto e longo, com e sem
 * líder, com e sem "Compre já", prazo em semanas (vira data), em dias e
 * urgente (minutos, vermelho).
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import AuctionCard from '@/components/auction/AuctionCard';

window.__bancoFalso = { tabelas: {}, escritas: [] };
window.__entidadesFalsas = { Auction: [], AppUser: [] };

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const emDias = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();
const emMinutos = (m) => new Date(Date.now() + m * 60 * 1000).toISOString();
const base = { description: 'banca', image_urls: [PIXEL], category: 'eletronicos', status: 'active', increment: 10 };

const leiloes = [
  { ...base, id: 'b1', title: 'Liquidificador Turbo Power Mondial L-99 FB 550W Preto', starting_price: 50, current_price: 50, end_time: emDias(1), buy_now_price: 100, winner_name: 'Henrique Silva', product_source: 'factory_new' },
  { ...base, id: 'b2', title: 'Playstation 5', starting_price: 497, current_price: 997, end_time: emDias(1.5), product_source: 'factory_new' },
  { ...base, id: 'b3', title: 'Harley 117 - Scooter Elétrico SEM CNH', starting_price: 477.6, current_price: 477.6, end_time: emDias(4), winner_name: 'Ângela Maria Rocha dos Santos' },
  { ...base, id: 'b4', title: 'Chinelo Papete Moleca', starting_price: 15.98, current_price: 15.98, end_time: emDias(12), buy_now_price: 42.5 },
  { ...base, id: 'b5', title: 'Caixa de Som JBL Partybox 110', starting_price: 300, current_price: 1250, end_time: emMinutos(8), buy_now_price: 2400, winner_name: 'Rosenberg de Oliveira' },
  { ...base, id: 'b6', title: 'Smart TV Samsung 55" Crystal UHD 4K com Alexa Integrada e Wi-Fi', starting_price: 1500, current_price: 1500, end_time: emDias(9), product_source: 'factory_new' },
];
const stats = { b1: { users: 1, bids: 1 }, b2: { users: 3, bids: 4 }, b3: { users: 1, bids: 1 }, b4: { users: 0, bids: 0 }, b5: { users: 6, bids: 19 }, b6: { users: 0, bids: 0 } };


createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>
    <div style={{ background: '#0b1220', minHeight: '100vh', padding: '10px 0 16px' }}>
      <div data-teste="rotulo-do-padrao" className="px-3 pb-2 flex items-center gap-2">
        <span className="text-white/90 text-xs font-semibold">Padrão dos cards — grade fixa, prazo curto ao lado do preço</span>
      </div>
      {/* a MESMA grade da Home (src/pages/Home.jsx) + auto-rows-fr: cada linha nivela a altura */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 auto-rows-fr px-3" data-teste="grade-leiloes">
        {leiloes.map((a) => (
          <AuctionCard key={a.id} auction={a} bidStats={stats[a.id]} showFavoriteButton userId="banca-usuario" />
        ))}
      </div>
    </div>
  </MemoryRouter>,
);
