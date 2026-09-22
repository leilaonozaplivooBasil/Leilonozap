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
// via mar nenhum — só uma tarja.
//
// 🔴 E 42% TAMBÉM ESTAVA ERRADO, medido no aparelho (22/09, 2ª rodada).
// Num iPhone de 393×852 a lâmina de abertura ocupa assim:
//
//     ícone do amanhecer   13,6% – 20,2%
//     título               25,4% – 31,3%
//     subtítulo            34,1% – 39,8%
//     selo                 42,6% – 46,0%   ← o horizonte caía AQUI DENTRO
//     card do contrato     48,8% – 79,5%
//     botão                82,3% – 88,7%
//
// Ou seja: a linha da água nascia atrás da placa escura do selo, e o sol —
// que nasce logo abaixo dela — ficava 100% coberto. O dono não estava vendo
// "pouco" o sol: ele não estava vendo NADA. Não era sutileza de cor, era
// colisão de layout, e só apareceu medindo a tela de verdade.
//
// Em 22% a linha cai na única faixa livre da lâmina (entre o ícone e o
// título), o sol nasce inteiro ali, e o mar passa a ocupar a tela toda por
// baixo do conteúdo — que é o que o dono pediu: "ver a imagem da praia e o
// sol". O conteúdo flutua sobre a água, com o véu dando chão pro texto.
export const HORIZONTE = 22;

// 🔴 E O SOL NÃO FICA NO MEIO. No centro ele nascia exatamente ATRÁS do ícone
// do amanhecer e do título — o disco sumia e sobrava um borrão. Fora do eixo
// ele aparece inteiro, o caminho de luz corta a água na diagonal, e o meio da
// tela fica livre pro texto. É também como uma foto de verdade seria composta.
// 🔴 E, a partir de 22/09 (2ª rodada), ele fica MAIS pra esquerda: em 31%,
// num celular de 393px, o disco encostava na borda do halo do ícone do
// amanhecer, que é centralizado. Dois círculos claros se tocando viram uma
// mancha só. Em 24% ele nasce limpo, com folga do ícone.
export const SOL_X = 24;

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
    //
    // 🔴 a subida já foi de 7 pontos e, no fechamento, o disco ficava BOIANDO
    // no céu, longe da faixa quente e com um vão entre ele e o próprio
    // reflexo na água — duas coisas que sol nenhum faz. Amanhecer de verdade
    // sobe pouco em meia hora.
    //
    // 🔴 E o CENTRO já esteve ABAIXO da linha (HORIZONTE + 0,8). Na foto do
    // celular o que aparecia era quase só o reflexo: o disco estava afogado,
    // e sobrava uma gota de luz em vez de um sol. MORDIDO PELA ÁGUA não é
    // submerso — é o disco em cima da linha com a base cortada por ela. Com
    // o centro 1,4 ponto ACIMA e um disco de ~6,8% de altura no celular,
    // sobram ~2 pontos dele embaixo d'água: exatamente um sol nascendo.
    solY: HORIZONTE - 1.4 - l * 1.6,
    // e vai ficando mais forte.
    // 🔴 o piso era 0,62 e, na abertura, o miolo do disco saía translúcido —
    // sobre o céu já clareando da faixa quente ele simplesmente sumia, e o
    // dono relatou não ver sol nenhum. Amanhecer começa fraco de LUZ EM
    // VOLTA, não de disco apagado: o sol em si é sólido desde o primeiro
    // segundo em que aparece na água.
    solForca: 0.78 + l * 0.22,
    // o céu perde a noite
    noite: 1 - l * 0.5,
  };
}

// 🖼️ AS FOTOS DA SEMANA — 22/09/2026
//
// ⚠️ HOJE NINGUÉM CHAMA ESTA FUNÇÃO, E ISSO É DE PROPÓSITO.
// As fotos subiram (DIR-173) e o dono desmontou no mesmo dia, vendo na tela:
// "melhor deixar as imagens antigas mesmo, estão mais limpas, pode voltar
// como estava, ficou melhor as outras." A cena desenhada venceu a foto de
// banco — e venceu no olho dele, que é o tribunal que vale.
//
// A conta fica porque o caminho continua aberto: no dia em que existir foto
// própria, em resolução alta, é religar uma linha no CrmMetodo. Apagar isto
// seria jogar fora a única parte da DIR-173 que estava certa.
//
// Dono, quando pediu: "vou te mandar mais duas pra completar a semana, e
// você vai colocar ALEATÓRIO." Aleatório, aqui, não pode ser `Math.random()`:
// a pessoa abre o
// ritual, fecha, reabre no meio dos 30 minutos — e a janela não pode virar
// outra praia no meio do ritual dela. O sorteio é SEMEADO PELO DIA: muda
// todo dia, e nunca no meio do mesmo dia. É a mesma régua que o Quadro dos
// Sonhos já usa pra embaralhar as imagens da visualização.
//
// ⚠️ E O DIA É O DO APARELHO, não o de UTC: das 21h às 23h59 em Brasília o
// UTC já virou amanhã, e a foto trocava no meio da noite (DIR-129/134).

/**
 * Qual foto da semana vale HOJE.
 *
 * @param {string} diaISO  a data de hoje em YYYY-MM-DD (fuso do aparelho)
 * @param {number} quantas quantas fotos existem na pasta
 * @returns {number} o índice da foto, ou -1 quando não há foto nenhuma
 */
export function fotoDoDia(diaISO, quantas) {
  const n = Math.max(0, Math.trunc(Number(quantas) || 0));
  if (!n) return -1;
  // a semente é a soma dos dígitos da data: simples, estável, e sem Date()
  // (data inválida ou vazia não pode virar NaN e apagar a foto do dia)
  const digitos = String(diaISO || '').replace(/\D/g, '');
  if (!digitos) return 0;
  let semente = 0;
  for (let i = 0; i < digitos.length; i++) semente = (semente * 31 + Number(digitos[i])) % 100003;
  return semente % n;
}
