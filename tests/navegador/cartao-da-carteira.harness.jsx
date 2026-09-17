/**
 * Banca do CHECKOUT DE VERDADE — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (17/09/2026)
 * Numa demonstração: escolheu o valor, marcou Cartão, apertou o botão — e o
 * checkout carregou em PIX. Teste que lê o arquivo prova que a linha mudou;
 * não prova que a TELA abre no cartão. Aqui roda o `AuctionCheckoutModern`
 * REAL, recebendo o mesmo `state` que a gaveta da carteira manda.
 *
 * `?pix=1` repete a entrada SEM escolha feita — que tem que continuar em PIX.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';

// o checkout lê o usuário do localStorage antes de desenhar
localStorage.setItem('currentUser', JSON.stringify({
  id: 'u1', full_name: 'Emannuel Teste', email: 'e@teste.com',
  phone: '21999990000', cpf: '12345678909', role: 'user',
}));

window.__bancoFalso = { tabelas: {}, escritas: [] };
window.__entidadesFalsas = { Auction: [], AppUser: [] };

// sem escolha feita = entrada por link de leilão; com escolha = veio da carteira
const semEscolha = new URLSearchParams(window.location.search).get('pix') === '1';

const estado = semEscolha
  ? { amount: 1000, depositType: 'digital_wallet', returnTo: null }
  : { amount: 1000, depositType: 'digital_wallet', returnTo: null, paymentType: 'CREDIT_CARD' };

import('@/pages/AuctionCheckoutModern').then(({ default: Checkout }) => {
  createRoot(document.getElementById('raiz')).render(
    <MemoryRouter initialEntries={[{ pathname: '/AuctionCheckoutModern', state: estado }]}>
      <Checkout />
    </MemoryRouter>
  );
});
