/**
 * Banca do CABEÇALHO DA SALA no celular — NÃO vai para o bundle.
 * 23/09/2026 — dono: "preciso de uma imagem bem pequena do videogame ali, sem
 * poluir". A miniatura entra no lugar do ⓘ e abre o mesmo painel do produto.
 * ?foto=0 monta sem foto: a sala tem que ficar como era.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import HeaderPrecoTempo from '@/components/auction/HeaderPrecoTempo';

const comFoto = new URLSearchParams(window.location.search).get('foto') !== '0';
window.__abriuPainel = 0;
const FOTO = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#fff"/><rect x="20" y="10" width="40" height="60" rx="8" fill="#111"/></svg>');

createRoot(document.getElementById('raiz')).render(
  <div style={{ width: 390, padding: '8px 16px', background: 'rgba(10,22,17,0.95)' }} data-teste="cabecalho-banca">
    <HeaderPrecoTempo
      currentPrice={497} displayTime="3 dias" endTime="2026-09-26T15:00:00Z" isAuctionActive isWarMode={false}
      onInfo={() => { window.__abriuPainel += 1; }} leaderName={null}
      thumbUrl={comFoto ? FOTO : null} titulo="Playstation 5"
    />
  </div>
);
