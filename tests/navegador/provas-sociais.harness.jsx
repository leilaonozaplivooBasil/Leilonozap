/**
 * Banca das PROVAS SOCIAIS da vitrine — NÃO vai para o bundle do app.
 *
 * As regras têm provas no Node (tests/provasSociais.test.mjs). Isto mede o
 * que só a tela responde: o ticker desenha o lance mais recente e TROCA
 * sozinho; o bloco de arrematados e o ranking saem das views; sem dado, nada
 * aparece (a banca semeia as views falsas antes de renderizar).
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import LiquidGlassStyles from '@/components/home/LiquidGlassStyles';
import LancesAoVivo from '@/components/home/LancesAoVivo';
import ProvasSociais from '@/components/home/ProvasSociais';

const vazio = new URLSearchParams(window.location.search).get('vazio') === '1';
const agora = Date.now();
const ha = (min) => new Date(agora - min * 60e3).toISOString();

window.__bancoFalso = {
  tabelas: vazio ? { vw_lances_publicos: [], vw_arremates_publicos: [], vw_ranking_arrematadores: [] } : {
    vw_lances_publicos: [
      { id: 'l1', auction_id: 'a-harley', titulo: 'Harley 117 - Scooter Elétrico SEM CNH', participante: 'Ângela M.', valor: 477.6, quando: ha(3) },
      { id: 'l2', auction_id: 'a-ps5', titulo: 'Playstation 5', participante: 'Virgilio O.', valor: 797, quando: ha(95) },
      { id: 'l3', auction_id: 'a-ps5', titulo: 'Playstation 5', participante: 'Ângela M.', valor: 497, quando: ha(60 * 30) },
    ],
    vw_arremates_publicos: [
      { id: 'w1', titulo: 'Kit Trilho Eletrificado Click 1m', arrematante: 'Ângela M.', quando: ha(7 * 60), imagem: null },
      { id: 'w2', titulo: 'Serum Facial Hidratante', arrematante: 'Rosenberg O.', quando: ha(8 * 60), imagem: null },
    ],
    vw_ranking_arrematadores: [
      { id: 'r1', arrematante: 'Rosenberg O.', arremates: 16, ultimo: ha(60) },
      { id: 'r2', arrematante: 'Hercules R.', arremates: 2, ultimo: ha(3 * 24 * 60) },
      { id: 'r3', arrematante: 'Henrique S.', arremates: 2, ultimo: ha(6 * 24 * 60) },
    ],
  },
  escritas: [],
};

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter initialEntries={['/leiloes']}>
  <div style={{ background: '#0b1220', minHeight: '100vh', padding: '24px 0' }}>
    <LiquidGlassStyles />
    <LancesAoVivo />
    <div className="mx-4 rounded-2xl border border-dashed border-white/15 p-6 text-white/40 text-sm" data-teste="lista-falsa">aqui vem a lista de leilões</div>
    <ProvasSociais />
  </div>
  </MemoryRouter>,
);
