import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { getLicensingGroups, chaveDoItem, entradaFlutuante, SECOES_TOP_COLLEGE } from '@/lib/licensingTabs';
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

// Duplicados retirados: já são alcançados por dentro de outra tela.
//  • Comprar Estoque → aba dentro de /painel/estoque
//  • Meus Arremates  → dentro do Painel do Arrematante
//  • Carreira (aba)  → a carreira completa já vive em outra tela
const ITENS_OCULTOS = ['/painel/comprar-estoque', '/MyWinnings'];

// ✅ Item novo (ex.: Consignado) precisa aparecer mesmo para quem já tem uma
// ordem antiga salva no aparelho — a ordem guardada não pode escondê-lo.

const chaveDe = chaveDoItem;
const destinoDe = (item) => (item.type === 'tab' ? `/Licensing?tab=${item.value}` : item.to);

// activeTab/onTabChange só chegam quando a lateral é usada DENTRO do Painel de
// Alavancagem: ali os itens de aba trocam a aba na hora, sem recarregar a tela.
export default function NavegacaoLateralGlobal({ user, activeTab, activeCatalogTab, onTabChange }) {
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
      // 🎓 DIR-57 — grupo marcado com `colapsar` (Minha Conta, Operação, Top
      // College, Admin) some da lista e vira UM ícone só, com menu flutuante
      // pros destinos — a lateral encolhe sem tirar nenhum link do lugar.
      // Antes isso era um `if` fixo no nome "Operação"; agora é dado da fonte
      // única, então incluir um grupo novo não exige mexer aqui.
      // Grupo que sobrou com UM item só não vira menu: um flutuante pra abrir
      // uma opção sozinha é clique a mais sem ganho nenhum (caso do Admin de
      // quem não é admin, que não tem o Consignado).
      if (grupo.colapsar) {
        const visiveis = grupo.items.filter((item) => !ITENS_OCULTOS.includes(chaveDe(item)));
        if (visiveis.length > 1) {
          const subItens = visiveis.map((item) => entradaFlutuante(item, onTabChange));
          // 🎓 DIR-57 — quais abas/seções pertencem a este grupo, pra acender o
          // ícone certo. Sem isso, "Loja & Vendas" acendia enquanto a pessoa
          // estava em "O Método": as duas moram na MESMA aba (catalogo), então
          // olhar só a aba não distingue — tem que olhar a seção também.
          const abas = visiveis.filter((i) => i.type === 'tab' && !i.catalogTab).map((i) => i.value);
          const secoes = visiveis.filter((i) => i.catalogTab).map((i) => i.catalogTab);
          lista.push({ type: 'group', ...grupo.colapsar, subItens, grupo: gi, abas, secoes });
          return;
        }
      }
      grupo.items.forEach((item) => {
        const chave = chaveDe(item);
        if (ITENS_OCULTOS.includes(chave)) return;
        // 🛍️ "Central de Vendas" (e qualquer aba com subItens) também vira um
        // ícone único com menu flutuante — escolhe a seção direto, sem abrir a
        // aba e escolher de novo no seletor interno dela.
        if (item.type === 'tab' && Array.isArray(item.subItens) && item.subItens.length) {
          const subItens = item.subItens.map((sub) => (
            entradaFlutuante({ ...sub, type: 'tab', value: item.value, catalogTab: sub.value }, onTabChange)
          ));
          lista.push({ type: 'group', chave, label: item.label, icon: item.icon, subItens, grupo: gi, tabValue: item.value });
          return;
        }
        lista.push({ ...item, chave, grupo: gi });
      });
    });
    if (!ordem.length) return lista;
    const pos = (i) => { const p = ordem.indexOf(i.chave); return p === -1 ? 999 : p; };
    return [...lista].sort((a, b) => pos(a) - pos(b));
  }, [user, ordem, onTabChange]);

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