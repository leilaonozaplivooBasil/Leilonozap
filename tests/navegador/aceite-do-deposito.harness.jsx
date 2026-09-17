/**
 * Banca do BOTÃO DE DEPÓSITO — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (17/09/2026)
 * Numa demonstração, o botão de depósito no cartão "fingia que abria e não
 * abria". Não era cache, nem o meio de pagamento: o botão nascia `disabled`
 * enquanto a caixa de aceite do crédito — que fica ACIMA dos valores, fora do
 * campo de visão — estivesse desmarcada. Botão desligado não dispara onClick,
 * então nem o aviso que já existia no código aparecia.
 *
 * Medido na base: 742 das 776 contas ainda não aceitaram esta versão do termo.
 *
 * Aqui roda a gaveta REAL com um usuário SEM aceite — o caso de quase todo
 * mundo. Um teste de classe CSS não serviria: o que importa é se o clique
 * produz alguma coisa.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@/index.css';
import WalletDrawer from '@/components/wallet/WalletDrawer';

// 🔴 SEM `passaporte_terms_accepted_at`: é assim que 742 das 776 contas estão.
const USUARIO = {
  id: 'u-sem-aceite', full_name: 'Emannuel Teste', email: 'e@teste.com',
  phone: '21999990000', cpf: '12345678909', role: 'user',
};

window.__bancoFalso = { tabelas: {}, escritas: [] };
window.__entidadesFalsas = {};

// a gaveta busca a carteira ao abrir; sem resposta ela fica carregando e a
// tela de recarga nunca desenha. `estado.respostas` é o canal do cliente falso.
window.__plataformaFalsa.respostas = {
  getMyWallet: { success: true, saldo_disponivel: 0, saldo_livre_loja: 0, commission_balance: 0,
    saldo_reservado: 0, saldo_alocado: 0, saldo_a_liberar: 0, kyc_status: 'aprovado',
    commissions: [], withdrawals: [] },
  getDigitalWalletHistory: { success: true, transactions: [] },
};

// 🔴 MemoryRouter e Toaster NÃO são enfeite: a gaveta chama `useNavigate` (que
// estoura fora de um Router) e `toast` (que sem o Toaster não pinta nada na
// tela — e é justamente o aviso que esta prova precisa ler).
createRoot(document.getElementById('raiz')).render(
  <MemoryRouter initialEntries={['/Home']}>
    <div style={{ background: '#0b1220', minHeight: '100vh' }}>
      <WalletDrawer open onClose={() => {}} currentUser={USUARIO} startView="recharge" />
      <Toaster />
    </div>
  </MemoryRouter>
);
