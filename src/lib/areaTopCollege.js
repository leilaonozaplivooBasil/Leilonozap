// 🎓 "ESTOU NA TOP COLLEGE?" — a bandeira que a página levanta (24/09/2026).
//
// Dono: "o ícone do D só pode aparecer nas áreas/telas/páginas da Top College".
//
// Por que não olhar a URL: dentro da Central as sub-abas trocam por estado
// (setCatalogSubTab) sem reescrever ?catalogTab=, então a URL mente com
// frequência. Quem sabe de verdade é Licensing.jsx — é o mesmo `naTopCollege`
// que pinta a faixa preta da academia (DIR-62). Ele levanta a bandeira aqui;
// o cabeçalho (fora do Licensing na árvore) só lê. Ao sair da página, o
// próprio efeito abaixa.
//
// Um store mínimo, sem React: `useSyncExternalStore` no componente que lê.
let ligado = false;
const ouvintes = new Set();

/** Licensing chama com o `naTopCollege` dele; false ao desmontar. */
export function marcarTopCollege(valor) {
  const novo = valor === true;
  if (novo === ligado) return;
  ligado = novo;
  for (const fn of ouvintes) { try { fn(); } catch { /* ouvinte quebrado não derruba os outros */ } }
}

/** O que o cabeçalho lê. */
export function estaNaTopCollege() {
  return ligado;
}

/** Assina mudanças; devolve o cancelamento (formato do useSyncExternalStore). */
export function assinarTopCollege(fn) {
  ouvintes.add(fn);
  return () => { ouvintes.delete(fn); };
}

/** Só pros testes: volta ao estado inicial sem vazar entre casos. */
export function _zerarTopCollege() {
  ligado = false; ouvintes.clear();
}
