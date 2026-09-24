/**
 * Banca do BLOCO DE DEMANDAS (botão "D") — NÃO vai para o bundle do app.
 *
 * As peças têm provas no Node. Isto mede o que só a tela responde: o "D"
 * aparece, o modal abre, anotar cria a demanda, a tarefa de HOJE sem horário
 * e o card ligado, fecha a demanda apontando pros dois, dispara o evento que
 * as telas abertas ouvem, e a lista do modal mostra a anotação na hora.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import '@/index.css';
import BlocoDeDemandas from '@/components/nav/BlocoDeDemandas';

window.__bancoFalso = {
  tabelas: {
    xperf_demandas: [
      { id: 'd0', pessoa_id: 'u1', origem: 'bloco', titulo: 'Anotação antiga', status: 'agendada', tarefa_id: 'tx', card_id: 'cx', created_at: '2026-09-20T10:00:00Z' },
      { id: 'd9', pessoa_id: 'u1', origem: 'mapa', titulo: 'Do mapa — não é do bloco', status: 'recebida', created_at: '2026-09-23T10:00:00Z' },
    ],
    metodo_tarefas: [{ id: 't-existente', user_id: 'u1', data: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()), titulo: 'já tinha uma', feito: false }],
    metodo_quadro: [],
  },
  escritas: [],
};
window.__eventos = [];
window.addEventListener('demandaAnotada', () => window.__eventos.push('demandaAnotada'));

createRoot(document.getElementById('raiz')).render(
  <div style={{ padding: 16, background: '#0b1f18', minHeight: '100vh' }}>
    <div className="flex items-center gap-3" data-teste="cabecalho-falso">
      <span className="text-white/60 text-sm">logo · Top College ·</span>
      <BlocoDeDemandas currentUser={{ id: 'u1', full_name: 'Ana Exemplo', email: 'ana@x.com' }} />
    </div>
    <div className="mt-6" data-teste="deslogado"><BlocoDeDemandas currentUser={null} /></div>
    <Toaster richColors position="top-center" />
  </div>,
);
