import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import XGameJornada from '@/components/licensing/CentralVendas/XGameJornada';

// tarefa do momento: título livre demais pra bater em qualquer SELO/CENA por
// palavra, mas com o Hábito GRAVADO (o mesmo que a distribuição/catálogo já
// grava) — é o caso do DIR-94: a imagem tem que convergir pelo Hábito.
const tarefas = [
  {
    id: 't1', hora: '09:00', titulo: 'Decidir com os números: o gargalo da empresa nesta semana',
    habito: 7, feito: false, estado: { id: 'AGORA' },
  },
];

createRoot(document.getElementById('raiz')).render(
  <XGameJornada tarefas={tarefas} nome="Ana" pct={0} fogo={null} onTarefa={() => {}} agoraMin={9 * 60} />,
);
