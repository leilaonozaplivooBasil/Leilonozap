/**
 * Banca do SAQUE DO VENDEDOR — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (23/09/2026 — "hoje ninguém consegue sacar")
 * O Painel do Vendedor carregava de uma rota inexistente e o modal de saque
 * chamava OUTRA rota inexistente e lia a resposta no campo errado. Nenhum
 * teste de regra pegaria: cada peça "funcionava" sozinha. Aqui roda a página
 * REAL, com o servidor de mentira respondendo como o de verdade responde —
 * inclusive o 'not_implemented' da rota que não existe.
 *
 * ?kyc=aprovado|nao_iniciado escolhe o cenário.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@/index.css';
import SellerPanel from '@/pages/SellerPanel';

const kyc = new URLSearchParams(window.location.search).get('kyc') || 'aprovado';
// id com 24 hex e is_seller: é o que a página exige pra reconhecer um vendedor logado
const USUARIO = { id: 'a1b2c3d4e5f60718293a4b5c', full_name: 'Verônica Teste', email: 'v@teste.com', role: 'user', is_seller: true, referral_code: 'VERO' };
localStorage.setItem('currentUser', JSON.stringify(USUARIO));

window.__plataformaFalsa.respostas = {
  getMyWallet: { success: true, commission_balance: 321.71, saldo_disponivel: 0, saldo_alocado: 0, kyc_status: kyc, cpf: '123.456.789-09',
    withdrawals: [{ valor: 50, status: 'pending', requested_at: '2026-09-20T10:00:00Z' }] },
  // a rota que NÃO existe no servidor — o cliente da casa devolve exatamente isto
  getSellerDashboardData: { ok: false, error: 'not_implemented', name: 'getSellerDashboardData', status: 404 },
  requestWithdrawal: (corpo) => (corpo?.user_id && corpo?.valor > 0
    ? { success: true, withdrawal_id: 'w1', valor: corpo.valor, message: 'Pedido de saque enviado. Será pago no PIX do seu CPF após aprovação.' }
    : { success: false, error: 'Usuário e valor são obrigatórios' }),
};

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter initialEntries={['/SellerPanel']}>
    <Routes>
      <Route path="/SellerPanel" element={<SellerPanel />} />
      <Route path="/Carteira" element={<div data-teste="pagina-carteira">CARTEIRA (validar identidade)</div>} />
    </Routes>
    <Toaster />
  </MemoryRouter>
);
