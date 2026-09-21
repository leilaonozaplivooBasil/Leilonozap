/**
 * Banca do MAPA MENTAL — NÃO vai para o bundle do app.
 *
 * A árvore e as travas (ciclo, órfão) já têm 19 provas no Node. Isto aqui mede
 * o que só a tela responde: o nó nasce, o texto entra, o arrasto move o card
 * de verdade, e a linha entre pai e filho existe.
 *
 * O `meuMapaMental` é substituído por um de mentira: a banca não fala com
 * servidor, e o que interessa medir é o desenho.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import MapaMental from '@/components/licensing/CentralVendas/MapaMental';

window.__salvos = [];

// A plataforma de mentira da banca responde `{ success:false }` por padrão. Para
// o mapa isso é "sem mapa ainda", que é exatamente o primeiro uso: ele nasce
// com a raiz. `window.__respostas` deixa a prova escolher outra resposta.
window.__respostas = window.__respostas || {};

createRoot(document.getElementById('raiz')).render(
  <div style={{ padding: 16, background: '#0A1410', minHeight: '100vh' }}>
    <MapaMental onDemandaCriada={(n) => window.__salvos.push(n)} />
  </div>,
);
