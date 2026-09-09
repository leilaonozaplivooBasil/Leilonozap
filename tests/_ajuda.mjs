// 🧰 Ajudantes dos testes que leem o código-fonte como texto.
//
// POR QUE ISTO EXISTE (09/09/2026): vários testes desta casa conferem regra
// lendo o arquivo e procurando trechos. Como os comentários daqui EXPLICAM o
// bug que o código conserta, uma assertiva do tipo `!SRC.includes('x')` casa
// com a explicação e não com o código — por isso todo mundo tira os
// comentários antes de comparar.
//
// 🔴 O ajudante estava copiado em cada arquivo de teste, e a cópia estava
// ERRADA: tratava qualquer `/*` como abertura de comentário. Em JSX isso
// quebra na cara — `accept="image/*"` abre um "comentário" que só fecha no
// próximo `*/` de verdade, dezenas de linhas depois, ENGOLINDO código real.
// Foi assim que um teste do ditado acusou falta de um bloco que estava lá.
//
// O perigo não é o falso alarme, que a gente vê: é o contrário. Uma assertiva
// `assert.ok(!FONTE.includes('coisa proibida'))` passa VERDE quando o trecho
// foi engolido pelo removedor. Teste que mente é pior que teste que falta.
//
// A regra correta: `/*` só abre comentário quando vem no começo da linha, ou
// depois de espaço, ou depois de `{` (o `{/* comentário JSX */}`). Dentro de
// uma string como "image/*" ele vem colado num caractere de palavra — e ali
// não é comentário nenhum.

/**
 * Tira comentários de JS/JSX pra assertiva não casar com a explicação do bug.
 * Não é um parser: é o suficiente pra este uso, e agora sem engolir JSX.
 */
export function semComentarios(txt) {
  return String(txt ?? '')
    // bloco: só quando o `/*` está isolado (início de linha, após espaço ou `{`)
    .replace(/(^|[\s{])\/\*[\s\S]*?\*\//g, '$1')
    // linha: `//`, menos o `://` de uma URL
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}
