// 🎯 O PLACAR DO DIA — DIR-180 (24/09/2026)
//
// Dono, olhando a tela do Compromisso no celular: "pra gente deixar isso
// ainda mais limpo... pra ficar ainda melhor visual e a pessoa entender
// melhor... o que você ainda melhoraria pra ficar ainda mais bonito?"
//
// Duas regras viraram código aqui, porque são REGRA e não desenho:
//
// 1) UM ALERTA POR VEZ. Entre a linha do 🔥 e os números moravam quatro
//    avisos condicionais (liberação, não-votou, atraso do pronto, aviso do
//    pronto). Quando dois disparavam junto, a pessoa lia três blocos
//    vermelhos ANTES de ver o próprio número — e os dois vermelhos dizem a
//    mesma coisa ("DIA ZERADO"). Agora vence o mais grave, e só ele aparece.
//
// 2) A EXPLICAÇÃO SAI DO `title=`. Os quatro cartões carregavam a
//    metodologia inteira dentro de um atributo `title` — que só abre com o
//    MOUSE PARADO em cima. No telefone ele NUNCA abre: a explicação do
//    Human Token são ~1000 caracteres presos num lugar que ninguém no
//    celular alcança. Aqui os textos viram dado, e a tela abre uma folha
//    por toque.

/**
 * O ÚNICO aviso que a tela mostra hoje — o mais grave de todos.
 *
 * @param {object} p
 * @param {boolean} p.naoVotou            zerou o dia por não votar em todo mundo
 * @param {boolean} p.atrasouPronto       zerou o dia por passar do "pronto até"
 * @param {boolean} p.emAvisoPronto       está em aviso (1º ao 3º atraso), sem zerar
 * @param {number}  p.avisosPronto        quantos avisos já tomou
 * @param {number}  p.avisosAntesDeZerar  quantos avisos antes do zero radical
 * @param {string}  p.horaFimVotacao      "18:00" — pra dizer até quando dava pra votar
 * @param {{ate_hora?:string, motivo?:string}|null} p.liberacao  liberação do administrador
 * @returns {{tipo:string, tom:'grave'|'aviso'|'bom', titulo:string, texto:string}|null}
 */
export function alertaDoDia({
  naoVotou = false, atrasouPronto = false, emAvisoPronto = false,
  avisosPronto = 0, avisosAntesDeZerar = 3, horaFimVotacao = '',
  liberacao = null,
} = {}) {
  if (naoVotou) {
    return {
      tipo: 'zerado-nao-votou', tom: 'grave',
      titulo: `🗳️ DIA ZERADO — você não votou em todos os colegas${horaFimVotacao ? ` até as ${horaFimVotacao}` : ''}`,
      texto: 'Não é só a MvM: hoje o Human Token, os pontos e o X-Pay que você ganharia também zeraram. Votar em todo mundo, todo dia, não é opcional. Amanhã dá pra recomeçar.',
    };
  }
  if (atrasouPronto) {
    return {
      tipo: 'zerado-atraso', tom: 'grave',
      titulo: '⏰ DIA ZERADO — uma tarefa da gestão passou do "pronto até" sem você dar o pronto',
      texto: 'MvM, Human Token, pontos e o X-Pay que você ganharia hoje zeraram junto com o atraso. Dá o pronto assim que puder — amanhã o dia recomeça do zero.',
    };
  }
  if (emAvisoPronto) {
    const atual = avisosPronto + 1;
    return {
      tipo: 'aviso-pronto', tom: 'aviso',
      titulo: `⚠️ AVISO ${atual} DE ${avisosAntesDeZerar} — uma tarefa da gestão passou do "pronto até" sem você dar o pronto`,
      texto: `Você perdeu pontos hoje por isso, mas MvM, Human Token e X-Pay continuam de pé. ${
        atual >= avisosAntesDeZerar
          ? 'Da próxima vez o dia INTEIRO zera — sem exceção.'
          : `Da próxima vez o aviso sobe pra ${atual + 1} de ${avisosAntesDeZerar}. No ${avisosAntesDeZerar + 1}º, zera tudo.`}`,
    };
  }
  if (liberacao && liberacao.ate_hora) {
    return {
      tipo: 'liberado', tom: 'bom',
      titulo: `🚀 LIBERADO PELO ADMINISTRADOR até as ${liberacao.ate_hora}${liberacao.motivo ? ` — ${liberacao.motivo}` : ''}`,
      texto: `Suas tarefas de hoje com horário antes desse não perdem MvM, pontos nem X-Pay por atraso — a empresa liberou pra você por causa do evento. Depois das ${liberacao.ate_hora}, a régua normal volta a valer.`,
    };
  }
  return null;
}

/**
 * Os textos longos dos quatro números — os mesmos que moravam no `title=`,
 * agora como dado, pra folha de toque conseguir abrir no celular.
 *
 * @returns {Record<string,{titulo:string, texto:string}>}
 */
export function explicacoesDoPlacar({
  metaVendasCiclo = 26, votacaoInicio = '', votacaoFim = '',
  diasFixo = 22, valorDia = '', pesoReferencia = 0, cicloDiasUteis = 22,
} = {}) {
  return {
    token: {
      titulo: 'Human Token',
      texto: `"O Human Token é a moeda da metodologia X-EOS que foi desenvolvida para a humanidade. Ela valida o desempenho e aplicabilidade do ser humano. Cada integrante do nosso Método é uma moeda. E essa moeda tem uma cotação diária que é gerada através do MvM + Produtividade."

Soma 5 componentes no ciclo: MvM da votação do grupo + Produção + Real Time + Bônus/Estudo + Vendas REAIS da sua loja, contadas automático (meta ${metaVendasCiclo} no ciclo — reunião conta uma fração, venda de alto valor satura na hora).

"Recrutamos caráter e treinamos habilidade": o MvM é PORTÃO, não só peso — abaixo de 7 trava tudo em Bronze, abaixo de 8 barra a Platina.

Ligas: 🥉 bronze até 6,65 · 🥈 prata até 12,21 · 🥇 ouro até 17,77 · 🏆 platina de 17,78 pra cima (só abre batendo os dois portões: caráter e 100% da meta de vendas). Ouro dá pra chegar sem estudar em casa (produção/MvM/vendas bastam) — só a Platina exige leitura de semana + estudo de fim de semana em dia.`,
    },
    mvm: {
      titulo: 'MvM (oficial)',
      texto: `Só a VOTAÇÃO DO CICLO (as notas que você recebe dos colegas, 1 a 10 nas 10 Virtudes, das ${votacaoInicio} às ${votacaoFim}) entra no Human Token — é este número.

O "automático" (o dia começa em 10 e cada tarefa que passa da hora sem marcar desconta) é só uma estimativa de humor do dia — NÃO conta pra moeda.`,
    },
    cotacao: {
      titulo: 'Cotação do dia',
      texto: `No dia 1 do ciclo o ponto vale 1,00 e cai 0,01 por dia útil até 0,80 no dia ${cicloDiasUteis}.

Fazer antes vale mais: ANTECIPAÇÃO É PODER.`,
    },
    xpay: {
      titulo: 'X-Pay',
      texto: `O valor do seu dia em R$: o seu fixo ÷ ${diasFixo} dias de operação = ${valorDia} por dia; dentro do dia o PESO de cada tarefa reparte esse valor (a soma das tarefas é sempre o dia inteiro).

O dia completo é a Rotina Perfeita (peso ${pesoReferencia}); com menos peso que isso, paga proporcional.

Venda NÃO paga aqui — a venda da sua loja já remunera pelas comissões da plataforma. Tarefa PERDIDA é dinheiro que sai do seu resultado.`,
    },
  };
}
