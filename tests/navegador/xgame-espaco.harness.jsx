/**
 * Banca do ESPAÇO X-GAME (DIR-97, 08/09/2026) — a página /XGame, órfã até
 * aqui, atualizada pra ter o mesmo X-Pay/ofensiva/missões que o Compromisso
 * já tinha, e a Visão Executiva do time (XGameVisaoExecutiva) embutida.
 * As datas do banco de mentira são calculadas em cima de "hoje" de verdade
 * (a página usa `new Date()`, sem gancho de data de teste), pra não quebrar
 * dependendo do dia em que a prova rodar.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { dataISO, inicioCiclo } from '@/lib/xgame';
import XGame from '@/pages/XGame';

const HOJE = new Date();
const HOJE_ISO = dataISO(HOJE);
const CICLO_INICIO = dataISO(inicioCiclo(HOJE));
const ontem = new Date(HOJE); ontem.setDate(ontem.getDate() - 1);
const anteontem = new Date(HOJE); anteontem.setDate(anteontem.getDate() - 2);

localStorage.setItem('currentUser', JSON.stringify({ id: 'dono', full_name: 'Luiz Santanna', nickname: 'Luiz' }));

window.__bancoFalso = {
  escritas: [],
  tabelas: {
    app_users: [
      { id: 'dono', full_name: 'Luiz Santanna', nickname: 'Luiz', role: 'super_admin' },
      { id: 'carla', full_name: 'Carla Souza', nickname: 'Carla', role: 'user' },
    ],
    xgame_participantes: [
      { id: 'p1', user_id: 'dono', cargo: 'ceo', perfil: 'estrategico', verba_producao: 1300, verba_bonus: 200, valor_venda: 50, ativo: true, fixo_mes: 7000, minimo_dia: 3 },
      { id: 'p2', user_id: 'carla', cargo: 'diretor', perfil: 'operacional', verba_producao: 1300, verba_bonus: 200, valor_venda: 50, ativo: true, fixo_mes: 5000, minimo_dia: 3 },
    ],
    xgame_config: [],
    metodo_tarefas: [
      { id: 't1', user_id: 'dono', data: HOJE_ISO, hora: '07:00', titulo: 'Gratidão', peso: 5, categoria: 'producao', feito: true, ordem: 0 },
      { id: 't2', user_id: 'dono', data: HOJE_ISO, hora: '09:00', titulo: 'Reunião com cliente', peso: 6, categoria: 'producao', feito: true, ordem: 1 },
    ],
    xgame_diario: [
      { id: 'd1', user_id: 'dono', data: dataISO(anteontem), ciclo_inicio: CICLO_INICIO, tarefas_total: 3, tarefas_feitas: 3, mvm_dia: 9 },
      { id: 'd2', user_id: 'dono', data: dataISO(ontem), ciclo_inicio: CICLO_INICIO, tarefas_total: 3, tarefas_feitas: 3, mvm_dia: 8.5, detalhes: { leitura_feita: true } },
      // time: um dia do ciclo pra Carla aparecer no pódio/tabela da Visão Executiva
      { id: 'd3', user_id: 'carla', data: dataISO(ontem), ciclo_inicio: CICLO_INICIO, tarefas_total: 4, tarefas_feitas: 3, mvm_dia: 7, token_dia: 12, pontos: 40, detalhes: { xpay_ganho: 300, xpay_perdido: 0 } },
    ],
    xgame_votos_mvm: [],
  },
};

createRoot(document.getElementById('raiz')).render(<XGame />);
