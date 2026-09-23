/**
 * Banca dos EVENTOS DE E-COMMERCE DA LOJA — NÃO vai para o bundle.
 *
 * 22/09/2026 — o Tag Assistant mostrou a loja muda (sem view_item, add_to_cart,
 * begin_checkout) e o Vinicius sem currency/content_ids. Aqui rodam as telas
 * REAIS (card da loja, modal do produto, carrinho) e a prova lê o
 * window.dataLayer — exatamente o que o GTM lê.
 * ?tela=card | modal | cart
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@/index.css';
import CatalogProductCard from '@/components/catalog/CatalogProductCard';
import ProductDetailsModal from '@/components/catalog/ProductDetailsModal';
import Cart from '@/pages/Cart';

const tela = new URLSearchParams(window.location.search).get('tela') || 'card';
const EU = { id: 'a1b2c3d4e5f60718293a4b5c', full_name: 'Eduardo Teste', email: 'e@teste.com', role: 'user', terms_accepted: true }; // terms_accepted: é o que jaAceitouTermo() lê — sem isso o ADICIONAR abre o termo em vez de adicionar
localStorage.setItem('currentUser', JSON.stringify(EU));
const ARVORE = { id: 'p-arvore', description: 'Árvore De Natal Pinheiro Neve 2,10m Luxo', price_catalog: 350, quantity: 5, image_urls: [], category: 'casa' };
const SECADOR = { id: 'p-secador', description: 'Secador de cabelo Britânia SP2100', price_catalog: 70, quantity: 1, image_urls: [] };

window.__plataformaFalsa.respostas = {
  getMyWallet: { success: true, saldo_disponivel: 0, commission_balance: 0, kyc_status: 'aprovado', commissions: [], withdrawals: [] },
  cotarFrete: { success: true, opcoes: [] },
};
if (tela === 'cart') {
  localStorage.setItem('catalogCart', JSON.stringify([{ ...ARVORE, quantity: 1, availableStock: 5 }, { ...SECADOR, quantity: 2, availableStock: 1 }]));
}

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter initialEntries={['/Catalog']}>
    <div style={{ background: '#0b1220', minHeight: '100vh', padding: 16 }} data-teste={`tela-${tela}`}>
      {tela === 'card' && <div style={{ maxWidth: 320 }}><CatalogProductCard product={ARVORE} currentUser={EU} /></div>}
      {tela === 'modal' && <ProductDetailsModal product={ARVORE} currentUser={EU} onClose={() => {}} />}
      {tela === 'cart' && <Cart />}
      <Toaster />
    </div>
  </MemoryRouter>
);
