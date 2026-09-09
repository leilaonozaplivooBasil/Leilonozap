/**
 * Banca do GUIA (Como Funciona) — NÃO vai para o bundle do app.
 *
 * 🪙 09/09/2026 — dono: "a moeda tem que aparecer aqui, como modelo, pra
 * explicar o modelo, pra ensinar as pessoas — ela tem que ter algum lugar,
 * cadê ela?" Esta página monta o COMPONENTE REAL (GuiaXGame.jsx) pra provar,
 * com print de verdade, que a moeda-modelo mora agora dentro da lição
 * "Entender sua pontuação" — não só num teste solto.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import GuiaXGame from '@/components/licensing/CentralVendas/GuiaXGame';

const USUARIO = { id: 'u1', full_name: 'Luiz Santanna', email: 'luiz@x.com', role: 'admin', career_levels: ['usuario'] };

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>
    <GuiaXGame currentUser={USUARIO} />
  </MemoryRouter>,
);
