import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { SECOES_TOP_COLLEGE } from '@/lib/licensingTabs';
import { chaveOrdemDe, lerOrdem, gravarOrdem, achatarItens, aplicarOrdem, moverItem } from '@/lib/navegacaoOrdem';
import ItemLateralArrastavel from '@/components/common/ItemLateralArrastavel';
import ItemLateralGrupo from '@/components/common/ItemLateralGrupo';

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

// 📱 06/09/2026 — a lista achatada, os duplicados escondidos e a ordem
// guardada moraram aqui até o dono pedir o MESMO arrastar no celular. Hoje
// tudo isso vive em @/lib/navegacaoOrdem, e o menu do celular
// (MobileNavSheet) lê da mesma fonte — inclusive a MESMA chave de
// localStorage, então a ordem que a pessoa já arrumou continua valendo.

const destinoDe = (item) => (item.type === 'tab' ? `/Licensing?tab=${item.value}` : item.to);

// activeTab/onTabChange só chegam quando a lateral é usada DENTRO do Painel de
// Alavancagem: ali os itens de aba trocam a aba na hora, sem recarregar a tela.
export default function NavegacaoLateralGlobal({ user, activeTab, activeCatalogTab, onTabChange }) {
  const location = useLocation();
  const chaveOrdem = chaveOrdemDe(user);
  const [ordem, setOrdem] = useState([]);

  useEffect(() => { if (chaveOrdem) setOrdem(lerOrdem(chaveOrdem)); }, [chaveOrdem]);

  // Lista única com a ordem salva. Item novo (que não estava na ordem
  // guardada) entra no fim — nunca some.
  const itens = useMemo(() => aplicarOrdem(achatarItens(user, onTabChange), ordem), [user, ordem, onTabChange]);

  if (!user?.email) return null;

  // 🎓 DIR-57 — qual ícone de grupo acende. Fora do Painel de Alavancagem não
  // acende nenhum (não existe aba ativa). Dentro dele:
  //  • grupo com sub-seções da aba aberta (Top College) → acende pela SEÇÃO
  //  • aba com sub-seções (Loja & Vendas) → acende só se a seção aberta for
  //    dela; senão "Loja & Vendas" ficava aceso com a pessoa em "O Método"
  //  • grupo de abas inteiras (ex.: Admin) → acende pela aba
  const grupoAceso = (item) => {
    if (!onTabChange) return undefined;
    if (item.secoes?.length && activeTab === 'catalogo') return item.secoes.includes(activeCatalogTab);
    if (item.abas?.length) return item.abas.includes(activeTab);
    if (item.tabValue) {
      const daFaculdade = SECOES_TOP_COLLEGE.some((s) => s.value === activeCatalogTab);
      if (item.tabValue === 'catalogo' && daFaculdade) return false;
      return activeTab === item.tabValue;
    }
    return undefined;
  };

  const aoSoltar = (resultado) => {
    if (!resultado.destination || !chaveOrdem) return;
    const chaves = moverItem(itens, resultado.source.index, resultado.destination.index).map((i) => i.chave);
    setOrdem(chaves);
    gravarOrdem(chaveOrdem, chaves);
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
                  item.type === 'group' ? (
                    <ItemLateralGrupo
                      key={item.chave}
                      item={item}
                      indice={i}
                      separador={i > 0 && itens[i - 1].grupo !== item.grupo}
                      ativo={grupoAceso(item)}
                    />
                  ) : (
                    <ItemLateralArrastavel
                      key={item.chave}
                      item={item}
                      indice={i}
                      to={destinoDe(item)}
                      aoSelecionar={onTabChange && item.type === 'tab' ? () => onTabChange(item.value) : undefined}
                      ativo={
                        item.type === 'tab'
                          ? !!onTabChange && activeTab === item.value
                          : location.pathname.toLowerCase() === (item.to || '').toLowerCase()
                      }
                      // respiro sutil onde a lista muda de bloco original
                      separador={i > 0 && itens[i - 1].grupo !== item.grupo}
                    />
                  )
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