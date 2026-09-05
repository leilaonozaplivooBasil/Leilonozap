import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Draggable } from '@hello-pangea/dnd';
import { Store } from 'lucide-react';
import MarcaOuIcone from '@/components/common/MarcaOuIcone';

// 🧭 Ícone único da lateral que agrupa vários destinos num menu flutuante —
// usado tanto para "Operação" (Meu Painel, PDV, Estoque, Metas: links de rota)
// quanto para "Central de Vendas" (Loja Virtual, Pedidos, Vendedores…: troca de
// aba interna). Cada sub-item tem `to` (link) OU `onClick` (troca de aba).
//
// 🩹 O menu é renderizado num portal (document.body) com posição FIXA calculada
// a partir do botão: a lateral tem overflow-y-auto (rola verticalmente), e isso
// corta automaticamente qualquer coisa que passe pra fora na horizontal — um
// menu "position: absolute" dentro dela simplesmente não aparecia. Fora do
// contêiner, o corte não existe mais.
export default function ItemLateralGrupo({ item, indice, separador, ativo: ativoProp }) {
  const location = useLocation();
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState(null);
  const botaoRef = useRef(null);

  const ativo = ativoProp !== undefined
    ? ativoProp
    : item.subItens.some((s) => s.to && location.pathname.toLowerCase() === s.to.toLowerCase());

  const Icone = item.icon || Store;

  const abrir = () => {
    const rect = botaoRef.current?.getBoundingClientRect();
    if (rect) setPosicao({ top: rect.top, left: rect.right + 8 });
    setAberto((v) => !v);
  };

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (botaoRef.current && !botaoRef.current.contains(e.target) && !e.target.closest('[data-menu-lateral-grupo]')) {
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
            <MarcaOuIcone marca={item.marca} icone={Icone} className="w-5 h-5" />
            <span className="text-[9px] font-medium leading-tight">{item.label}</span>
          </button>

          {aberto && posicao && createPortal(
            <div
              data-menu-lateral-grupo
              className="fixed z-[9999] w-52 rounded-xl border border-white/10 bg-nz-preto-barra shadow-2xl py-2"
              style={{ top: posicao.top, left: posicao.left }}
            >
              {item.subItens.map((sub) => {
                // 🎓 DIR-59 — item com `marcaCompleta` mostra a LOGO no lugar do
                // texto (ordem do dono pro "O Método"). O rótulo vira o texto
                // alternativo: quem usa leitor de tela continua sabendo o que é.
                const conteudo = sub.marcaCompleta ? (
                  <img src={sub.marcaCompleta} alt={sub.label} className="h-[46px] w-auto object-contain" draggable="false" />
                ) : (
                  <>
                    <MarcaOuIcone marca={sub.marca} icone={sub.icon} className="w-4 h-4 shrink-0" />
                    {sub.label}
                  </>
                );
                if (sub.to) {
                  return (
                    <Link
                      key={sub.to}
                      to={sub.to}
                      onClick={() => setAberto(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-nz-verde-claro transition-colors"
                    >
                      {conteudo}
                    </Link>
                  );
                }
                return (
                  <button
                    key={sub.label}
                    type="button"
                    onClick={() => { sub.onClick?.(); setAberto(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-nz-verde-claro transition-colors"
                  >
                    {conteudo}
                  </button>
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