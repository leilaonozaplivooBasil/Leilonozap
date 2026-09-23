/** Banca do rodapé da Jornada (estilo Duolingo) — NÃO vai para o bundle. Um dia com os quatro períodos. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import XGameJornada from '@/components/licensing/CentralVendas/XGameJornada';

const tarefas = [
  { id: 'a1', hora: '05:30', titulo: 'Ritual do Amanhecer', habito: 2, feito: true },
  { id: 'a2', hora: '06:30', titulo: 'Treino', habito: 2, feito: true },
  { id: 'm1', hora: '09:00', titulo: 'Lista de networking: qualificar 5 pessoas', habito: 3, feito: true },
  { id: 'm2', hora: '10:30', titulo: 'Contato e convite: 3 ligações', habito: 4, feito: false, estado: { id: 'AGORA' } },
  { id: 't1', hora: '14:00', titulo: 'Apresentação de sucesso', habito: 5, feito: false },
  { id: 't2', hora: '16:00', titulo: 'Acompanhamento: fila do dia', habito: 6, feito: false },
  { id: 'n1', hora: '19:30', titulo: 'Verificação do progresso', habito: 7, feito: false },
];
window.__vividos = 0;
createRoot(document.getElementById('raiz')).render(
  <div className="nz-painel" style={{ minHeight: '100vh', background: '#fff' }} data-teste="banca-rodape">
    <XGameJornada tarefas={tarefas} nome="Ana" pct={43} fogo={{ dias: 4 }} onTarefa={() => { window.__vividos += 1; }} agoraMin={10 * 60 + 40} />
  </div>,
);
