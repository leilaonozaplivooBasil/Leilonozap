import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import RadarEixos from '@/components/licensing/CentralVendas/RadarEixos';

// 🎡 DIR-112 (09/09/2026) — banca visual da roda da vida: prova em navegador
// real que a curva fecha em círculo quando os 5 eixos estão quase 10, e que
// os rótulos (Produção/Real Time, os mais compridos) não clipam nas pontas
// — o mesmo bug que a v1 (pentágono) já tinha tido uma vez.
const EIXOS_BASE = [
  { k: 'mvm', rotuloCurto: 'MvM', emoji: '🗳️', alvo: 100 },
  { k: 'producao', rotuloCurto: 'Produção', emoji: '📋', alvo: 100 },
  { k: 'realtime', rotuloCurto: 'Real Time', emoji: '⏱️', alvo: 100 },
  { k: 'bonus', rotuloCurto: 'Bônus', emoji: '📚', alvo: 100 },
  { k: 'vendas', rotuloCurto: 'Vendas', emoji: '🛒', alvo: 100 },
];
const comAtual = (valores) => EIXOS_BASE.map((e, i) => ({ ...e, atual: valores[i] }));

function Showcase() {
  return (
    <div style={{ background: '#ffffff', padding: 24, fontFamily: 'sans-serif', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      <section data-teste="roda-cheia">
        <h2>Quase 10 em tudo — a roda gira</h2>
        <RadarEixos eixos={comAtual([97, 94, 98, 95, 100])} dialeto="claro" />
      </section>
      <section data-teste="roda-torta">
        <h2>Um eixo fraco (Vendas) — a roda torta</h2>
        <RadarEixos eixos={comAtual([90, 95, 88, 92, 20])} dialeto="claro" />
      </section>
      <section data-teste="roda-murcha">
        <h2>Tudo baixo — a roda murcha</h2>
        <RadarEixos eixos={comAtual([20, 15, 25, 10, 5])} dialeto="claro" />
      </section>
      <section data-teste="roda-escura" style={{ background: '#0b0b12', padding: 16, borderRadius: 12 }}>
        <h2 style={{ color: '#fff' }}>Diálogo escuro (X-Game)</h2>
        <RadarEixos eixos={comAtual([97, 94, 98, 95, 100])} dialeto="escuro" />
      </section>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Showcase />);
