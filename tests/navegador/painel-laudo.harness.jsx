/**
 * Banca do PAINEL SÓ-LAUDO — NÃO vai para o bundle do app.
 *
 * A permissão (quem vê tudo × quem vê só o próprio dia) tem provas no Node.
 * Isto aqui mede o que só a tela responde: pra quem tem escopo 'proprio'
 * (Emannuel) o seletor de pessoa NÃO existe — é um rótulo travado nele —, o
 * laudo do dia aparece e o botão do PDF está lá; pra quem vê tudo, o menu
 * de pessoas continua.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import PainelLaudo from '@/components/licensing/CentralVendas/PainelLaudo';

const HOJE = '2026-09-24';
const EMANNUEL = { id: '2b7c054de6c3ae61deea8d74', full_name: 'Emannuel Alves de Lima', role: 'user', career_levels: ['diretoria_operacao'], primary_career_level: 'diretoria_operacao' };
const DONO = { id: 'dono1', full_name: 'Basil', role: 'super_admin' };
const OUTRA = { id: 'u2', full_name: 'Outra Pessoa', nickname: 'Outra', role: 'user', career_levels: ['diretoria_operacao'], primary_career_level: 'diretoria_operacao' };

const ritualParcial = {
  tipo: 'ritual', status: 'ritual_parcial', valido: false, tentativas: 4, quando: '2026-09-24T07:37:16.048Z', aberto_em: '2026-09-24T07:34:05.362Z', tempo_tela_s: 194,
  blocos: {
    acordei: { quando: '2026-09-24T07:34:28.975Z', ao_vivo: true, veredito_ia: { veredito: 'aprovada', confianca: 85, motivo: 'pessoa real, de olhos abertos e desperta' } },
    gratidao: { texto: 'Só agradecer por ter acordado', quando: '2026-09-24T07:34:41.338Z', entrada: 'texto' },
    visualizacao: { quando: '2026-09-24T07:37:11.866Z', video_seg: 125, veredito_ia: { veredito: 'reprovada', confianca: 78, motivo: 'a prova precisa mostrar você JÁ fora da cama e desperto' } },
  },
  pendencias: [{ bloco: 'visualizacao', o_que: 'Visualização: a prova precisa mostrar você JÁ fora da cama e desperto' }],
  veredito_ia: { veredito: 'aprovada', confianca: 100, motivo: '' },
  fechamento_automatico: { quando: '2026-09-24T07:37:11.992Z' },
};
const fotoAprovada = { tipo: 'foto', status: 'aprovada_ia', valido: true, tentativas: 1, quando: '2026-09-24T09:46:24.038Z', veredito_ia: { veredito: 'aprovada', confianca: 85, motivo: 'de tênis e short, em pé, no momento da atividade' } };

window.__bancoFalso = {
  tabelas: {
    app_users: [EMANNUEL, DONO, OUTRA],
    metodo_tarefas: [
      { id: 't1', user_id: EMANNUEL.id, data: HOJE, hora: '05:00', titulo: 'Acordar — gratidão e foco no sonho', feito: false, comprovacao: ritualParcial },
      { id: 't2', user_id: EMANNUEL.id, data: HOJE, hora: '06:15', titulo: 'Início da corrida / atividade física + registro DURANTE', feito: true, comprovacao: fotoAprovada },
      // de OUTRA pessoa — não pode aparecer no laudo do Emannuel
      { id: 't3', user_id: OUTRA.id, data: HOJE, hora: '05:00', titulo: 'Acordar de outra pessoa', feito: true, comprovacao: fotoAprovada },
    ],
  },
  escritas: [],
};

createRoot(document.getElementById('raiz')).render(
  <div style={{ padding: 16, background: '#0A1410', minHeight: '100vh' }} className="space-y-4">
    <div data-teste="banca-proprio"><PainelLaudo currentUser={EMANNUEL} hojeISO={HOJE} /></div>
    <div data-teste="banca-todos"><PainelLaudo currentUser={DONO} hojeISO={HOJE} /></div>
    {/* quem não pode nada: o painel tem que sumir */}
    <div data-teste="banca-ninguem"><PainelLaudo currentUser={OUTRA} hojeISO={HOJE} /></div>
  </div>,
);
