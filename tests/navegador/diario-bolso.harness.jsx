import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import DiarioDeBolso from '@/components/licensing/CentralVendas/DiarioDeBolso';

window.__bancoFalso = {
  tabelas: {
    metodo_tarefas: [
      {
        id: 't1', user_id: 'u1', data: '2026-09-08', hora: '19:00', titulo: 'Leitura do dia', feito: true,
        comprovacao: { tipo: 'aprendizado', resumo: 'Achei uma ideia boa sobre follow-up com o cliente que sumiu.' },
      },
      {
        id: 't2', user_id: 'u1', data: '2026-09-08', hora: '05:30', titulo: 'Corrida da manhã', feito: true,
        comprovacao: { tipo: 'foto', print_url: 'https://x/foto.jpg', veredito_ia: { o_que_viu: 'a pessoa correndo ao amanhecer, com o relógio marcando a distância' } },
      },
      {
        id: 't3', user_id: 'u1', data: '2026-09-07', hora: '13:00', titulo: 'Reunião 1', feito: true,
        mentalidade: 'diretor', habito: 6, detalhe: 'follow-up dos clientes em PPV do time',
      },
      { id: 't4', user_id: 'u1', data: '2026-09-07', hora: '12:00', titulo: 'Almoço', feito: true },
      { id: 't5', user_id: 'outro', data: '2026-09-08', hora: '09:00', titulo: 'tarefa de outra pessoa', feito: true, comprovacao: { resumo: 'não devia aparecer' } },
    ],
  },
  escritas: [],
};

createRoot(document.getElementById('raiz')).render(
  <DiarioDeBolso currentUser={{ id: 'u1', nome: 'Ana' }} />,
);
