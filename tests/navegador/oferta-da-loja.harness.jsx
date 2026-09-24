/**
 * Banca do rodapé de lance com a frase "15% abaixo do preço da nossa loja" — NÃO vai para o bundle.
 * 23/09/2026 — ?loja=49.97 monta com oferta válida; ?loja=0 sem preço de loja; ?loja=67 arremate à mão.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import BidInput from '@/components/auction/BidInput';

const q = new URLSearchParams(window.location.search);
const loja = q.get('loja') === null ? 49.97 : Number(q.get('loja'));
const arremate = q.get('arremate') === null ? 42.47 : Number(q.get('arremate'));

createRoot(document.getElementById('raiz')).render(
  <div style={{ width: 390, background: '#0a1611' }} data-teste="rodape-banca">
    <BidInput currentPrice={19.92} increment={1} onSubmitBid={() => {}} isLoading={false}
      buyNowPrice={arremate} onBuyNow={() => {}} freteValor={0} isFirstBid precoLoja={loja} startingPrice={19.92} />
  </div>
);
