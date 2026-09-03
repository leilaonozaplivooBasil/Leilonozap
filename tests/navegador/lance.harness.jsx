/**
 * Banca do histórico de lances — NÃO vai para o bundle da loja.
 *
 * 🔴 POR QUE ISTO EXISTE (03/09/2026)
 * "No histórico dos lances, tem lance feito 'há 57 anos'."
 *
 * O lance de R$ 1,60 do leilão "Copo Dosador" tinha `created_date` e
 * `timestamp` nulos. A tela fazia `new Date(null)` e caía na Época do Unix:
 * "há 57 anos" na lista e "21:00" na bolha (31/12/1969 21:00 em Brasília).
 *
 * E o nulo furava a fila: `ORDER BY created_date DESC` põe NULL primeiro no
 * Postgres, então o lance MAIS ANTIGO aparecia como o mais recente.
 *
 * Monta os COMPONENTES REAIS com os valores exatos do banco.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import FeedUltimosLances from '@/components/auction/FeedUltimosLances';
import PlacaLance from '@/components/chat/PlacaLance';

// Os quatro lances daquele leilão, com os valores exatos do banco.
const CULPADO = { id: 'm1', message_type: 'bid', bid_amount: 1.6, sender_name: 'vale-do-recreio', created_date: null, timestamp: null, created_at: '2026-08-04T06:00:23.339Z' };
const L360 = { id: 'm2', message_type: 'bid', bid_amount: 3.6, sender_name: 'vale-do-recreio', created_date: '2026-08-04T06:31:20.921Z', timestamp: '2026-08-04T06:31:20.921Z', created_at: '2026-08-04T06:31:20.999Z' };
const L560 = { id: 'm3', message_type: 'bid', bid_amount: 5.6, sender_name: 'vale-do-recreio', created_date: '2026-08-04T13:50:52.101Z', timestamp: '2026-08-04T13:50:52.101Z', created_at: '2026-08-04T13:50:52.192Z' };
const L960 = { id: 'm4', message_type: 'bid', bid_amount: 9.6, sender_name: 'vale-do-recreio', created_date: '2026-08-04T13:51:40.848Z', timestamp: '2026-08-04T13:51:40.848Z', created_at: '2026-08-04T13:51:41.187Z' };
// nem o `created_at` existe: aqui não pode sair hora nenhuma
const SEM_NADA = { id: 'm5', message_type: 'bid', bid_amount: 0.5, sender_name: 'ninguem', created_date: null, timestamp: null, created_at: null };

function Banca() {
  return (
    <div style={{ padding: 12 }}>
      {/* a ordem de ENTRADA é a que o banco devolvia: o nulo na frente */}
      <div data-parte="feed" style={{ maxWidth: 360 }}>
        <FeedUltimosLances messages={[CULPADO, L960, L560, L360]} />
      </div>

      <div data-parte="feed-sem-data-nenhuma" style={{ maxWidth: 360, marginTop: 16 }}>
        <FeedUltimosLances messages={[SEM_NADA, L960]} />
      </div>

      <div data-parte="placa-culpado" style={{ marginTop: 16 }}>
        <PlacaLance message={CULPADO} isOwn={false} />
      </div>
      <div data-parte="placa-normal">
        <PlacaLance message={L960} isOwn={false} />
      </div>
      <div data-parte="placa-sem-nada">
        <PlacaLance message={SEM_NADA} isOwn={false} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
