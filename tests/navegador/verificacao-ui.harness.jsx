import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { BarraProgresso, BarraProgressoSegmentada, SeloConfianca, Semaforo } from '@/components/licensing/CentralVendas/VerificacaoUI';
import CrmDashboardDiretoria from '@/components/licensing/CentralVendas/CrmDashboardDiretoria';
import { ScoreEscada } from '@/components/licensing/CentralVendas/PainelOficial';
import CrmEsteiraResumoExecutivo from '@/components/licensing/CentralVendas/CrmEsteiraResumoExecutivo';

const oportunidadesEsteira = [
  { id: 'op1', estagio: 'fechado_100', valor_previsto: 12000, responsavel_nome: 'Ana' },
  { id: 'op2', estagio: 'reuniao_agendada', valor_previsto: 8000, responsavel_nome: 'Ana', reuniao_em: new Date().toISOString() },
  { id: 'op3', estagio: 'fechado_70', valor_previsto: 5000, responsavel_nome: 'Bia' },
];

const kpis = [
  { id: 'faturamento', label: 'Faturamento do dia', realizado: 8200, meta: 10000, unidade: 'brl', tipo: 'dado', fonte: 'Vendas pagas do dia' },
  { id: 'ticket', label: 'Ticket médio', realizado: 340, meta: 300, unidade: 'brl', tipo: 'aproximacao', fonte: 'Faturamento ÷ vendas (fórmula-proxy)' },
  { id: 'nps', label: 'NPS', realizado: null, meta: 80, unidade: 'pct', tipo: 'sem_fonte', fonte: 'Ainda não medido no sistema' },
];

function Showcase() {
  return (
    <div style={{ background: '#ffffff', padding: 24, fontFamily: 'sans-serif' }}>
      <section data-teste="showcase-claro" style={{ marginBottom: 24 }}>
        <h2>Barra — claro</h2>
        <div style={{ width: 240, marginBottom: 8 }}><BarraProgresso pct={65} dialeto="claro" altura="media" /></div>
        <div style={{ width: 240, marginBottom: 8 }}><BarraProgresso pct={40} dialeto="claro" altura="fina" corClasse="bg-amber-400" /></div>
        <div style={{ width: 240, marginBottom: 8 }}><BarraProgresso pct={0} dialeto="claro" semDado /></div>
        <div style={{ width: 240, marginBottom: 8 }}>
          <BarraProgressoSegmentada dialeto="claro" altura="grossa" segmentos={[{ pct: 30, corClasse: 'bg-nz-verde' }, { pct: 20, corClasse: 'bg-amber-400' }, { pct: 15, corClasse: 'bg-nz-tinta-fraca/30' }]} />
        </div>
        <SeloConfianca tipo="dado" dialeto="claro" /> <SeloConfianca tipo="aproximacao" dialeto="claro" /> <SeloConfianca tipo="sem_fonte" dialeto="claro" />
        <div style={{ marginTop: 8 }}>
          <Semaforo cor="verde" /> <Semaforo cor="amarelo" /> <Semaforo cor="vermelho" tamanho="grande" />
        </div>
      </section>

      <section data-teste="showcase-kpis" style={{ marginBottom: 24 }}>
        <CrmDashboardDiretoria kpis={kpis} />
      </section>

      <section data-teste="showcase-escada" style={{ background: '#05070F', padding: 16 }}>
        <ScoreEscada fracoes={{ resultado: 0.8, entregaveis: 0.6, equipe: 0.5, cultura: null, organizacao: 0.9 }} niveis={[]} portoesAbertos={2} emFormacao={false} />
      </section>

      <section data-teste="showcase-esteira" style={{ marginTop: 24 }}>
        <CrmEsteiraResumoExecutivo oportunidades={oportunidadesEsteira} sales={[]} visaoTotal onVerEsteira={() => {}} />
      </section>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Showcase />);
