/**
 * Banca da ABA DEMANDAS — NÃO vai para o bundle do app.
 *
 * As regras (agrupar por dia, fuso, o que entra na caixa) têm 19 provas no
 * Node. Isto aqui mede o que só a tela responde: a lista aparece agrupada
 * pelo dia da anotação, e "transformar em tarefa" cria trabalho DE VERDADE
 * nas tabelas — que é o pedido do áudio, e o ponto onde uma anotação pode
 * sumir sem virar nada.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import DemandasCompromisso from '@/components/licensing/CentralVendas/DemandasCompromisso';

const HOJE = '2026-09-19';

// a banca semeia ANTES de renderizar — o falso/supabaseClient lê a cada chamada
window.__bancoFalso = {
  tabelas: {
    xperf_demandas: [
      { id: 'd1', pessoa_id: 'u1', titulo: 'ligar pro fornecedor', status: 'recebida', origem: 'mapa', created_at: '2026-09-19T18:00:00Z' },
      { id: 'd2', pessoa_id: 'u1', titulo: 'fechar o caixa', status: 'recebida', origem: 'mapa', created_at: '2026-09-19T13:00:00Z' },
      { id: 'd3', pessoa_id: 'u1', titulo: 'comprar etiqueta', status: 'recebida', origem: 'encontro', created_at: '2026-09-17T09:00:00Z' },
      // já virou trabalho — NÃO pode aparecer na caixa
      { id: 'd4', pessoa_id: 'u1', titulo: 'isso já foi', status: 'agendada', origem: 'mapa', created_at: '2026-09-19T20:00:00Z' },
      // de outra pessoa — NÃO pode aparecer
      { id: 'd5', pessoa_id: 'u2', titulo: 'demanda alheia', status: 'recebida', origem: 'mapa', created_at: '2026-09-19T19:00:00Z' },
    ],
    metodo_tarefas: [],
    metodo_quadro: [],
  },
  escritas: [],
};

createRoot(document.getElementById('raiz')).render(
  <div style={{ padding: 16, background: '#0A1410', minHeight: '100vh' }}>
    <DemandasCompromisso
      uid="u1" hojeISO={HOJE} nome="Basil"
      onAbrirNoMapa={(d) => { (window.__proMapa ||= []).push(d?.titulo); }}
    />
  </div>,
);
