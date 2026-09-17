/**
 * Banca do CARD DE LEILÃO DE VERDADE — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (17/09/2026)
 * O contador do card tem resolução de SEMANA: "1 semana" cobre de 7,00 a 13,99
 * dias e fica parado sete dias seguidos. Foi o que gerou o chamado da Caixa de
 * Som Mondial em 03/09 — e o que a Beatriz cobriu de novo agora, nos relógios.
 *
 * A régua `textoDeTermino` já existia e já estava na sala, nos detalhes e no
 * painel fixo. O card, que é a PRIMEIRA tela que quase todo mundo vê, tinha
 * ficado de fora. Ler o arquivo prova que a linha existe; só a tela prova que
 * ela aparece ao lado do "1 semana", e não no lugar dele.
 *
 * `?encerrado=1` repete um leilão já terminado — que NÃO pode mostrar a linha.
 * `?semdata=1` repete um leilão sem end_time — que também não pode.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import AuctionCard from '@/components/auction/AuctionCard';

window.__bancoFalso = { tabelas: {}, escritas: [] };
window.__entidadesFalsas = { Auction: [], AppUser: [] };

const params = new URLSearchParams(window.location.search);

// 12 dias à frente, fixo: cai na faixa em que o contador diz "1 semana"
const DOZE_DIAS = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();
const ONTEM = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const leilao = {
  id: 'banca-1',
  title: 'Playstation 5',
  description: 'Console de teste da banca',
  image_urls: ['data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'],
  starting_price: 497,
  current_price: 597,
  increment: 100,
  category: 'eletronicos',
  status: params.get('encerrado') === '1' ? 'ended' : 'active',
  end_time: params.get('semdata') === '1' ? null : (params.get('encerrado') === '1' ? ONTEM : DOZE_DIAS),
};

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>
    <div style={{ padding: 24, maxWidth: 420 }}>
      <AuctionCard auction={leilao} />
    </div>
  </MemoryRouter>
);
