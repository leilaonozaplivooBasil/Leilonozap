// 🪟 QUEM ESTÁ NA FRENTE — registro de "tem modal aberto na tela".
//
// O PROBLEMA QUE ISTO RESOLVE (chamado do Paim, 07/09/2026): o X-MUSIC vive
// em z-[60] e a Leila em z-50 — os dois acima ou empatados com o modal de
// comprovação (z-50). Na tela do celular eles ficavam POR CIMA do botão
// "Comprovar e concluir". O dedo batia no player, não no botão. Sem erro,
// sem aviso: a pessoa acha que o sistema travou.
//
// Subir o z-index do modal resolve o empate de hoje e volta a quebrar no dia
// em que alguém criar o próximo flutuante. Então além disso os flutuantes
// PERGUNTAM se tem alguém na frente e saem de cena — a mesma saída suave que
// eles já fazem quando a pessoa rola a página.
//
// É um contador, não um booleano: dois modais empilhados (o de comprovação
// abrindo o da câmera, por exemplo) fecham um de cada vez, e o flutuante só
// volta quando o último sair.

let abertos = 0;
const ouvintes = new Set();

const avisar = () => {
  const tem = abertos > 0;
  ouvintes.forEach((f) => { try { f(tem); } catch { /* ouvinte já desmontou */ } });
};

/** O modal declara que entrou. Devolve a função que o tira do registro. */
export function abrirCamada() {
  abertos += 1;
  avisar();
  let fechada = false;
  return () => {
    if (fechada) return;      // desmontar duas vezes não derruba o contador
    fechada = true;
    abertos = Math.max(0, abertos - 1);
    avisar();
  };
}

export function temCamadaAberta() {
  return abertos > 0;
}

export function ouvirCamada(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

/** só para os testes: volta ao estado limpo entre um caso e outro */
export function zerarCamadas() {
  abertos = 0;
  ouvintes.clear();
}
