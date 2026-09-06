/**
 * Banca do useArrastavel — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (06/09/2026)
 * A pílula do X-Music virou arrastável e, no mesmo dia, PAROU DE ABRIR o
 * painel. A causa: o hook capturava o ponteiro no pointerdown, e com pointer
 * capture ativa o navegador entrega o `click` ao elemento que capturou (a
 * pílula), não ao botão embaixo do dedo. Só um navegador de verdade reproduz
 * isso — nenhum teste em nó sabe o que é pointer capture.
 *
 * Aqui o hook é montado sozinho, num "alvo" com um botão dentro, igual à
 * pílula: dá pra medir o clique, o arrasto, e o clique-fantasma pós-arrasto.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import useArrastavel, { dentroDaTela } from '@/hooks/useArrastavel';

function Banca() {
  const [pos, setPos] = React.useState({ x: 40, y: 40 });
  const [cliques, setCliques] = React.useState(0);
  const [soltou, setSoltou] = React.useState(0);
  const { arrastando, alcas, engolirCliqueDoArrasto } = useArrastavel({
    aoMover: ({ x, y }) => setPos(dentroDaTela(x - 60, y - 20, 120, 40)),
    aoSoltar: () => setSoltou((n) => n + 1),
  });
  return (
    <div onClickCapture={engolirCliqueDoArrasto} style={{ position: 'fixed', left: pos.x, top: pos.y }}>
      <div
        {...alcas}
        data-teste="alvo"
        style={{ ...alcas.style, width: 120, height: 40, background: arrastando ? '#fca5a5' : '#93c5fd', display: 'flex', alignItems: 'center' }}
      >
        <button type="button" data-teste="botao" onClick={() => setCliques((n) => n + 1)} style={{ margin: 4 }}>
          abrir
        </button>
      </div>
      <span data-teste="estado">{JSON.stringify({ cliques, soltou, x: pos.x, y: pos.y, arrastando })}</span>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
