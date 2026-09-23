/**
 * Banca da barra do app (Comprar · Leilões · Lucre · Carrinho) — NÃO vai para o bundle.
 * ?pagina=Catalog&carrinho=3 (padrão) · ?pagina=AuctionRoom não pode montar barra.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@/index.css';
import BarraDoApp from '@/components/nav/BarraDoApp';

const q = new URLSearchParams(window.location.search);
const pagina = q.get('pagina') || 'Catalog';
const carrinho = Number(q.get('carrinho') ?? 3);

createRoot(document.getElementById('raiz')).render(
  <BrowserRouter>
    <div style={{ minHeight: '100vh', background: '#0b1f18', padding: 16 }} data-teste="banca-barra">
      <p className="text-white text-sm">conteúdo da página ({pagina})</p>
      <BarraDoApp currentPageName={pagina} cartCount={carrinho} />
    </div>
  </BrowserRouter>
);
