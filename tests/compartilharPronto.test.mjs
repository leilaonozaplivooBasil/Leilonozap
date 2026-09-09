// 📲 09/09/2026 — dono: "tinha um botão WhatsApp aqui, eu acho que a gente
// tirou... só um texto mesmo, mas um texto bem bonito... quero botar isso
// aqui no WhatsApp pra compartilhar também." O botão volta na Fila do
// Pronto, no estado "aguardando" (o lembrete gentil, ANTES de atrasar —
// diferente do "avisar", que é a cobrança da tarefa já atrasada).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ARQ = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/XPerformanceGestao.jsx', import.meta.url), 'utf8');

test('XPerformanceGestao.jsx: importa textoCompartilharPronto de lib/pronto', () => {
  assert.match(ARQ, /import \{ prazoDe, rotuloDoPrazo, filaDoPronto, carimboDaDevolucao, textoCompartilharPronto \} from '@\/lib\/pronto';/);
});

test('XPerformanceGestao.jsx: compartilhar() usa o telefone da pessoa e abre o WhatsApp com o texto pronto', () => {
  const inicio = ARQ.indexOf('const compartilhar = (t) =>');
  const fim = ARQ.indexOf('\n  };', inicio);
  const corpo = ARQ.slice(inicio, fim);
  assert.match(corpo, /textoCompartilharPronto\(t, nome\)/);
  assert.match(corpo, /https:\/\/wa\.me\//);
  assert.match(corpo, /window\.open\(wa, '_blank', 'noopener'\)/);
});

test('XPerformanceGestao.jsx: o botão "compartilhar" aparece nas tarefas aguardando o pronto', () => {
  assert.match(ARQ, /\{estado\.id === 'aguardando' && \(/);
  assert.match(ARQ, /onClick=\{\(\) => compartilhar\(t\)\}/);
  assert.match(ARQ, /data-teste="compartilhar-pronto"/);
});
