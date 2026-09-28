/**
 * Banca da tela DEPÓSITOS CONFIRMADOS com a comissão de cada depósito — NÃO vai
 * para o bundle do app. 28/09/2026, pedido da Beatriz: ver a comissão de
 * depósito "dentro do site", sem relatório. Os depósitos passam pela régua REAL
 * (situacaoDaComissao) — a mesma que a rota usa.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import AdminDepositosConfirmados from '@/pages/AdminDepositosConfirmados';
import { situacaoDaComissao } from '@/lib/comissaoDoDeposito';

localStorage.setItem('currentUser', JSON.stringify({ id: 'adm', full_name: 'Admin Teste', role: 'admin', email: 'a@teste.com' }));
const VERA = { id: 'v1', nome: 'Vera Rede', ativo: true, empresa: false };
const LUCAS = { id: 'l1', nome: 'Lucas Rede', ativo: true, empresa: false };
const SITE = { id: 's1', nome: 'Leilão NoZap - Site Oficial', ativo: true, empresa: true };
const linha = (id, nome, valor, quando, indicador, lanc, extra = {}) => {
  const d = { id, user_id: `c-${id}`, email: `${id}@cliente.com`, name: nome, kind: 'wallet_deposit', amount: valor, status: 'confirmed', payment_method: 'pix_mp', created_date: quando, ...extra };
  return { ...d, indicador, comissao: { ...situacaoDaComissao({ deposito: d, indicador, lancamento: lanc, pago: extra.pago }), recebe: indicador?.nome || null } };
};
window.__plataformaFalsa.respostas.adminListDeposits = { success: true, deposits: [
  linha('d1', 'Cliente Um', 2000, '2026-09-26T19:01:00Z', VERA, { amount: 200, status: 'a_liberar', release_at: '2026-10-03T19:01:00Z' }),
  linha('d2', 'Cliente Dois', 1250, '2026-09-26T15:51:00Z', LUCAS, { amount: 125, status: 'disponivel' }, { pago: true }),
  linha('d3', 'Cliente Três', 600, '2026-09-24T12:09:00Z', VERA, { amount: 60, status: 'disponivel' }),
  linha('d4', 'Cliente Quatro', 27, '2026-09-27T20:56:00Z', SITE, { amount: 2.7, status: 'a_liberar', release_at: '2026-10-04T20:56:00Z' }),
  linha('d5', 'Cliente Cinco', 900, '2026-09-20T10:04:00Z', VERA, null),
  linha('d6', 'Cliente Seis', 500, '2026-09-27T15:00:00Z', VERA, null, { status: 'failed' }),
] };

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchInterval: false } } });
createRoot(document.getElementById('raiz')).render(
  <QueryClientProvider client={qc}><MemoryRouter><AdminDepositosConfirmados /></MemoryRouter></QueryClientProvider>,
);
