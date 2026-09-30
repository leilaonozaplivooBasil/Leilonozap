/**
 * Banca do DINHEIRO EM LEILÃO — NÃO vai para o bundle. 30/09/2026, caso Paulo
 * Victor: R$ 220 na carteira, R$ 44,78 no checkout da loja. As telas REAIS
 * (Carteira e Carrinho) com a resposta do getMyWallet no formato do servidor.
 *   ?tela=carteira | cart      ?tudo=1 → todo o saldo está em leilão
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@/index.css';
import Carteira from '@/pages/Carteira';
import Cart from '@/pages/Cart';

const q = new URLSearchParams(window.location.search);
const tela = q.get('tela') || 'carteira';
const tudo = q.has('tudo');
const EU = { id: 'u-paulo', full_name: 'Cliente Teste', email: 'cliente@teste.com', role: 'user', terms_accepted: true, commission_balance: 0 };
localStorage.setItem('currentUser', JSON.stringify(EU));
window.__entidadesFalsas = { AppUser: [EU] };

const IPHONE = { auction_id: 'iphone', titulo: 'Apple iPhone 17 512GB 48MP 5G - Preto', valor: 175.22, termina: '2026-10-02T21:00:00Z' };
const disponivel = tudo ? 175.22 : 220;
window.__plataformaFalsa.respostas = {
  getMyWallet: {
    success: true, saldo_disponivel: disponivel, commission_balance: 0, saldo_reservado: 0, saldo_a_liberar: 0, saldo_alocado: 0,
    saldo_comprometido_leilao: 175.22, leiloes_comprometidos: [IPHONE],
    saldo_livre_loja: Math.round((disponivel - 175.22) * 100) / 100,
    kyc_status: 'nao_iniciado', commissions: [], withdrawals: [],
  },
  cotarFrete: { success: true, opcoes: [] },
};
if (tela === 'cart') {
  localStorage.setItem('catalogCart', JSON.stringify([{ id: 'p-relogio', description: 'Relógio Masculino Automático Skeleton', price_catalog: 67, quantity: 1, availableStock: 3, image_urls: [] }]));
}

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter initialEntries={[tela === 'cart' ? '/Cart' : '/Carteira']}>
    <div data-teste={`tela-${tela}`} style={tela === 'cart' ? { background: '#0b1220', minHeight: '100vh', padding: 12 } : {}}>
      {tela === 'carteira' ? <Carteira /> : <Cart />}
      <Toaster />
    </div>
  </MemoryRouter>,
);
