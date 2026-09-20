// 🎬 A ANIMAÇÃO DE ENTRADA DAS SEÇÕES — e a rede de segurança dela.
//
// 🔴 POR QUE ISTO EXISTE. Animar seção com `initial={{ opacity: 0 }}` +
// `whileInView` é o padrão do projeto, e ele esconde conteúdo de verdade: até o
// IntersectionObserver disparar, a seção está com opacidade zero. Num print de
// página inteira as três seções de baixo saíram VAZIAS — foi assim que o
// defeito apareceu. Se o observer não disparar (navegador antigo, aba em
// segundo plano, JS tropeçando), a pessoa fica olhando um bloco preto.
//
// A regra daqui: quem pediu menos movimento no sistema (`prefers-reduced-motion`)
// recebe a seção JÁ VISÍVEL, sem animação nenhuma — não uma versão animada mais
// devagar. É o caso em que "sem animação" e "conteúdo garantido" são a mesma coisa.

/** Props de entrada para o <motion.div> de uma seção. */
export function aoEntrar({ semMovimento = false, atraso = 0, distancia = 18 } = {}) {
  if (semMovimento) {
    // nada de `initial` opaco: a seção nasce visível e fica
    return { initial: false, animate: { opacity: 1, y: 0 } };
  }
  return {
    initial: { opacity: 0, y: distancia },
    whileInView: { opacity: 1, y: 0 },
    // 🏃 19/09/2026 — A SEÇÃO ACENDE ANTES DE CHEGAR NA TELA.
    //
    // Com `amount: 0.15` a seção só começava a aparecer depois de 15% dela já
    // estar visível: quem rola rápido (o flick de celular) passava por um bloco
    // ainda apagado e via preto. Medido no print de página inteira: rolagem
    // instantânea deixou a faixa de números e o carrossel de destaque invisíveis
    // ocupando 900px de nada no meio da home.
    //
    // `amount: 0` + margem de 260px embaixo manda o observador disparar quando a
    // seção ainda está ABAIXO da dobra. Quando a pessoa chega, já acendeu.
    viewport: { once: true, amount: 0, margin: '0px 0px 260px 0px' },
    transition: { duration: 0.55, delay: atraso, ease: [0.16, 1, 0.3, 1] },
  };
}
