/**
 * Banca da ÁRVORE DA REDE (TreeHierarchy, o componente VIVO) — NÃO vai para o
 * bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (06/09/2026)
 * Dono: "vamos fazer esse arrasta onde faltou, sem quebrar nada que esteja
 * funcionando". A investigação achou um NetworkTree com arrastar de HTML5
 * (só mouse) — mas ele era CÓDIGO MORTO: a página renderiza o TreeHierarchy,
 * que já usa Pointer Events. "Parece que funciona no dedo" não vale nada;
 * aqui o componente real recebe TOQUE real (CDP touchStart/Move/End) e a
 * banca guarda cada onRelink pedido.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import TreeHierarchy from '@/components/network/TreeHierarchy';

const PESSOAS = [
  { id: 'ana', full_name: 'Ana Raiz', email: 'ana@x.com', referred_by_id: null, career_levels: ['usuario'], primary_career_level: 'usuario', indicated_clients_count: 1, valora_pay_balance: 10 },
  { id: 'bruno', full_name: 'Bruno Raiz', email: 'bruno@x.com', referred_by_id: null, career_levels: ['usuario'], primary_career_level: 'usuario', indicated_clients_count: 0, valora_pay_balance: 0 },
  { id: 'carla', full_name: 'Carla Filha', email: 'carla@x.com', referred_by_id: 'ana', career_levels: ['usuario'], primary_career_level: 'usuario', indicated_clients_count: 0, valora_pay_balance: 5 },
];

function Banca() {
  const [relinks, setRelinks] = React.useState([]);
  return (
    <div style={{ height: '100vh', background: '#111827' }}>
      <TreeHierarchy
        users={PESSOAS}
        allUsers={PESSOAS}
        canEdit
        fullHeight
        onEdit={() => {}}
        onDelete={() => {}}
        onPromote={() => {}}
        onDetach={() => {}}
        onAtualizado={() => {}}
        onRelink={async (movedId, parentId, permitir) => {
          setRelinks((r) => [...r, { movedId, parentId: parentId ?? null, permitir: !!permitir }]);
        }}
      />
      <span data-teste="relinks">{JSON.stringify(relinks)}</span>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
