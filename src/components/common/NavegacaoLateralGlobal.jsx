import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { getLicensingGroups } from '@/lib/licensingTabs';
import ItemLateralArrastavel from '@/components/common/ItemLateralArrastavel';

// 🧭 NAVEGAÇÃO LATERAL ÚNICA DO SISTEMA (08/08/2026 — decisão do dono).
// O botão "Voltar" foi retirado de todas as telas; no lugar dele entra ESTA
// lateral de ícones, a MESMA do Painel de Alavancagem (mesma fonte de itens:
// @/lib/licensingTabs), agora presente em todas as telas internas.
//
// Só desenha para quem está logado e só no desktop (no celular a saída já é o
// menu do topo, e uma coluna fixa comeria a tela).
// Itens de aba abrem o painel na aba certa (/Licensing?tab=…); itens de link
// vão para a rota que já existe. Nenhuma regra de permissão nova.
//
// 08/08/2026 — FAXINA + ORDEM DO DONO:
// • Rótulos de seção (CONTA, OPERAÇÃO…) saíram: vira lista contínua de ícones.
// • Itens que já existem dentro de outra tela saem daqui (lista ITENS_OCULTOS).
//   O filtro é LOCAL desta lateral — a lateral do Painel de Alavancagem
//   (LicensingSidebar) continua exatamente como estava.
// • Cada um arruma os ícones na ordem que preferir; a ordem fica salva no
//   próprio aparelho, por usuário.

// Duplicados retirados: já são alcançados por dentro de outra tela.
//  • Comprar Estoque → aba dentro de /painel/estoque
//  • Meus Arremates  → dentro do Painel do Arrematante
//  • Carreira (aba)  → a carreira completa já vive em outra tela
const ITENS_OCULTOS = ['/painel/comprar-estoque', '/MyWinnings', 'tab:plano-carreira'];

const chaveDe = (item) => (item.type === 'tab' ? `tab:${item.value}` : item.to);
const destinoDe = (item) => (item.type === 'tab' ? `/Licensing?tab=${item.value}` : item.to);

export default function NavegacaoLateralGlobal({ user }) {
  const location = useLocation();
  const chaveOrdem = user?.id ? `navLateralOrdem_${user.id}` : null;
  const [ordem, setOrdem] = useState([]);

  useEffect(() => {
    if (!chaveOrdem) return;
    try {
      const salvo = JSON.parse(localStorage.getItem(chaveOrdem) || '[]');
      setOrdem(Array.isArray(salvo) ? salvo : []);
    } catch { setOrdem([]); }
  }, [chaveOrdem]);

  // Achata os grupos numa lista única, tira os duplicados e aplica a ordem
  // salva. Item novo (que não estava na ordem guardada) entra no fim — nunca
  // some. Item sem permissão nem chega aqui: a regra de cargo é a de sempre.
  const itens = useMemo(() => {
    const lista = [];
    getLicensingGroups(user).forEach((grupo, gi) => {
      grupo.items.forEach((item) => {
        const chave = chaveDe(item);
        if (ITENS_OCULTOS.includes(chave)) return;
        lista.push({ ...item, chave, grupo: gi });
      });
    });
    if (!ordem.length) return lista;
    const pos = (i) => { const p = ordem.indexOf(i.chave); return p === -1 ? 999 : p; };
    return [...lista].sort((a, b) => pos(a) - pos(b));
  }, [user, ordem]);

  if (!user?.email) return null;

  const aoSoltar = (resultado) => {
    if (!resultado.destination || !chaveOrdem) return;
    const nova = [...itens];
    const [movido] = nova.splice(resultado.source.index, 1);
    nova.splice(resultado.destination.index, 0, movido);
    const chaves = nova.map((i) => i.chave);
    setOrdem(chaves);
    try { localStorage.setItem(chaveOrdem, JSON.stringify(chaves)); } catch { /* storage cheio/bloqueado */ }
  };

  return (
    // 🖤 Faixa escura em toda a altura do conteúdo; o menu segue fixo dentro dela.
    <aside className="hidden md:block w-24 shrink-0 self-stretch bg-nz-preto-barra border-r border-black/40" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div
        className="flex flex-col items-center py-4 sticky overflow-y-auto"
        style={{ top: 64, maxHeight: 'calc(100vh - 64px)' }}
      >
        <DragDropContext onDragEnd={aoSoltar}>
          <Droppable droppableId="navLateral">
            {(provided) => (
              <nav ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-1 w-full px-2 pb-12">
                {itens.map((item, i) => (
                  <ItemLateralArrastavel
                    key={item.chave}
                    item={item}
                    indice={i}
                    to={destinoDe(item)}
                    ativo={location.pathname.toLowerCase() === (item.to || '').toLowerCase()}
                    // respiro sutil onde a lista muda de bloco original
                    separador={i > 0 && itens[i - 1].grupo !== item.grupo}
                  />
                ))}
                {provided.placeholder}
              </nav>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </aside>
  );
}