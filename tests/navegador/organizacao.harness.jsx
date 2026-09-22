/**
 * Banca da ORGANIZAÇÃO DO DIA — NÃO vai para o bundle do app.
 *
 * A conta (quem organizou, o %, a ordem, o CSV) tem 19 provas no Node. Isto
 * aqui mede só o que a régua não alcança:
 *   • o time sai do BANCO sozinho (a aba não recebe `pessoas` de ninguém —
 *     MentalidadePagina não carrega usuários), e as contas institucionais
 *     ficam de fora;
 *   • quem NÃO organizou aparece em cima, que é a leitura que o dono pediu;
 *   • o "exportar" gera arquivo de verdade.
 *
 * ⚠️ Nada de `pessoas` aqui de propósito: passar a lista pronta testaria a
 * banca, não a tela.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import OrganizacaoDoDia from '@/components/licensing/CentralVendas/OrganizacaoDoDia';

const HOJE = '2026-09-19';
const hoje = (h) => `${HOJE}T${h}:00-03:00`;

window.__bancoFalso = {
  tabelas: {
    app_users: [
      { id: 'u1', full_name: 'Ana Prado', primary_career_level: 'executivo_conta' },
      { id: 'u2', full_name: 'Bruno Lima', primary_career_level: 'diretoria_operacao' },
      { id: 'u3', full_name: 'Carla Souza', primary_career_level: 'embaixador' },
      // conta institucional: carrega nível, mas não é gente — fica fora
      { id: 'u9', full_name: 'Leilão Nozap – Site Oficial', primary_career_level: 'embaixador' },
      // fora do time corporativo (bloco rede): não entra
      { id: 'u8', full_name: 'Diego Rede', primary_career_level: 'vendedor' },
    ],
    xperf_demandas: [
      // Ana ORGANIZOU: duas tratadas hoje
      { id: 'd1', pessoa_id: 'u1', status: 'agendada', created_at: hoje('10:40'), updated_at: hoje('10:55') },
      { id: 'd2', pessoa_id: 'u1', status: 'devolvida', created_at: hoje('10:41'), updated_at: hoje('11:10') },
      // Bruno NÃO organizou: duas esperando
      { id: 'd3', pessoa_id: 'u2', status: 'recebida', created_at: hoje('09:00'), updated_at: hoje('09:00') },
      { id: 'd4', pessoa_id: 'u2', status: 'recebida', created_at: hoje('09:05'), updated_at: hoje('09:05') },
      // Carla NÃO organizou: tratou, mas foi ONTEM
      { id: 'd5', pessoa_id: 'u3', status: 'agendada', created_at: '2026-09-18T12:00:00-03:00', updated_at: '2026-09-18T15:00:00-03:00' },
      // demanda de quem não é do time — não pode entrar em conta nenhuma
      { id: 'd6', pessoa_id: 'u8', status: 'recebida', created_at: hoje('09:00'), updated_at: hoje('09:00') },
    ],
    metodo_tarefas: [
      { id: 't1', user_id: 'u1', data: HOJE, feito: true },
      { id: 't2', user_id: 'u1', data: HOJE, feito: false },
      { id: 't3', user_id: 'u2', data: HOJE, feito: true },
      // de ontem: não conta no dia de hoje
      { id: 't4', user_id: 'u3', data: '2026-09-18', feito: true },
    ],
  },
  escritas: [],
};

createRoot(document.getElementById('raiz')).render(
  <div style={{ padding: 16, background: '#0A1410', minHeight: '100vh' }}>
    <OrganizacaoDoDia hojeISO={HOJE} />
  </div>,
);
