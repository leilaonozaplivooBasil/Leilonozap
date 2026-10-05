/**
 * Banca do SINO DO CLIENTE — NÃO vai para o bundle do app. 28/09/2026.
 * As notificações passam pelos textos REAIS do servidor (notificacaoDaTela),
 * os mesmos que a gravação usa. A rota é a plataforma falsa.
 *   ?vazio=1 → sino sem nada
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import '@/index.css';
import SinoDoCliente from '@/components/nav/SinoDoCliente';
import { notificacaoDaTela } from '../../api/_lib/notificacoesNaTela.js';

const b64 = (o) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
localStorage.setItem('sessaoToken', `v1.${b64({ u: 'ana1', x: Date.now() + 86400000 })}.assinatura`);
const agora = Date.now();
const min = (m) => new Date(agora - m * 60000).toISOString();
const n = (id, tipo, dados, criada, lida = null) => ({ id, tipo, ...notificacaoDaTela(tipo, dados), criada_em: criada, lida_em: lida });
const vazio = new URLSearchParams(location.search).has('vazio');
const itens = vazio ? [] : [
  n(5, 'superado', { produto: 'Harley 117 - Scooter Elétrico SEM CNH', valorAtual: 577.6, leilaoId: 'harley' }, min(3)),
  n(4, 'compra_enviada', { pedido: 'LZ42C79347', rastreio: 'AD966744131BR' }, min(95)),
  n(3, 'arrematou', { produto: 'Secador de Cabelo Light Ceramic', valor: 24 }, min(60 * 26), min(60 * 20)),
  n(2, 'deposito', { valor: 50 }, min(60 * 24 * 3), min(60 * 24 * 3)),
];
// o "servidor" guarda o que foi marcado, como o de verdade; a listagem demora
// um pouco (como na rede), pra prova da corrida "consulta no ar × toque" valer
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
window.__plataformaFalsa.respostas.minhasNotificacoes = async (corpo) => {
  if (corpo?.acao === 'lidas') {
    for (const i of itens) if (!i.lida_em && (corpo.todas || corpo.ids?.includes(i.id))) i.lida_em = new Date().toISOString();
    return { success: true };
  }
  const foto = itens.map((i) => ({ ...i }));
  await espera(300);
  return { success: true, itens: foto, naoLidas: foto.filter((i) => !i.lida_em).length };
};

function Onde() { const l = useLocation(); return <p data-teste="rota" style={{ color: '#9ca3af', font: '12px monospace', padding: 16 }}>{l.pathname}{l.search}</p>; }
const tema = new URLSearchParams(location.search).has('claro');
createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>
    <div style={{ height: 64, background: tema ? '#fff' : 'rgba(33,34,43,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 16px' }}>
      <SinoDoCliente currentUser={{ id: 'ana1', email: 'ana@teste.com' }} temaClaro={tema} />
    </div>
    <Routes><Route path="*" element={<Onde />} /></Routes>
  </MemoryRouter>,
);
