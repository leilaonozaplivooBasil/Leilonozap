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

// 🌱 a semente ("abrir no mapa", vinda da aba Demandas). A prova escolhe o
// texto em window.__semente ANTES de carregar; o componente só semeia depois
// que o mapa chega, que é justamente o que há para medir.
function Banca() {
  const [semente, setSemente] = React.useState(
    typeof window !== 'undefined' ? (window.__semente || null) : null,
  );
  // a prova manda outra semente sem recarregar a página: recarregar aqui
  // perderia o mapa (a banca não guarda nada), e a prova de "não duplica"
  // passaria sem medir nada.
  React.useEffect(() => { window.__semeados = []; window.__semear = setSemente; }, []);
  return (
    <MapaMental
      onDemandaCriada={(n) => window.__salvos.push(n)}
      semente={semente}
      onSemeado={(id) => { (window.__semeados ||= []).push(id); setSemente(null); }}
    />
  );
}

createRoot(document.getElementById('raiz')).render(
  <div style={{ padding: 16, background: '#0A1410', minHeight: '100vh' }}>
    <Banca />
  </div>,
);
