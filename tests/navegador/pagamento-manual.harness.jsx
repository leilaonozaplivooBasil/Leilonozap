/**
 * Banca do PAGAMENTO MANUAL DE COMISSÃO — NÃO vai para o bundle do app.
 *
 * A regra (valor, saldo, chave) tem provas no Node, e o débito atômico mora no
 * servidor. Isto aqui mede o que só a tela responde: o botão aparece só pra
 * quem tem saldo, o modal avisa quando falta KYC, a rota é chamada com os
 * dados certos, e DEPOIS de pagar a tela recarrega e mostra o saldo novo e o
 * histórico — que é o que impede a Beatriz de pagar a mesma coisa duas vezes.
 *
 * Nomes de mentira: as fotos desta banca vão pro guia da Beatriz.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@/index.css';
import PagamentosComissoes from '@/pages/PagamentosComissoes';

const MARIA = { id: 'u_maria', full_name: 'Maria Exemplo', kyc_status: 'nao_iniciado', commission_balance: 324.65 };
const JOAO = { id: 'u_joao', full_name: 'João Modelo', kyc_status: 'aprovado', commission_balance: 77.45 };
const ANA = { id: 'u_ana', full_name: 'Ana Teste', kyc_status: 'nao_iniciado', commission_balance: 0 };

window.__entidadesFalsas = {
  AppUser: [MARIA, JOAO, ANA],
  CommissionRecord: [
    { id: 'c1', user_id: 'u_maria', user_name: 'Maria Exemplo', role: 'vendedor', product_title: 'Patinete elétrico', percent: 10, amount: 199.7, status: 'pending' },
    { id: 'c2', user_id: 'u_maria', user_name: 'Maria Exemplo', role: 'indicador', product_title: 'Depósito na carteira', percent: 10, amount: 124.95, status: 'confirmed' },
    { id: 'c3', user_id: 'u_joao', user_name: 'João Modelo', role: 'vendedor', product_title: 'Kit Trilho Eletrificado', percent: 5, amount: 77.45, status: 'pending' },
    { id: 'c4', user_id: 'u_ana', user_name: 'Ana Teste', role: 'vendedor', product_title: 'Cinta modeladora', percent: 10, amount: 40, status: 'pending' },
  ],
  ComissaoPagamentoManual: [
    { id: 'p0', user_id: 'u_ana', valor: 40, pix_key_usada: '21999990000', pago_por_nome: 'Beatriz', nota: 'pago pelo Nubank', created_at: '2026-09-24T12:00:00Z' },
  ],
};

// o servidor de mentira faz o que o de verdade faz: desconta e registra junto
window.__plataformaFalsa.respostas.payCommissionManually = (corpo) => {
  const u = window.__entidadesFalsas.AppUser.find((x) => x.id === corpo.user_id);
  if (!u || u.commission_balance < corpo.valor) return { success: false, error: 'Saldo insuficiente.' };
  u.commission_balance = Math.round((u.commission_balance - corpo.valor) * 100) / 100;
  // array NOVO, não push: o cliente de verdade devolve uma lista nova a cada
  // leitura, e a tela depende disso pra recalcular o "Já pago"
  window.__entidadesFalsas.ComissaoPagamentoManual = [...window.__entidadesFalsas.ComissaoPagamentoManual, {
    id: `p${Date.now()}`, user_id: u.id, valor: corpo.valor, pix_key_usada: corpo.pix_key_usada,
    nota: corpo.nota, pago_por_nome: 'Beatriz', created_at: new Date().toISOString(),
  }];
  return { success: true, message: 'Pagamento registrado e descontado do saldo.', saldo_depois: u.commission_balance };
};

localStorage.setItem('currentUser', JSON.stringify({ id: 'u_beatriz', full_name: 'Beatriz', role: 'admin' }));

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>
    <PagamentosComissoes />
    <Toaster richColors position="top-center" />
  </MemoryRouter>,
);
