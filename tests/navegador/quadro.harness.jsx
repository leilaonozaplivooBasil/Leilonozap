/**
 * Banca do NOSSO QUADRO com os três destinos — NÃO vai para o bundle.
 *
 * 🔴 POR QUE ISTO EXISTE (06/09/2026)
 * Dono: "quando adicionar no quadro, dá a opção de enviar pra Jornada e pra
 * lista; quando adicionar na lista, pra Jornada e pro quadro. E melhorar a
 * comunicação do quadro — a pessoa não está entendendo." Monta o quadro real
 * do Emanuel em cima de um banco de mentira com três cards em três situações:
 * solto (só no quadro), no dia SEM horário (o caso confuso) e no dia COM
 * horário (na Jornada às 07:00).
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import '@/index.css';
import QuadroCompromisso from '@/components/licensing/CentralVendas/QuadroCompromisso';

const HOJE = '2026-09-07';
window.__bancoFalso = {
  escritas: [],
  tabelas: {
    metodo_quadro_listas: [
      { id: 'l1', user_id: 'emanuel', nome: 'Academia', cor: 'teal', ordem: 0, recolhida: false },
      { id: 'l2', user_id: 'emanuel', nome: 'Pessoal', cor: 'ambar', ordem: 1, recolhida: false },
    ],
    metodo_quadro: [
      { id: 'q1', user_id: 'emanuel', lista_id: 'l1', titulo: 'Quinta — Empurrar B', coluna: 'aberto', checklist: [], ordem: 0 },
      { id: 'q2', user_id: 'emanuel', lista_id: 'l1', titulo: 'Segunda — Empurrar A', coluna: 'aberto', checklist: [], ordem: 1, virou_tarefa_id: 't2', virou_tarefa_em: '2026-09-07T06:00:00.000Z' },
      { id: 'q3', user_id: 'emanuel', lista_id: 'l1', titulo: 'Corrida leve', coluna: 'aberto', checklist: [], ordem: 2, hora: '07:00', virou_tarefa_id: 't3', virou_tarefa_em: '2026-09-07T06:00:00.000Z' },
    ],
    metodo_tarefas: [
      { id: 't2', user_id: 'emanuel', data: HOJE, hora: null, titulo: 'Segunda — Empurrar A', feito: false },
      { id: 't3', user_id: 'emanuel', data: HOJE, hora: '07:00', titulo: 'Corrida leve', feito: false },
      { id: 't9', user_id: 'emanuel', data: HOJE, hora: '18:00', hora_fim: '19:00', titulo: 'Fechamento do dia', feito: false },
    ],
  },
};
const EMANUEL = { id: 'emanuel', full_name: 'Emanuel Silva', email: 'emanuel@x.com', role: 'user', career_levels: ['executivo_conta'] };

createRoot(document.getElementById('raiz')).render(
  <div className="min-h-screen p-4" style={{ background: '#00020C' }}>
    <Toaster position="top-center" />
    <QuadroCompromisso currentUser={EMANUEL} hojeISO={HOJE} tarefasDoDia={window.__bancoFalso.tabelas.metodo_tarefas} onTarefaCriada={(t) => { window.__tarefasCriadas = [...(window.__tarefasCriadas || []), t]; }} />
  </div>,
);
