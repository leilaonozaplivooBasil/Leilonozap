/**
 * Banca do RODÍZIO DA VITRINE (10/10/2026) — a Home e a Loja DE VERDADE, com leilões e
 * produtos de mentira. Mede: destaques fixos, fileira "Faltam 2 dias" fixa, resto da grade
 * em rodízio que muda entre acessos e fica igual durante a navegação.
 *   ?pagina=loja → a Loja (Catalog) em vez da Home.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import Home from '@/pages/Home';
import Catalog from '@/pages/Catalog';

const q = new URLSearchParams(window.location.search);
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const agora = Date.now();
const DIA = 24 * 60 * 60 * 1000;
// dia de calendário de Brasília daqui a `n` dias, às 15:00 BRT (sempre no meio do dia)
const brt = (n, h = 15) => {
  const d = new Date(agora - 3 * 3600 * 1000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n, h + 3)).toISOString();
};
const base = { description: 'banca', image_urls: [PIXEL], category: 'eletronicos', status: 'active', increment: 10, starting_price: 100, current_price: 100 };

const leiloes = [
  // dois dias (terça): entram na fileira fixa
  { ...base, id: 'd2a', title: 'Fileira dois dias A', end_time: brt(2, 10) },
  { ...base, id: 'd2b', title: 'Fileira dois dias B', end_time: brt(2, 20) },
  // destaque marcado
  { ...base, id: 'dest', title: 'Leilão em destaque', end_time: brt(6) },
  // o resto: 30 leilões em dias variados
  ...Array.from({ length: 30 }, (_, i) => ({ ...base, id: `r${String(i).padStart(2, '0')}`, title: `Leilão do resto ${String(i).padStart(2, '0')}`, end_time: brt(3 + (i % 9), 9 + (i % 10)) })),
  // amanhã e hoje, que NÃO são "2 dias"
  { ...base, id: 'amanha', title: 'Leilão de amanhã', end_time: brt(1) },
  { ...base, id: 'hoje', title: 'Leilão de hoje', end_time: new Date(agora + 4 * 3600 * 1000).toISOString() },
];

const produtos = Array.from({ length: 40 }, (_, i) => ({
  id: `p${String(i).padStart(2, '0')}`, description: `Produto da loja ${String(i).padStart(2, '0')}`, catalog_active: true,
  quantity: i % 10 === 0 ? 0 : 5, price_catalog: 50 + i, image_urls: [PIXEL], created_date: new Date(agora - i * 3600 * 1000).toISOString(),
}));

window.__bancoFalso = { tabelas: { featured_products: [{ id: 'f1', sort_order: 1, is_active: true, name: 'dest', raw_base44: { auction_id: 'dest' } }], auctions: leiloes }, escritas: [] };
window.__entidadesFalsas = { Auction: leiloes, Product: produtos, AppUser: [] };
try {
  sessionStorage.setItem('auctions_cache', JSON.stringify(leiloes));
  sessionStorage.setItem('auctions_cache_time', String(Date.now()));
  if (q.get('semente')) sessionStorage.setItem('rodizioDaVitrine', JSON.stringify({ semente: Number(q.get('semente')), ts: Date.now() }));
} catch { /* sem storage */ }

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>{q.get('pagina') === 'loja' ? <Catalog /> : <Home />}</MemoryRouter>,
);
