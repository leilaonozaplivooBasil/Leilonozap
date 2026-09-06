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
              className="fixed z-[9999] w-60 rounded-xl border border-white/10 bg-nz-preto-barra shadow-2xl py-2 overflow-hidden"
              /* 🎓 DIR-61 — o menu inteiro na Sora, a tipografia oficial da
                 X-EOS: os nomes passam a ser da MESMA família da logo, e o
                 bloco lê como uma coisa só em vez de logo + interface. */
              style={{ ...({ top: posicao.top, left: posicao.left }), fontFamily: 'Sora, sans-serif' }}
            >
              {/* 🎓 DIR-70 — a liga metálica da marca, disponível pro traço dos
                  ícones. Tem que viver DENTRO do menu: `stroke: url(#id)` só
                  resolve se o <defs> estiver no mesmo documento, e o menu mora
                  num portal no body. Os tons saíram da média de pixel do
                  arquivo da logo — é o mesmo metal, não um prata parecido. */}
              <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
                <defs>
                  <linearGradient id="xeosMetal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EBEDF0" />
                    <stop offset="45%" stopColor="#C6CBD3" />
                    <stop offset="100%" stopColor="#8C929B" />
                  </linearGradient>
                  <linearGradient id="xeosMetalVivo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="45%" stopColor="#E4E7EB" />
                    <stop offset="100%" stopColor="#B4BAC3" />
                  </linearGradient>
                </defs>
              </svg>
              {item.subItens.map((sub) => {
                // 🎓 DIR-61 — FAIXA DE MARCA: item com `marcaCompleta` vira o
                // cabeçalho do menu — a arte da logo (X inteiro + "-eos", em
                // prata) e a frase da marca logo abaixo.
                //
                // Por que a frase é TEXTO e não parte da imagem: no lockup
                // original ela tem 1/40 da altura da arte — pra ela ser LIDA a
                // logo precisaria de ~300px, que não existe em menu nenhum.
                // Como texto de verdade, na fonte da marca, fica nítida em
                // qualquer tamanho. A arte continua inteira: o subtítulo foi
                // APAGADO do arquivo, não recortado — o rabo do X segue lá.
                const conteudo = sub.marcaCompleta ? (
                  <span className="flex flex-col gap-1.5">
                    <img src={sub.marcaCompleta} alt={sub.label} className="h-[38px] w-auto object-contain self-start shrink-0" draggable="false" />
                    {sub.legenda && (
                      <span className="text-[9.5px] leading-snug text-white/45" style={{ fontFamily: 'Sora, sans-serif' }}>
                        {sub.legenda}
                      </span>
                    )}
                  </span>
                ) : (
                  <>
                    <MarcaOuIcone marca={sub.marca} icone={sub.icon} className="w-4 h-4 shrink-0" />
                    <span className="xeos-metal-texto">{sub.label}</span>
                  </>
                );
                // 🎓 DIR-70 — os dois blocos passam a dividir o MESMO eixo
                // (px-4) e o mesmo material. A faixa da marca perdeu o fundo
                // próprio e a linha cheia: no lugar entrou um fio que nasce no
                // eixo do texto e some antes da borda, que emenda em vez de
                // cortar. E o aceso virou prata: o verde ali era a cor do
                // Leilão NoZap dentro do menu da faculdade.
                const classe = sub.marcaCompleta
                  ? 'flex w-full items-center gap-2.5 px-4 pt-2 pb-3.5 -mt-2 mb-1 text-left xeos-emenda hover:bg-white/[0.05] transition-colors'
                  : 'xeos-item flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] tracking-[0.015em] hover:bg-white/[0.06] transition-colors';
                if (sub.to) {
                  return (
                    <Link key={sub.to} to={sub.to} onClick={() => setAberto(false)} className={classe}>
                      {conteudo}
                    </Link>
                  );
                }
                return (
                  <button
                    key={sub.label}
                    type="button"
                    onClick={() => { sub.onClick?.(); setAberto(false); }}
                    className={classe}
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