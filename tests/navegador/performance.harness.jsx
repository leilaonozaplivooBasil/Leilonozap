/**
 * Banca da GESTÃO DO X-PERFORMANCE — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (06/09/2026)
 * Dono: "junta o admin do X-Game com o X-Performance; ali eu boto a tarefa,
 * escolho o responsável, entra na tarefa do dia dele já com quanto vale em
 * dinheiro, e o sistema me avisa: peso x vale x, e tira das outras".
 * Monta o X-Performance real (com a gestão ligada) em cima de um banco de
 * mentira semeado com o Emanuel a R$ 7.000 e três tarefas no dia 08/09.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import '@/index.css';
import XPerformance from '@/components/licensing/CentralVendas/XPerformance';

const HOJE = '2026-09-07'; // segunda; "amanhã" é terça 08/09
window.__bancoFalso = {
  escritas: [],
  tabelas: {
    app_users: [
      { id: 'dono', full_name: 'Luiz Santanna', nickname: 'Luiz', role: 'super_admin', career_levels: ['ceo'] },
      { id: 'emanuel', full_name: 'Emanuel Silva', nickname: 'Emanuel', role: 'user', career_levels: ['executivo_conta'] },
      { id: 'carla', full_name: 'Carla Souza', nickname: 'Carla', role: 'user', career_levels: ['embaixador'] },
      { id: 'tiago', full_name: 'Tiago Trainee', nickname: 'Tiago', role: 'user', career_levels: ['trainee_diretor'] },
    ],
    xgame_participantes: [
      { id: 'p1', user_id: 'emanuel', cargo: 'executivo', perfil: 'estrategico', verba_producao: 1300, verba_bonus: 200, valor_venda: 50, multa_atraso: 200, ativo: true, fixo_mes: 7000, minimo_dia: 3, created_date: '2026-09-01' },
      { id: 'p2', user_id: 'carla', cargo: 'diretor', perfil: 'operacional', verba_producao: 1300, verba_bonus: 200, valor_venda: 50, multa_atraso: 50, ativo: true, fixo_mes: null, minimo_dia: 3, created_date: '2026-09-02' },
    ],
    xgame_config: [{ id: 'atual', ciclo_inicio: '2026-09-01' }],
    metodo_tarefas: [
      { id: 't1', user_id: 'emanuel', data: '2026-09-08', hora: '08:00', titulo: 'Gratidão', peso: 1, categoria: 'producao', feito: false },
      { id: 't2', user_id: 'emanuel', data: '2026-09-08', hora: '09:00', titulo: 'Organização do dia', peso: 1, categoria: 'producao', feito: false },
      { id: 't3', user_id: 'emanuel', data: '2026-09-08', hora: '10:00', titulo: 'Reunião com cliente', peso: 2, categoria: 'producao', feito: false },
      { id: 't4', user_id: 'emanuel', data: '2026-09-04', hora: '08:00', titulo: 'Gratidão', peso: 1, categoria: 'producao', feito: true, conferido: true },
      { id: 't5', user_id: 'emanuel', data: '2026-09-04', hora: '09:00', titulo: 'Estudo', peso: 4, categoria: 'bonus', feito: true },
      // ⏰ a Carla deu o pronto numa tarefa distribuída hoje (07/09), antes do prazo — está na fila esperando o ✔✔
      { id: 't6', user_id: 'carla', data: '2026-09-07', hora: '09:00', titulo: 'Enviar o relatório da loja', peso: 4, categoria: 'mentoria', feito: true, origem: 'xperf', mentalidade: 'diretor', habito: 7, prazo_em: new Date('2026-09-07T18:00:00').toISOString() /* 18:00 no fuso do navegador */, pronto_em: new Date('2026-09-07T10:00:00').toISOString() },
    ],
    xperf_encontros: [],
    xperf_entregaveis: [],
  },
};

const DONO = { id: 'dono', full_name: 'Luiz Santanna', email: 'luiz@x.com', role: 'super_admin', career_levels: ['ceo'] };

createRoot(document.getElementById('raiz')).render(
  <div className="xeos-palco min-h-screen p-3 sm:p-6" style={{ background: 'var(--xeos-preto, #00020C)' }}>
    <Toaster position="top-center" />
    <XPerformance currentUser={DONO} visaoTotal gestao hojeISO={HOJE} />
  </div>,
);
