import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import XGameVisaoExecutiva from '@/components/licensing/CentralVendas/XGameVisaoExecutiva';

// 🖼️ DIR-115 (09/09/2026) — banca visual do pódio com foto real + anel de
// liga ("a moeda"), dono: "botar a imagem da pessoa ali, e a imagem dentro
// da moeda que ele está... pode mais foda mesmo, entendeu?" Semeia o banco
// de mentira (falso/supabaseClient.js) com 5 pessoas — 3 delas com foto
// (uma delas justamente SEM foto, pra provar que o fallback de iniciais
// continua funcionando junto do anel de liga).
const FOTO = (cor) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='${cor}'/><circle cx='100' cy='78' r='34' fill='#00000030'/><ellipse cx='100' cy='168' rx='58' ry='46' fill='#00000030'/></svg>`)}`;

const INICIO_CICLO = '2026-09-01'; // dentro do ciclo de 22 dias úteis a partir de hoje (data real do sistema)

function diaDiario(userId, data, { total = 5, feitas = 5, mvmAuto = 8, xpayGanho = 60 } = {}) {
  return {
    id: `${userId}-${data}`, user_id: userId, data, ciclo_inicio: INICIO_CICLO,
    tarefas_total: total, tarefas_feitas: feitas, token_dia: mvmAuto, pontos: feitas * 10,
    detalhes: { xpay_ganho: xpayGanho, xpay_perdido: 0, reunioes_total: 2, reunioes_feitas: 2 },
  };
}

window.__bancoFalso = {
  tabelas: {
    xgame_config: [{ id: 'atual', ciclo_inicio: INICIO_CICLO }],
    // 🔢 10/09/2026 — auditoria noturna: "o time" agora é só ativo+votável
    // (participantesVotaveis) — sem `ativo: true` aqui, a Visão Executiva
    // não desenha ninguém no pódio (a mesma régua correta, mas o mock
    // ficaria vazio).
    xgame_participantes: [
      { user_id: 'u1', perfil: 'comercial', ativo: true },
      { user_id: 'u2', perfil: 'estrategico', ativo: true },
      { user_id: 'u3', perfil: 'estrategico', ativo: true },
      { user_id: 'u4', perfil: 'operacional', ativo: true },
      { user_id: 'u5', perfil: 'comercial', ativo: true },
    ],
    xgame_diario: [
      diaDiario('u1', INICIO_CICLO, { xpayGanho: 210 }),
      diaDiario('u2', INICIO_CICLO, { xpayGanho: 140 }),
      diaDiario('u3', INICIO_CICLO, { xpayGanho: 90 }),
      diaDiario('u4', INICIO_CICLO, { xpayGanho: 60, feitas: 3 }),
      diaDiario('u5', INICIO_CICLO, { xpayGanho: 20, feitas: 1, total: 5 }),
    ],
    xgame_votos_mvm: [
      ...['a', 'b', 'c'].map((v, i) => ({ id: `v1${i}`, votante_id: `x${i}`, votado_id: 'u1', virtude: v, nota: 9.5, data: INICIO_CICLO })),
      ...['a', 'b', 'c'].map((v, i) => ({ id: `v2${i}`, votante_id: `x${i}`, votado_id: 'u2', virtude: v, nota: 8, data: INICIO_CICLO })),
      ...['a', 'b', 'c'].map((v, i) => ({ id: `v3${i}`, votante_id: `x${i}`, votado_id: 'u3', virtude: v, nota: 7, data: INICIO_CICLO })),
    ],
  },
  escritas: [],
};

// só o app_users precisa ser consultado por `.in('id', ids)` — a mesma
// tabela de mentira serve, só semeada por fora do formato "xgame_*"
window.__bancoFalso.tabelas.app_users = [
  { id: 'u1', full_name: 'Luciano Pinheiro', nickname: 'Luciano', avatar_url: FOTO('#2563EB') },
  { id: 'u2', full_name: 'Carla Souza', nickname: 'Carla', avatar_url: FOTO('#DB2777') },
  { id: 'u3', full_name: 'Emanuel Silva', nickname: 'Emanuel', avatar_url: null }, // sem foto — prova o fallback de iniciais
  { id: 'u4', full_name: 'João Pedro', nickname: 'João', avatar_url: FOTO('#059669') },
  { id: 'u5', full_name: 'Ana Beatriz', nickname: 'Ana', avatar_url: FOTO('#D97706') },
];

try { localStorage.setItem('currentUser', JSON.stringify({ id: 'u2', full_name: 'Carla Souza' })); } catch { /* sem storage, sem drama */ }

function Palco() {
  return (
    <div style={{ background: '#05060c', padding: 24, minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <XGameVisaoExecutiva />
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Palco />);
