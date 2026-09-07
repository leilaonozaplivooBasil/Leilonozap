import React from 'react';
import { Link } from 'react-router-dom';
import { Draggable } from '@hello-pangea/dnd';

// 🧭 Um ícone da lateral. É um link normal (navega no clique) que também pode
// ser segurado e arrastado para mudar de lugar. O @hello-pangea/dnd cancela o
// clique quando houve arrasto, então não navega por engano ao reordenar.
export default function ItemLateralArrastavel({ item, indice, ativo, to, separador, aoSelecionar }) {
  const Icone = item.icon;
  // Dentro do Painel de Alavancagem os itens de aba trocam a aba na hora (sem
  // recarregar a página). Fora dele, continuam sendo link normal.
  const classes = (snapshot) => `flex min-h-[58px] w-full flex-col items-center justify-center gap-1.5 rounded-xl px-1.5 py-2.5 text-center transition-colors ${
    snapshot.isDragging
      ? 'bg-white/20 text-nz-verde-claro shadow-lg'
      : ativo
      ? 'bg-white/10 text-nz-verde-claro'
      : 'text-white/70 hover:bg-white/10 hover:text-nz-verde-claro'
  }`;
  // 🎓 07/09 (2ª limpeza) — "a tipografia da logo, puxar mais pra isso": o
  // nome continua o mesmo, só a letra passa a ser a mesma fonte da marca
  // (Sora, a mesma família do menu DIR-61), um pouco maior e mais espaçada —
  // "estava vazando", cramped num corpo de 9px sem folga nenhuma da caixa.
  const rotulo = <span className="text-[10px] font-semibold leading-tight tracking-wide" style={{ fontFamily: 'Sora, sans-serif' }}>{item.label}</span>;
  const miolo = (
    <>
      {Icone && <Icone className="w-5 h-5" />}
      {rotulo}
    </>
  );
  if (aoSelecionar) {
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
            <button type="button" title={item.label} onClick={aoSelecionar} className={classes(snapshot)}>
              {miolo}
            </button>
          </div>
        )}
      </Draggable>
    );
  }
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
          <Link to={to} title={item.label} className={classes(snapshot)}>
            {miolo}
          </Link>
        </div>
      )}
    </Draggable>
  );
}