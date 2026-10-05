/**
 * Banca de DUAS SALAS DO MESMO LEILÃO, lado a lado — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (01/10/2026)
 * O "VENDIDO!" do leiloeiro não aparecia para todo mundo que estava na sala.
 * Aqui rodam duas salas REAIS (src/pages/AuctionRoom.jsx) do mesmo leilão, que
 * encerra segundos depois de abrir:
 *   • a sala A consegue falar com o servidor: o `finalizeAuction` dela responde
 *     e o servidor (de mentira) grava o fim e EMITE o evento de tempo real;
 *   • a sala B tem a rede ruim: o `finalizeAuction` dela fica pendurado 20 s,
 *     que é o caso do Luciano (26/09). Ela só fica sabendo pelo tempo real.
 * As duas têm que mostrar o VENDIDO, praticamente juntas.
 *
 * Cada sala vive num quadro com `transform`, que vira o "viewport" dela: o balão
 * do leiloeiro é `position: fixed` e, sem isto, os dois cairiam no mesmo canto.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import AuctionRoom from '@/pages/AuctionRoom';

const PARAMS = new URLSearchParams(location.search);
const SEGUNDOS_ATE_O_FIM = Number(PARAMS.get('fim') || 8);
// `encerrado=1`: o leilão já terminou (fim negativo) — a janela do F5
const JA_ENCERRADO = PARAMS.get('encerrado') === '1';
const ID = 'ps5-de-prova';
const agora = Date.now();

const LEILAO = {
  id: ID, title: 'PlayStation 5 Slim de prova', status: JA_ENCERRADO ? 'ended' : 'active',
  starting_price: 1000, current_price: 1250, increment: 10, buy_now_price: 0,
  end_time: new Date(agora + SEGUNDOS_ATE_O_FIM * 1000).toISOString(),
  start_time: new Date(agora - 600000).toISOString(),
  created_date: new Date(agora - 600000).toISOString(),
  image_urls: [], category: 'games', bid_count: 7,
  winner_id: JA_ENCERRADO ? 'u-ana' : null, winner_name: JA_ENCERRADO ? 'Ana Prova' : null,
  seller_name: 'Leilão NoZap', description: 'Lote de prova da banca.',
};
const MENSAGENS = [
  { id: 'm1', auction_id: ID, message_type: 'bid', sender_id: 'u-ana', sender_name: 'Ana Prova', bid_amount: 1250, content: 'R$ 1.250,00', created_date: new Date(agora - 30000).toISOString() },
];
window.__entidadesFalsas = { Auction: [LEILAO], AuctionMessage: MENSAGENS };
window.__bancoFalso = { tabelas: {}, escritas: [] };

// quem está na sala: um usuário logado comum (como a maioria)
localStorage.setItem('currentUser', JSON.stringify({ id: 'u-bruno', full_name: 'Bruno Prova', email: 'b@prova.com', role: 'user' }));
sessionStorage.setItem('isLoggedIn', '1');

// o servidor de mentira
let encerramentos = 0;
window.__prova = { encerramentos: [] };
window.__plataformaFalsa.respostas = {
  getServerTime: () => ({ timestamp: Date.now() }),
  getDigitalWalletBalance: { balance: 5000, held_balance: 0 },
  finalizeAuction: async () => {
    encerramentos += 1;
    const vez = encerramentos;
    window.__prova.encerramentos.push({ vez, em: Date.now() });
    if (vez > 1) {
      // 🌧️ rede ruim: a resposta nunca chega a tempo (o caso do Luciano)
      await new Promise((ok) => setTimeout(ok, 20000));
      return { success: false, error: 'Load failed' };
    }
    // o servidor grava o fim e avisa todo mundo (tempo real)
    Object.assign(LEILAO, { status: 'ended', winner_id: 'u-ana', winner_name: 'Ana Prova', order_status: 'awaiting_payment' });
    const vitoria = { id: 'm-vitoria', auction_id: ID, message_type: 'victory', sender_id: 'sistema', sender_name: 'Leiloeiro', content: '🏆 Ana Prova arrematou por R$ 1.250,00', created_date: new Date().toISOString() };
    MENSAGENS.unshift(vitoria);
    setTimeout(() => {
      window.__realtimeFalso.emitir('Auction', { eventType: 'UPDATE', new: { ...LEILAO }, old: { id: ID } });
      window.__realtimeFalso.emitir('AuctionMessage', { eventType: 'INSERT', new: vitoria, old: {} });
    }, 150);
    return { success: true, result: { status: 'ended', winner_id: 'u-ana', winner_name: 'Ana Prova', final_price: 1250, order_status: 'awaiting_payment' } };
  },
};

function Quadro({ nome, rotulo }) {
  return (
    <div data-pane={nome} style={{ position: 'relative', width: 640, height: 940, overflow: 'hidden', transform: 'translateZ(0)', background: '#111827', border: '2px solid #1f2937', borderRadius: 12 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 99999, background: nome === 'A' ? '#1B7A48' : '#9a3412', color: '#fff', font: '700 13px/1.2 system-ui', padding: '6px 10px', textAlign: 'center' }}>{rotulo}</div>
      <div style={{ position: 'absolute', inset: 0, paddingTop: 28 }}>
        <MemoryRouter initialEntries={[`/AuctionRoom?id=${ID}`]}>
          <AuctionRoom />
        </MemoryRouter>
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(
  <div style={{ display: 'flex', gap: 16, padding: 16, justifyContent: 'center' }}>
    <Quadro nome="A" rotulo="SALA A — rede boa: a chamada de encerramento dela responde" />
    <Quadro nome="B" rotulo="SALA B — rede ruim: a chamada dela fica pendurada 20 s" />
  </div>,
);
