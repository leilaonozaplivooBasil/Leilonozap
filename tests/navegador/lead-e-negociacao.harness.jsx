/**
 * Banca do LEAD NO CARD DO QUADRO e da aba NEGOCIAÇÃO — NÃO vai para o bundle.
 *
 * 23/09/2026 — "qualificar lead + Google Agenda pelo quadro" e "aba Negociação".
 * ?tela=quadro | negociacao escolhe o que montar. Sem token do Google (a rede
 * é bloqueada aqui), o botão de agenda tem que cair no LINK pré-preenchido —
 * é exatamente o caminho de quem não conectou a conta.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@/index.css';
import QuadroCompromisso from '@/components/licensing/CentralVendas/QuadroCompromisso';
import Negociacao from '@/components/licensing/CentralVendas/Negociacao';

const tela = new URLSearchParams(window.location.search).get('tela') || 'quadro';
const EU = { id: 'a1b2c3d4e5f60718293a4b5c', full_name: 'Verônica Teste', role: 'user' };
const HOJE = '2026-09-23';

// abrir aba nova não existe na banca — guardo a URL pra prova ler
window.__abriu = [];
window.open = (url) => { window.__abriu.push(String(url)); return null; };

window.__entidadesFalsas = {
  Customer: [
    { id: 'c1', full_name: 'Ângela Conceição', created_by_id: EU.id, purchase_status: 'em_negociacao', follow_up_date: '2026-09-10', next_steps: 'mandar proposta' },
    { id: 'c2', full_name: 'José Antônio', created_by_id: EU.id, purchase_status: 'em_negociacao', follow_up_date: '2026-09-23', qualificacao_network: { abertura: 5, necessidade: 4, poder: 3 } },
    { id: 'c3', full_name: 'Luís Gonçalves', created_by_id: EU.id, purchase_status: 'em_negociacao' },
    { id: 'c4', full_name: 'Cliente de Outro', created_by_id: 'outra-pessoa', purchase_status: 'em_negociacao', follow_up_date: '2026-09-01' },
    { id: 'c5', full_name: 'Já Pagou', created_by_id: EU.id, purchase_status: 'pago' },
  ],
};
window.__bancoFalso = {
  escritas: [],
  tabelas: {
    metodo_quadro_listas: [{ id: 'l1', user_id: EU.id, nome: 'Semana', ordem: 0, icone: '📋', cor: '#1B7A48' }],
    metodo_quadro: [{ id: 'k1', user_id: EU.id, lista_id: 'l1', titulo: 'Apresentar o Método', detalhe: 'levar material', coluna: 'aberto', prazo: '2026-09-24', hora: '14:00', hora_fim: '15:00', ordem: 0, checklist: [] }],
    metodo_tarefas: [],
  },
};

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter initialEntries={['/Licensing']}>
    <div style={{ background: '#0b1220', minHeight: '100vh', padding: 16 }}>
      {tela === 'quadro'
        ? <QuadroCompromisso currentUser={EU} hojeISO={HOJE} tarefasDoDia={[]} onTarefaCriada={() => {}} />
        : <Negociacao currentUser={EU} superAdmin={false} />}
      <Toaster />
    </div>
  </MemoryRouter>
);
