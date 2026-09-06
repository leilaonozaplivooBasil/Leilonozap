/**
 * Banca do FUNIL do CRM — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (06/09/2026)
 * Dono: "não está funcionando no móvel" (mover card entre etapas do funil) e,
 * logo depois, a pergunta que este arquivo responde: "não vai quebrar o que
 * está funcionando no computador, não né?".
 *
 * Só o navegador mede isso. O arrastar do HTML5 e os eventos de toque não
 * existem em teste de nó: nenhum assert em JavaScript puro consegue afirmar
 * que soltar um card numa coluna funciona no mouse E que dois toques funcionam
 * no dedo. Aqui roda o CrmFunilKanban DE VERDADE, com dados reais de cliente
 * manual e automático, e a banca guarda a última mudança pedida.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import CrmFunilKanban from '@/components/licensing/CentralVendas/CrmFunilKanban';

// dois manuais (movem na mão) e um automático (status vem do pedido real)
const CLIENTES = [
  { id: 'm1', full_name: 'Ana Manual', purchase_status: 'sem_compra', origin_type: 'manual', total_spent: 0 },
  { id: 'm2', full_name: 'Bruno Manual', purchase_status: 'em_negociacao', origin_type: 'manual', total_spent: 250 },
  { id: 'a1', full_name: 'Carla Pedido', purchase_status: 'pago', origin_type: 'pedido', total_spent: 900 },
];

function Banca() {
  const [movido, setMovido] = React.useState(null);
  const [aberto, setAberto] = React.useState(null);
  return (
    <div style={{ padding: 16, background: '#fff', minHeight: '100vh' }}>
      <CrmFunilKanban
        customers={CLIENTES}
        onAbrirCliente={(c) => setAberto(c.id)}
        onMoverManual={(c, destino) => setMovido({ id: c.id, destino })}
      />
      <span data-teste="movido">{movido ? JSON.stringify(movido) : ''}</span>
      <span data-teste="aberto">{aberto || ''}</span>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
