/**
 * Banca da CONFERÊNCIA DE PRODUTOS do pedido — NÃO vai para o bundle do app.
 *
 * 🖼️ 01/10/2026 — a operadora abriu um pedido de nove produtos e viu nove
 * ícones de caixa iguais: não conseguia identificar o que separar. Aqui roda o
 * checklist REAL com itens com foto, um sem foto (cai no ícone) e um com foto
 * quebrada (também cai no ícone, pelo onError).
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import OrderItemsChecklist from '@/components/catalog/OrderItemsChecklist';
import img1 from '@/assets/setores/aovivo.webp';
import img2 from '@/assets/setores/dinheiro.webp';
import img3 from '@/assets/setores/fabrica.webp';

const ITENS = [
  { id: 'p1', title: 'Antena Wi-fi Usb Ninivi Usb 2.0 Wireless 802.iin Para E Notebook', qty: 1, image: img1 },
  { id: 'p2', title: 'Luminária Plafon Teto Pendente Quadrado Sobrepor Luz Led 24w 110v/220v Branco', qty: 2, image: img2 },
  { id: 'p3', title: 'Refletor Holofote 200w Led Azul Piscina Decoração Cor Da Carcaça Preto 127/220v', qty: 1, image: img3 },
  { id: 'p4', title: 'kit c\\ 10 conectores', qty: 1, image: null },
  { id: 'p5', title: 'Esfregão Giratório 360 Lava Seca Torção Multiuso Limpeza Mop Azul', qty: 1, image: '/nao-existe.webp' },
];

function Banca() {
  const [marcados, setMarcados] = useState([1]);
  return (
    <div className="mx-auto max-w-md p-4 text-white" data-teste="banca">
      <OrderItemsChecklist
        items={ITENS}
        packedIndices={marcados}
        onToggle={(idx) => setMarcados((m) => (m.includes(idx) ? m.filter((i) => i !== idx) : [...m, idx]))}
      />
    </div>
  );
}
createRoot(document.getElementById('raiz')).render(<Banca />);
