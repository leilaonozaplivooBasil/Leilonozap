/** Banca do bloco "Leve junto" do carrinho — NÃO vai para o bundle. ?vazio=1 monta com carrinho vazio. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import LeveJunto from '@/components/cart/LeveJunto';

const vazio = new URLSearchParams(window.location.search).get('vazio') === '1';
const P = (id, description, price_catalog, category_id, created_date) => ({ id, description, price_catalog, category_id, catalog_active: true, quantity: 3, quantity_sold: 0, created_date, image_urls: ['data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#2f6f55"/></svg>')] });
window.__entidadesFalsas = { Product: [
  P('p1', 'Batom Bala Hidratante Bauny', 25.09, 'cosm', '2026-09-10'),
  P('p2', 'Esmalte Top Coat 9ml', 26, 'cosm', '2026-09-20'),
  P('p3', 'Sérum Gel Cílios & Sobrancelhas', 29.97, 'cosm', '2026-09-15'),
  P('p4', 'Corda Polia', 24.97, 'casa', '2026-09-01'),
  P('p5', 'Relógio Skeleton', 67, 'moda', '2026-09-01'),
  P('no', 'Pó Compacto Facial', 29.97, 'cosm', '2026-09-01'),
] };
window.__adicionados = [];
function Banca() {
  const [carrinho, setCarrinho] = useState(vazio ? [] : [{ id: 'no', price_catalog: 29.97, quantity: 1 }]);
  return (
    <div style={{ width: 390, padding: 16, background: '#111827' }} data-teste="banca-leve-junto">
      <LeveJunto carrinho={carrinho} onAdicionar={(item) => { window.__adicionados.push(item); setCarrinho((c) => [...c, item]); }} />
    </div>
  );
}
createRoot(document.getElementById('raiz')).render(<Banca />);
