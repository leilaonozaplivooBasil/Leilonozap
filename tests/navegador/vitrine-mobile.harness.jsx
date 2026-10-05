/**
 * Banca da VITRINE NO CELULAR — 2 cards de leilão por linha (25/09/2026).
 *
 * 🔴 POR QUE EXISTE: ao pôr 2 cards por linha (pedido do dono, como a loja),
 * o card de ~170px quebrou o preço letra por letra ("R / $ / 9 / 9 / 7"), o
 * "Termina" esmagou e o "Compre já" ficou por cima dos lances (prints do dono).
 * Esta banca monta QUATRO cards de verdade na MESMA grade da Home
 * (grid-cols-2 no celular) e mede: preço numa linha só, nada saindo do card,
 * nenhuma sobreposição entre preço, prazo e "Compre já".
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
const base = { description: 'banca', image_urls: [PIXEL], category: 'eletronicos', status: 'active', increment: 10 };

const leiloes = [
  { ...base, id: 'b1', title: 'Liquidificador Turbo Power Mondial L-99 FB 550W Preto', starting_price: 50, current_price: 50, end_time: emDias(1), buy_now_price: 100, winner_name: 'Henrique Silva', product_source: 'factory_new' },
  { ...base, id: 'b2', title: 'Playstation 5', starting_price: 497, current_price: 997, end_time: emDias(1.5), product_source: 'factory_new' },
  { ...base, id: 'b3', title: 'Harley 117 - Scooter Elétrico SEM CNH', starting_price: 477.6, current_price: 477.6, end_time: emDias(4), winner_name: 'Ângela Maria Rocha dos Santos' },
  { ...base, id: 'b4', title: 'Chinelo Papete Moleca', starting_price: 15.98, current_price: 15.98, end_time: emDias(12), buy_now_price: 42.5 },
];
const stats = { b1: { users: 1, bids: 1 }, b2: { users: 3, bids: 4 }, b3: { users: 1, bids: 1 }, b4: { users: 0, bids: 0 } };

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>
    <div style={{ background: '#0b1220', minHeight: '100vh', padding: '12px 0' }}>
      {/* a MESMA grade da Home (src/pages/Home.jsx) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 px-3" data-teste="grade-leiloes">
        {leiloes.map((a) => (
          <AuctionCard key={a.id} auction={a} bidStats={stats[a.id]} showFavoriteButton userId="banca-usuario" />
        ))}
      </div>
    </div>
  </MemoryRouter>,
);
