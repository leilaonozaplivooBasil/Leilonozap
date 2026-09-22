// 🌊 A RÉGUA DA JANELA PRO MAR — a conta do nascer do sol, sem tela.
//
// ⚠️ POR QUE ISTO MORA AQUI, E NÃO DENTRO DO .jsx:
// o próprio XGameRitualAmanhecer.jsx já avisa — "duas vezes nesta casa uma
// regra nasceu dentro de um .jsx e o teste não conseguiu importar; não tem
// terceira". O `node --test` não abre .jsx. Uma conta que ninguém consegue
// testar é uma conta que ninguém defende quando ela quebrar.

/** Onde o céu encontra a água, em % da altura da tela. */
// 🔴 O HORIZONTE FICA NA PARTE DE CIMA, e não no meio. Com ele no meio, o
// card do contrato caía EM CIMA da linha da água e, no celular, a pessoa não
// via mar nenhum — só uma tarja. Em 42% o céu fica atrás do título e o mar
// aberto embaixo, com o conteúdo flutuando sobre a água.
export const HORIZONTE = 42;

// 🔴 E O SOL NÃO FICA NO MEIO. No centro ele nascia exatamente ATRÁS do ícone
// do amanhecer e do título — o disco sumia e sobrava um borrão. Fora do eixo
// ele aparece inteiro, o caminho de luz corta a água na diagonal, e o meio da
// tela fica livre pro texto. É também como uma foto de verdade seria composta.
export const SOL_X = 31;

/**
 * A vista muda de temperatura conforme o ritual anda.
 *
 * `luz` vai de 0 (hora azul, na abertura) a 1 (sol alto, no fechamento). Lixo
 * na entrada NÃO pode virar `NaN`: `NaN` dentro da string de CSS apaga o
 * degradê inteiro e a pessoa abre o ritual numa tela preta.
 */
export function cenaDaLuz(luz) {
  const l = Math.max(0, Math.min(1, Number(luz) || 0));
  return {
    // o sol nasce: começa mordido pela água e vai subindo.
    // 🔴 a subida já foi de 7 pontos e, no fechamento, o disco ficava BOIANDO
    // no céu, longe da faixa quente e com um vão entre ele e o próprio
    // reflexo na água — duas coisas que sol nenhum faz. Amanhecer de verdade
    // sobe pouco em meia hora: em 2,6 pontos o sol continua colado no
    // horizonte, e o caminho de luz sai de dentro dele, sem emenda.
    solY: HORIZONTE + 0.8 - l * 2.6,
    // e vai ficando mais forte
    solForca: 0.62 + l * 0.38,
    // o céu perde a noite
    noite: 1 - l * 0.5,
  };
}
