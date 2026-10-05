// 🎯 "LEILÕES" NA BARRA DO APP LEVA DIRETO AOS DESTAQUES (27/09/2026)
//
// Dono: "no site quando clicar no botão do menu inferior LEILÕES, a página
// quando carregar tem que levar a tela direto para a parte dos leilões em
// destaque."
//
// O botão aponta para a Home com a âncora #destaques. Os destaques chegam do
// banco DEPOIS que a página desenha (o bloco nasce vazio), então a rolagem não
// pode ser a do navegador: quem rola é o próprio bloco, assim que tiver cards.
// O cabeçalho é fixo, então o alvo desconta a altura dele para o título
// "Destaques" não ficar escondido por baixo.

export const ANCORA_DESTAQUES = 'destaques';

/** O endereço pede os destaques? (aceita "#destaques" e "destaques") */
export function querDestaques(hash) {
  return String(hash || '').replace(/^#/, '') === ANCORA_DESTAQUES;
}

/**
 * Até onde rolar a janela para o topo do bloco ficar logo abaixo do cabeçalho.
 * @param {{ topoDoBloco: number, scrollY: number, alturaDoCabecalho: number, folga?: number }} x
 */
export function alvoDaRolagem({ topoDoBloco, scrollY, alturaDoCabecalho, folga = 12 }) {
  const alvo = (Number(topoDoBloco) || 0) + (Number(scrollY) || 0) - (Number(alturaDoCabecalho) || 0) - folga;
  return Math.max(0, Math.round(alvo));
}

/** Rola até o bloco. Só roda no navegador; fora dele não faz nada. */
export function rolarAte(elemento, { suave = true } = {}) {
  if (typeof window === 'undefined' || !elemento) return;
  const cabecalho = document.querySelector('nav.fixed.top-0');
  const top = alvoDaRolagem({
    topoDoBloco: elemento.getBoundingClientRect().top,
    scrollY: window.scrollY,
    alturaDoCabecalho: cabecalho ? cabecalho.getBoundingClientRect().bottom : 0,
  });
  window.scrollTo({ top, behavior: suave ? 'smooth' : 'auto' });
}
