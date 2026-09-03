/**
 * Banca do relógio de leilão — NÃO vai para o bundle da loja.
 *
 * 🔴 POR QUE ISTO EXISTE (03/09/2026)
 * "Semana passada dizia 1 semana, e agora segue 1 semana."
 *
 * A Fase 1 acrescenta a DATA de término nas telas. Os riscos que o levantamento
 * apontou e que só um navegador de verdade mede:
 *   • `end_time` nulo virando "31/12 às 21:00" (a Época de 1970 em Brasília) —
 *     não parece erro, PARECE INFORMAÇÃO;
 *   • a data estourando a largura do cabeçalho num celular estreito;
 *   • o contador que já existia sumindo (a Fase 1 é ADITIVA: nada sai).
 *
 * Monta os COMPONENTES REAIS, sem banco e sem rede.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import HeaderPrecoTempo from '@/components/auction/HeaderPrecoTempo';
import FixedAuctionPanel from '@/components/auction/FixedAuctionPanel';
import CountdownTimer from '@/components/common/CountdownTimer';

// O caso real do chamado: CAIXA DE SOM MONDIAL, fim 11/09 12:28 (Brasília).
const MONDIAL = '2026-09-11T15:28:00+00:00';

const CASOS = [
  { id: 'normal', endTime: MONDIAL },
  { id: 'nulo', endTime: null },
  { id: 'indefinido', endTime: undefined },
  { id: 'lixo', endTime: 'amanhã' },
  { id: 'zero', endTime: 0 },
  { id: 'outro-ano', endTime: '2027-01-04T15:42:00+00:00' },
];

function Banca() {
  return (
    <MemoryRouter>
      {CASOS.map((c) => (
        <section key={c.id} data-caso={c.id} style={{ marginBottom: 24 }}>
          <div data-parte="cabecalho" style={{ background: '#0b1220', padding: 8 }}>
            <HeaderPrecoTempo
              currentPrice={117}
              displayTime="1 semana"
              endTime={c.endTime}
              isAuctionActive
              isWarMode={false}
              onInfo={() => {}}
              leaderName="Alexandre walenkamp"
            />
          </div>
          <div data-parte="contador" style={{ background: '#0b1220', color: '#fff', padding: 4 }}>
            <CountdownTimer endTime={c.endTime} />
          </div>
        </section>
      ))}
      {/* a barra fixa só existe uma vez na tela; testada com o caso real */}
      <div data-parte="barra-fixa">
        <FixedAuctionPanel auction={{ id: 'x1', current_price: 117, end_time: MONDIAL }} />
      </div>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
