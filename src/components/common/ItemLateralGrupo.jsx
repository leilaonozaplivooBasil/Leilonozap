import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Draggable } from '@hello-pangea/dnd';
import { Store } from 'lucide-react';

// 🧭 Ícone único da lateral que agrupa vários links de operação (Meu Painel,
// PDV, Estoque, Metas) num menu flutuante — reduz a lista sem remover nenhum
// destino: é só navegação, nenhuma rota/lógica muda.
export default function ItemLateralGrupo({ item, indice, separador }) {
  const location = useLocation();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef(null);

  const ativo = item.subItens.some((s) => location.pathname.toLowerCase() === (s.to || '').toLowerCase());

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, [aberto]);

  return (
    <Draggable draggableId={item.chave} index={indice}>
      {(provided, snapshot) => (
        <div
          ref={(node) => { provided.innerRef(node); containerRef.current = node; }}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`relative ${separador ? 'mt-3 pt-3 border-t border-white/10' : ''}`}
          style={provided.draggableProps.style}
        >
          <button
            type="button"
            title={item.label}
            onClick={() => setAberto((v) => !v)}
            className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center transition-colors ${
              snapshot.isDragging
                ? 'bg-white/20 text-nz-verde-claro shadow-lg'
                : ativo || aberto
                ? 'bg-white/10 text-nz-verde-claro'
                : 'text-white/70 hover:bg-white/10 hover:text-nz-verde-claro'
            }`}
          >
            <Store className="w-5 h-5" />
            <span className="text-[9px] font-medium leading-tight">{item.label}</span>
          </button>

          {aberto && (
            <div className="absolute left-full top-0 z-50 ml-2 w-48 rounded-xl border border-white/10 bg-nz-preto-barra shadow-2xl py-2">
              {item.subItens.map((sub) => {
                const Icone = sub.icon;
                return (
                  <Link
                    key={sub.to}
                    to={sub.to}
                    onClick={() => setAberto(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-nz-verde-claro transition-colors"
                  >
                    {Icone && <Icone className="w-4 h-4 shrink-0" />}
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}