import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Draggable } from '@hello-pangea/dnd';
import { Store } from 'lucide-react';

// 🧭 Ícone único da lateral que agrupa vários links de operação (Meu Painel,
// PDV, Estoque, Metas) num menu flutuante — reduz a lista sem remover nenhum
// destino: é só navegação, nenhuma rota/lógica muda.
//
// 🩹 O menu é renderizado num portal (document.body) com posição FIXA calculada
// a partir do botão: a lateral tem overflow-y-auto (rola verticalmente), e isso
// corta automaticamente qualquer coisa que passe pra fora na horizontal — um
// menu "position: absolute" dentro dela simplesmente não aparecia (parecia
// "sem link"). Fora do contêiner, o corte não existe mais.
export default function ItemLateralGrupo({ item, indice, separador }) {
  const location = useLocation();
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState(null);
  const botaoRef = useRef(null);

  const ativo = item.subItens.some((s) => location.pathname.toLowerCase() === (s.to || '').toLowerCase());

  const abrir = () => {
    const rect = botaoRef.current?.getBoundingClientRect();
    if (rect) setPosicao({ top: rect.top, left: rect.right + 8 });
    setAberto((v) => !v);
  };

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (botaoRef.current && !botaoRef.current.contains(e.target) && !e.target.closest('[data-menu-operacao]')) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, [aberto]);

  return (
    <Draggable draggableId={item.chave} index={indice}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={separador ? 'mt-3 pt-3 border-t border-white/10' : ''}
          style={provided.draggableProps.style}
        >
          <button
            ref={botaoRef}
            type="button"
            title={item.label}
            onClick={abrir}
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

          {aberto && posicao && createPortal(
            <div
              data-menu-operacao
              className="fixed z-[9999] w-48 rounded-xl border border-white/10 bg-nz-preto-barra shadow-2xl py-2"
              style={{ top: posicao.top, left: posicao.left }}
            >
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
            </div>,
            document.body
          )}
        </div>
      )}
    </Draggable>
  );
}