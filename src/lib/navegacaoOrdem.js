// 🧭 A ORDEM DOS ÍCONES DE NAVEGAÇÃO — uma conta só pro desktop e pro celular.
//
// Ordem do dono (06/09/2026): "no celular não estou conseguindo arrastar de
// forma simples os ícones, como no computador". A lateral do desktop
// (NavegacaoLateralGlobal) já achatava os grupos numa lista única, escondia
// os duplicados, aplicava a ordem guardada no aparelho e deixava arrastar.
// O menu do celular (MobileNavSheet) fazia a MESMA transformação com outro
// código — sem ordem e sem arrastar. Agora os dois lêem daqui:
//   • `achatarItens` — a lista única (grupos colapsados viram UM item);
//   • `aplicarOrdem` — a ordem guardada; item novo entra no fim, nunca some;
//   • `moverItem`    — o que o arrastar faz: tira de um índice, põe no outro;
//   • `lerOrdem` / `gravarOrdem` — o localStorage, por usuário, no aparelho.
// A chave de armazenamento é a MESMA de sempre (`navLateralOrdem_<id>`):
// quem já arrumou os ícones no computador não perde nada.
import { getLicensingGroups, chaveDoItem, entradaFlutuante } from './licensingTabs.js';

// Duplicados retirados: já são alcançados por dentro de outra tela.
//  • Comprar Estoque → aba dentro de /painel/estoque
//  • Meus Arremates  → dentro do Painel do Arrematante
export const ITENS_OCULTOS = ['/painel/comprar-estoque', '/MyWinnings'];

export const chaveOrdemDe = (user) => (user?.id ? `navLateralOrdem_${user.id}` : null);

export function lerOrdem(chave) {
  if (!chave) return [];
  try {
    const salvo = JSON.parse(localStorage.getItem(chave) || '[]');
    return Array.isArray(salvo) ? salvo : [];
  } catch { return []; }
}

export function gravarOrdem(chave, chaves) {
  if (!chave) return;
  try { localStorage.setItem(chave, JSON.stringify(chaves)); } catch { /* storage cheio/bloqueado */ }
}

/**
 * Achata os grupos numa lista única e tira os duplicados. Item sem permissão
 * nem chega aqui: a regra de cargo é a de sempre (getLicensingGroups).
 * Cada item sai com `chave` (identidade estável) e `grupo` (índice do bloco
 * original, pra desenhar o respiro/título onde o bloco muda) e `titulo` do
 * grupo de origem.
 */
export function achatarItens(user, onTabChange) {
  const lista = [];
  getLicensingGroups(user).forEach((grupo, gi) => {
    // 🎓 DIR-57 — grupo marcado com `colapsar` (Minha Conta, Operação, Top
    // College, Admin) some da lista e vira UM ícone só, com menu pros destinos.
    // Grupo que sobrou com UM item só não vira menu: um menu pra abrir uma
    // opção sozinha é clique a mais sem ganho nenhum.
    if (grupo.colapsar) {
      const visiveis = grupo.items.filter((item) => !ITENS_OCULTOS.includes(chaveDoItem(item)));
      // 🎓 06/09/2026 — `sempre`: o grupo continua sendo o botão e o menu MESMO
      // com um item só. É a Top College: o botão dela fica na lateral e, ao
      // clicar, aparece só a marca X-EOS (dono: "era pra deixar do jeito que
      // estava — a Top College ali, e ao clicar só a X-EOS").
      if (visiveis.length > 1 || (grupo.colapsar.sempre && visiveis.length === 1)) {
        const subItens = visiveis.map((item) => entradaFlutuante(item, onTabChange));
        // quais abas/seções pertencem a este grupo, pra acender o ícone certo
        const abas = visiveis.filter((i) => i.type === 'tab' && !i.catalogTab).map((i) => i.value);
        const secoes = visiveis.filter((i) => i.catalogTab).map((i) => i.catalogTab);
        lista.push({ type: 'group', ...grupo.colapsar, subItens, grupo: gi, titulo: grupo.title, abas, secoes });
        return;
      }
    }
    grupo.items.forEach((item) => {
      const chave = chaveDoItem(item);
      if (ITENS_OCULTOS.includes(chave)) return;
      // 🛍️ "Central de Vendas" (e qualquer aba com subItens) também vira um
      // item único com menu — escolhe a seção direto.
      if (item.type === 'tab' && Array.isArray(item.subItens) && item.subItens.length) {
        const subItens = item.subItens.map((sub) => (
          entradaFlutuante({ ...sub, type: 'tab', value: item.value, catalogTab: sub.value }, onTabChange)
        ));
        lista.push({ type: 'group', chave, label: item.label, icon: item.icon, marca: item.marca, subItens, grupo: gi, titulo: grupo.title, tabValue: item.value });
        return;
      }
      lista.push({ ...item, chave, grupo: gi, titulo: grupo.title });
    });
  });
  return lista;
}

/** Aplica a ordem guardada; item que não estava nela vai pro fim, na ordem original. */
export function aplicarOrdem(lista, ordem) {
  if (!ordem?.length) return lista;
  const pos = (i) => { const p = ordem.indexOf(i.chave); return p === -1 ? 999 : p; };
  return [...lista].sort((a, b) => pos(a) - pos(b));
}

/** Tira o item do índice `de` e põe no índice `para`. Devolve lista nova. */
export function moverItem(lista, de, para) {
  const nova = [...lista];
  const [movido] = nova.splice(de, 1);
  nova.splice(para, 0, movido);
  return nova;
}
