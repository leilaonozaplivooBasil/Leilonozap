/**
 * Banca do ENCONTRO DA MENTALIDADE e do PAINEL CORPORATIVO — NÃO vai para o bundle.
 *
 * 🔴 POR QUE ISTO EXISTE (06/09/2026)
 * Dono: "toda segunda a gente tem esse encontro — um lugar estratégico, a
 * apresentação, uma IA que gera o tópico das pautas, o cronômetro 15+45+120,
 * e as pautas virando demanda pra cada um, no painel de cada um, numa visão
 * executiva de produção". E: "dentro de cada um, o painel corporativo: vê as
 * metas, recebe as demandas e dali direciona pro seu quadro nos seus horários;
 * todo mundo vê todo mundo".
 * Monta as duas telas reais em cima de um banco de mentira. Sem `#emanuel` na
 * URL, quem está logado é o dono (gestão); com `#emanuel`, é o Emanuel
 * (só o próprio painel, sem mandar demanda).
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import '@/index.css';
import EncontroMentalidade from '@/components/licensing/CentralVendas/EncontroMentalidade';
import PerformanceEquipe from '@/components/licensing/CentralVendas/PerformanceEquipe';

const HOJE = '2026-09-07'; // segunda: o encontro é hoje; sexta é 11/09
window.__bancoFalso = {
  escritas: [],
  tabelas: {
    app_users: [
      { id: 'dono', full_name: 'Luiz Santanna', nickname: 'Luiz', role: 'super_admin', career_levels: ['ceo'] },
      { id: 'emanuel', full_name: 'Emanuel Silva', nickname: 'Emanuel', role: 'user', career_levels: ['executivo_conta'] },
      { id: 'jean', full_name: 'Jean Aranha', nickname: 'Jean', role: 'user', career_levels: ['diretoria_operacao'] },
      { id: 'carla', full_name: 'Carla Souza', nickname: 'Carla', role: 'user', career_levels: ['embaixador'] },
    ],
    xgame_participantes: [
      { id: 'p1', user_id: 'emanuel', cargo: 'executivo', ativo: true, fixo_mes: 7000, funcao_titulo: null },
      { id: 'p2', user_id: 'jean', cargo: 'diretor', ativo: true, fixo_mes: 4000, funcao_titulo: null },
    ],
    xperf_encontros: [],
    xperf_programa: [],
    xperf_metas: [{ id: 'm1', user_id: 'emanuel', mes: '2026-09', tipo: 'numero', chave: 'reunioes_investimento', rotulo: 'Reuniões de investimento', alvo: 44, unidade: 'no mês' }],
    catalog_sales: [{ id: 's1', seller_id: 'carla', status: 'paid', kind: 'produto', created_date: '2026-09-07T15:00:00Z', total_amount: 1200 }],
    metodo_tarefas: [
      { id: 't0', user_id: 'emanuel', data: '2026-09-07', hora: '05:15', titulo: 'Story ANTES da atividade física', peso: 4, categoria: 'producao', feito: true },
      { id: 't1', user_id: 'emanuel', data: '2026-09-07', hora: '08:00', titulo: 'Gratidão', peso: 1, categoria: 'producao', feito: true },
      { id: 't2', user_id: 'emanuel', data: '2026-09-07', hora: '09:00', titulo: 'Organização do dia', peso: 1, categoria: 'producao', feito: false },
    ],
    metodo_quadro: [],
    // 📊 os 8 Hábitos: o quadro dos sonhos do Emanuel, a lista/contatos, uma venda da Carla, a captação do Emanuel
    metodo_perfil: [{ id: 'pf1', user_id: 'emanuel', sonhos: [{ titulo: 'Casa' }, { titulo: 'Carro' }] }],
    customers: [
      { id: 'cli1', created_by_id: 'emanuel', qualificacao_network: { confianca: 5, financeiro: 4, apetite: 3 }, contatos_metodo: [{ resultado: 'agendado', em: '2026-09-07T10:00:00Z', registrado_por_id: 'emanuel' }, { resultado: 'feito', em: '2026-09-07T11:00:00Z', registrado_por_id: 'emanuel' }] },
      { id: 'cli2', created_by_id: 'jean', qualificacao_network: null, contatos_metodo: [] },
    ],
    captacao_oportunidades: [{ id: 'o1', responsavel_id: 'emanuel', estagio: 'fechado_100', valor_previsto: 50000, fechado_em: '2026-09-07T16:00:00Z', reuniao_em: '2026-09-07T14:00:00Z' }],
    xperf_entregaveis: [],
    // 📥 uma demanda já recebida pelo Emanuel, do CEO, na sexta passada; e uma da Carla agendada e conferida
    xperf_demandas: [
      { id: 'd1', titulo: 'Mandar a proposta pro ponto de retirada de Jacarepaguá', detalhe: 'Mentalidade do Diretor — multiplicar e medir.', pessoa_id: 'emanuel', pessoa_nome: 'Emanuel Silva', origem: 'ceo', criado_por_id: 'dono', criado_por_nome: 'Luiz Santanna', prazo_em: '2026-09-11T21:00:00.000Z', mentalidade: 'diretor', habito: 6, peso: 4, categoria: 'mentoria', status: 'recebida', created_at: '2026-09-07T08:30:00.000Z' },
      { id: 'd2', titulo: 'Cadastrar 5 influenciadores', pessoa_id: 'carla', pessoa_nome: 'Carla Souza', origem: 'diretor', criado_por_id: 'jean', criado_por_nome: 'Jean Aranha', prazo_em: '2026-09-11T21:00:00.000Z', mentalidade: 'executivo', habito: 3, peso: 3, categoria: 'mentoria', status: 'agendada', agendada_para: '2026-09-08', hora: '10:00', tarefa_id: 'tc1', created_at: '2026-09-07T08:40:00.000Z' },
    ],
  },
};
window.__bancoFalso.tabelas.metodo_tarefas.push({ id: 'tc1', user_id: 'carla', data: '2026-09-08', hora: '10:00', titulo: 'Cadastrar 5 influenciadores', peso: 3, categoria: 'mentoria', feito: true, conferido: true, demanda_id: 'd2' });

const DONO = { id: 'dono', full_name: 'Luiz Santanna', email: 'luiz@x.com', role: 'super_admin', career_levels: ['ceo'] };
const EMANUEL = { id: 'emanuel', full_name: 'Emanuel Silva', email: 'emanuel@x.com', role: 'user', career_levels: ['executivo_conta'] };
const comoEmanuel = window.location.hash === '#emanuel';
const quem = comoEmanuel ? EMANUEL : DONO;

createRoot(document.getElementById('raiz')).render(
  <div className="xeos-palco min-h-screen p-3 sm:p-6 space-y-6" style={{ background: 'var(--xeos-preto, #00020C)' }}>
    <Toaster position="top-center" />
    {!comoEmanuel && <EncontroMentalidade currentUser={quem} hojeISO={HOJE} podeConduzir />}
    <PerformanceEquipe currentUser={quem} hojeISO={HOJE} gestao={!comoEmanuel} />
  </div>,
);
