/**
 * Banca do RELATÓRIO DE LEILÃO — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (23/09/2026)
 * A conta e o PDF já têm prova em Node. O que Node NÃO prova é o caminho que
 * o usuário percorre: a tela monta, a ressalva aparece junto do número, e o
 * botão PDF produz um arquivo DE VERDADE no navegador.
 *
 * Esse último ponto não é detalhe: a primeira versão importava o jspdf como
 * `import jsPDF from 'jspdf'` (default). Fora do Vite isso não é uma classe —
 * é o objeto do módulo. Só o navegador com o bundle real mostra se o caminho
 * inteiro fecha.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import '@/index.css';
import RelatorioDoLeilao from '@/components/licensing/CentralVendas/RelatorioDoLeilao';
import { relatorioDoLeilao } from '@/lib/relatorioDoLeilao';

const ABRIU = '2026-09-14T12:00:00.000Z';
const FECHOU = '2026-09-20T23:00:00.000Z';

const leilao = {
  id: 'a1', title: 'Playstation 5 Slim — Ângela & Cia', status: 'ended',
  created_date: ABRIU, end_time: FECHOU,
  starting_price: 1, current_price: 3200, frete_reservado_valor: 120,
  winner_id: 'u2', winner_name: 'Ângela Conceição',
};
const nomes = { u1: 'José Antônio da Conceição', u2: 'Ângela Conceição' };
const lances = [
  { sender_id: 'u1', bid_amount: 100, created_date: ABRIU },
  { sender_id: 'u2', bid_amount: 200, created_date: ABRIU },
  { sender_id: 'u2', bid_amount: 300, created_date: ABRIU },
];
const depositos = [
  { id: 'd1', buyer_id: 'u1', status: 'paid', total_amount: 500, payment_method: 'pix', created_date: ABRIU },
  { id: 'd2', buyer_id: 'u2', status: 'paid', total_amount: 700, payment_method: 'credit_card', created_date: ABRIU },
  { id: 'd3', buyer_id: 'u1', status: 'pending', total_amount: 900, payment_method: 'pix', created_date: ABRIU },
];
const reservas = [{ user_id: 'u2', direcao: 'entrada_reserva', valor: 3200, created_at: ABRIU }];

const pronto = relatorioDoLeilao({ leilao, lances, depositos, reservas, nomes, agora: new Date(FECHOU) });

// o servidor de mentira: a tela só desenha o que a rota devolve
window.__plataformaFalsa.respostas = {
  relatorioDoLeilao: (corpo) => (corpo?.acao === 'listar'
    ? { success: true, leiloes: [{ id: 'a1', title: leilao.title, status: 'ended', end_time: FECHOU }] }
    : { success: true, relatorio: pronto }),
};

createRoot(document.getElementById('raiz')).render(
  <div style={{ background: '#fff', minHeight: '100vh', padding: 16 }}>
    <RelatorioDoLeilao currentUser={{ id: 'chefe', role: 'super_admin' }} />
    <Toaster />
  </div>
);
