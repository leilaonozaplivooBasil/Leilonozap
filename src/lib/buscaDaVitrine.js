// 🔎 A busca precisa PARECER que buscou.
//
// ══════════════════════════════════════════════════════════════════════════════
// O QUE ISTO RESOLVE
// ══════════════════════════════════════════════════════════════════════════════
// Palavras do dono, áudio de 11/09/2026 às 14h08:
//
//   "O sistema de busca está funcionando, mas ele não está subindo, não está
//    ficando claro. O cliente não desce, ele pensa que não está buscando."
//
// Ele descreveu o sintoma exato. O motor sempre funcionou — o problema é que
// entre a barra de busca e o primeiro resultado existem QUATRO blocos na Home:
//
//   1. barra de busca          ← a pessoa digita aqui
//   2. links de setores
//   3. Destaques (até 6 leilões)
//   4. Recomendados
//   5. carrossel de categorias
//   6. a lista de resultados   ← o que ela queria ver
//
// No celular isso é mais de uma tela de rolagem. Quem digita e não vê nada
// mudar não rola: conclui que quebrou.
//
// ══════════════════════════════════════════════════════════════════════════════
// A REGRA
// ══════════════════════════════════════════════════════════════════════════════
// Enquanto há busca ativa, os blocos do meio SOMEM. Eles são vitrine de
// descoberta — quem já sabe o que quer não está descobrindo. E a contagem
// aparece logo abaixo do campo, na hora: é o retorno visual que faltava.

/** Espaços a mais, maiúscula e acento não podem mudar o resultado da busca. */
export function termoLimpo(bruto) {
  return String(bruto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim().replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Tem busca valendo?
 *
 * Uma letra só já conta: quem digitou "b" está buscando, e esconder os blocos
 * nesse instante é justamente o que mostra que a tela reagiu.
 */
export function buscando(termo) {
  return termoLimpo(termo).length > 0;
}

/**
 * Os blocos de descoberta aparecem? Só quando NÃO há busca.
 *
 * Um nome só para os cinco lugares que perguntam a mesma coisa — se algum dia
 * entrar um sexto bloco entre a barra e a lista, ele pergunta aqui também.
 */
export function mostrarBlocosDeDescoberta(termo) {
  return !buscando(termo);
}

/**
 * A frase que aparece embaixo do campo, imediatamente.
 *
 * É o retorno visual que faltava: mesmo que a lista esteja fora da vista, a
 * pessoa lê aqui que a tela achou (ou não achou) alguma coisa.
 *
 * @param {unknown} termo  o que foi digitado
 * @param {number} achados quantos leilões sobraram no filtro
 * @param {boolean} [carregando] a primeira carga ainda está vindo do servidor
 * @returns {string|null} null quando não há busca — a frase não deve aparecer
 */
export function recadoDaBusca(termo, achados, carregando = false) {
  if (!buscando(termo)) return null;
  const texto = String(termo).trim();
  if (carregando) return `Buscando “${texto}”…`;

  const n = Number(achados) || 0;
  if (n === 0) return `Nenhum leilão para “${texto}”`;
  if (n === 1) return `1 leilão para “${texto}”`;
  return `${n} leilões para “${texto}”`;
}
