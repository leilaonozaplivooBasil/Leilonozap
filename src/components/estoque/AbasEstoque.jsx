import React from 'react';
import { Boxes, ShoppingBag, Handshake } from 'lucide-react';

// Abas da tela única de estoque. Roláveis no mobile e com alvo de toque de 44px.
const ABAS = [
  { id: 'meu', label: 'Meu estoque', Icon: Boxes },
  { id: 'comprar', label: 'Comprar', Icon: ShoppingBag },
  { id: 'consignado', label: 'Consignado', Icon: Handshake },
];

export default function AbasEstoque({ aba, onAba }) {
  return (
    <div className="flex gap-2 overflow-x-auto nz-no-scrollbar -mx-1 px-1">
      {ABAS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onAba(id)}
          className={`min-h-[44px] px-4 rounded-lg text-sm font-semibold whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${
            aba === id ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Icon className="w-4 h-4" /> {label}
        </button>
      ))}
    </div>
  );
}