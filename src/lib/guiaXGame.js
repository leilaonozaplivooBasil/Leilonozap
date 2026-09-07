// 🎓 O GUIA DO X-GAME — o passo a passo em forma de aula (07/09/2026).
//
// O PEDIDO (dono): "um guia completo passo a passo em formato de aula para os
// usuários do Top College x-game aprenderem a utilizar a gamificação. Como
// inclusão digital, temos usuários sem afinidade com tecnologia. Do acesso ao
// mãos na prática." E depois: "vira página" — dentro da plataforma, não um
// arquivo solto que alguém precisa achar.
//
// 🔴 POR QUE ISTO É DADO E NÃO JSX: um guia é texto que muda. Escrito como
// componente, mexer numa frase é mexer em código e arriscar quebrar a tela.
// Aqui a aula é uma lista; a tela só desenha. Quem quiser corrigir uma palavra
// corrige uma string.
//
// 🔴 E POR QUE OS NÚMEROS VÊM DE xgame.js: o guia da versão anterior tinha
// "17,77" e "400 caracteres" escritos à mão. No dia em que a regra mudasse, o
// guia viraria a documentação errada — e material de aula errado ensina errado
// com autoridade. Aqui cada número é lido da constante de verdade.
import {
  TOKEN_MAX, APLICABILIDADE_MAX, MVM_MAX, TRAVA_SEM_ESTUDO, CICLO_DIAS_UTEIS,
  FAIXAS_TOKEN, RESUMO_MIN, cotacaoDoDia,
} from './xgame.js';

const br = (n) => Number(n).toFixed(2).replace('.', ',');

export const COTACAO_DIA_1 = cotacaoDoDia(1);
export const COTACAO_ULTIMO = cotacaoDoDia(CICLO_DIAS_UTEIS);

// as faixas da moeda com o intervalo já escrito ("6,66 a 17,77"), calculado
// do piso da faixa de cima — assim mudar um limiar em xgame.js reescreve o
// guia sozinho, em vez de deixar duas verdades no ar.
export const FAIXAS = (() => {
  const daMenor = FAIXAS_TOKEN.slice().sort((x, y) => x.min - y.min);
  return daMenor.map((f, i) => {
    const acima = daMenor[i + 1];
    return { ...f, intervalo: acima ? `${br(f.min)} a ${br(acima.min - 0.01)}` : `${br(f.min)} ou mais` };
  });
})();

export const ENDERECOS = {
  plataforma: 'leilaonozap.net',
  metodo: 'leilaonozap.net/CRM',
  placar: 'leilaonozap.net/XGame',
  licensing: 'leilaonozap.net/Licensing',
};

export const HABITOS = [
  { n: 1, nome: 'Sonho', frase: 'Onde você quer chegar. Sem isso, a energia se espalha.' },
  { n: 2, nome: 'Compromisso', frase: 'A sua rotina do dia. É aqui que o jogo acontece.', destaque: true },
  { n: 3, nome: 'Lista de Networking', frase: 'As pessoas que você conhece, qualificadas de 1 a 5.' },
  { n: 4, nome: 'Contato e Convite', frase: 'Como você fala com a pessoa antes de apresentar.' },
  { n: 5, nome: 'Apresentação de Sucesso', frase: 'A reunião. Meta do método: 3 por dia, de 45 a 60 minutos.' },
  { n: 6, nome: 'Acompanhamento e Fechamento', frase: 'O que vem depois da reunião até fechar.' },
  { n: 7, nome: 'Verificação do Progresso', frase: 'Seus números. O que não se mede não se corrige.' },
  { n: 8, nome: 'Duplicação dos 8 Hábitos', frase: 'Ensinar o método para o seu time.' },
];

export const CORES_DA_TAREFA = [
  { id: 'agora', rotulo: 'AGORA', cor: '#22c55e', o_que_e: 'É a hora dela. Faça e marque. É aqui que você ganha o ponto cheio.' },
  { id: 'feito', rotulo: 'FEITO', cor: '#38bdf8', o_que_e: 'Você já marcou. Está garantido.' },
  { id: 'atrasado', rotulo: 'ATRASADO', cor: '#f59e0b', o_que_e: 'Passou da hora. Ainda dá para marcar — vale menos, mas vale.' },
  { id: 'perdido', rotulo: 'PERDIDO', cor: '#ef4444', o_que_e: 'Passou muito. A nota do dia já foi descontada.' },
];

export const AULAS = [
  {
    n: 1,
    id: 'entrar',
    titulo: 'Entrar na plataforma',
    resumo: 'Você entra com o seu e-mail. Não precisa decorar senha: o sistema manda um código para o seu e-mail e você digita.',
    passos: [
      { faca: 'Abra o navegador do celular', detalhe: 'Chrome ou Safari — aquele que você usa para pesquisar coisas.' },
      { faca: `Vá para ${ENDERECOS.plataforma}`, link: `https://${ENDERECOS.plataforma}` },
      { faca: 'Toque em Entrar', detalhe: 'Costuma ficar no canto de cima da tela, perto do seu nome ou de um bonequinho.' },
      { faca: 'Digite seu e-mail no campo E-mail e confirme' },
      { faca: 'Abra seu e-mail em outra aba', detalhe: 'Vai ter chegado uma mensagem com 6 números. Se não chegou em 2 minutos, olhe na caixa de spam ou lixo eletrônico.' },
      { faca: 'Volte e digite esses 6 números no campo Código de Verificação' },
    ],
    caixas: [{
      tom: 'dica',
      titulo: 'Faça isso uma vez só',
      linhas: [
        'Depois de entrar, salve o site na tela inicial do celular.',
        'No Chrome: toque nos três pontinhos ⋮ e escolha Adicionar à tela inicial.',
        'No iPhone: toque no quadradinho com a seta para cima e escolha Adicionar à Tela de Início.',
        'Vai virar um ícone igual a um aplicativo. Nunca mais precisa digitar o endereço.',
      ],
    }],
  },
  {
    n: 2,
    id: 'achar-metodo',
    titulo: 'Achar o Método',
    resumo: 'O X-GAME acontece dentro do Método. É lá que ficam suas tarefas do dia.',
    passos: [
      { faca: 'O caminho curto', detalhe: `Este endereço abre o Método direto. Guarde nos favoritos: ${ENDERECOS.metodo}`, link: `https://${ENDERECOS.metodo}` },
      { faca: `O caminho pelo menu: abra ${ENDERECOS.licensing}`, detalhe: 'Procure o menu de seções e escolha a família Top College — é a parte que forma. A outra, Loja & Vendas, é a parte que vende.' },
      { faca: 'Dentro de Top College, toque em O Método' },
    ],
    caixas: [{
      tom: 'mapa',
      titulo: 'O que tem dentro de Top College',
      linhas: [
        'O Método — seus 8 Hábitos e as tarefas do dia. É onde você vai ficar.',
        'Mentalidade — o encontro de segunda-feira.',
        'Time — as pessoas do seu time.',
        'ADM X-Game — administração. É do gestor, não é para você.',
        'Carreira — seus níveis e sua evolução.',
        'Como jogar — esta página, sempre que precisar.',
      ],
    }],
  },
  {
    n: 3,
    id: 'habitos',
    titulo: 'Os 8 Hábitos, em uma frase cada',
    resumo: 'O Método é organizado em 8 Hábitos. Eles aparecem como 8 botões. Você vai usar o Hábito 2 todo dia — os outros, conforme a etapa.',
    habitos: true,
    caixas: [{
      tom: 'dica',
      titulo: 'Se você só tem 5 minutos',
      linhas: ['Vá no Hábito 2 — Compromisso. É a sua rotina do dia, e é dela que sai toda a sua pontuação.'],
    }],
  },
  {
    n: 4,
    id: 'cores',
    titulo: 'Sua rotina do dia, e as cores',
    resumo: 'No Hábito 2 você vê a lista de tarefas de hoje, cada uma com um horário. O sistema pinta cada tarefa de uma cor, conforme a hora do relógio.',
    cores: true,
    caixas: [
      {
        tom: 'mapa',
        titulo: 'Como o sistema decide a cor',
        linhas: [
          'A "hora" de uma tarefa vai do horário dela até o horário da próxima tarefa. Dentro dessa janela ela está AGORA.',
          'Passou uma janela, vira ATRASADO. Passou duas ou mais, vira PERDIDO.',
        ],
      },
      {
        tom: 'atencao',
        titulo: 'O que ninguém conta no primeiro dia',
        linhas: [
          `Sua nota do dia não começa em zero e sobe. Ela começa em ${br(MVM_MAX)} e cai sozinha a cada tarefa que passa da hora sem ser marcada.`,
          `Se você tem 5 tarefas no dia, cada tarefa esquecida tira ${br(MVM_MAX / 5)} (${br(MVM_MAX)} dividido por 5). Não é castigo: é o relógio andando.`,
          'Por isso a frase que aparece no sistema: ANTECIPAÇÃO É PODER. E a outra, do outro lado: REAÇÃO É FRACASSO.',
        ],
      },
    ],
  },
  {
    n: 5,
    id: 'comprovar',
    titulo: 'Marcar a tarefa e comprovar',
    resumo: 'Marcar é um toque. Algumas tarefas pedem uma foto como prova.',
    passos: [
      { faca: 'Fez a tarefa? Volte no Hábito 2 e toque nela' },
      { faca: 'Confirme que está feita', detalhe: 'A tarefa muda de cor e fica FEITO.' },
      { faca: 'Se aparecer a tela Comprovar pra concluir, o sistema quer uma foto', detalhe: 'Exemplo: na tarefa de leitura, ele pede a foto da página ou da sua anotação.' },
      { faca: 'Mande a foto de um dos três jeitos', detalhe: 'Tirar foto agora abre a câmera · Subir o print pega da galeria · ou cole um print copiado.' },
    ],
    caixas: [
      {
        tom: 'mapa',
        titulo: 'Como tirar print no celular',
        linhas: [
          'Android: segure o botão de diminuir volume e o de ligar ao mesmo tempo.',
          'iPhone: aperte o botão lateral e o de aumentar volume ao mesmo tempo.',
          'A imagem vai para a galeria. Depois é só escolher em Subir o print.',
        ],
      },
      {
        tom: 'atencao',
        titulo: 'Na tarefa de estudo, além da foto vai um resumo escrito',
        linhas: [
          `São no mínimo ${RESUMO_MIN} caracteres — umas 6 linhas — escritos com as SUAS palavras.`,
          `${RESUMO_MIN} é o mínimo, não o limite: quanto maior, melhor. O contador na tela diz quantas letras ainda faltam.`,
          'Colar é bloqueado de propósito. Digitar faz parte do treino — é o que fixa o que você leu.',
        ],
      },
      {
        tom: 'atencao',
        titulo: 'Marque na hora, não no fim do dia',
        linhas: [
          'Marcar tudo às 22h faz o sistema contar todas como atrasadas. Você fez o trabalho e perdeu ponto por causa do registro.',
          'Marque assim que terminar. Leva 3 segundos.',
        ],
      },
    ],
  },
  {
    n: 6,
    id: 'pontuacao',
    titulo: 'Entender sua pontuação',
    resumo: 'São quatro números. Parecem muitos, mas cada um responde uma pergunta simples.',
    numeros: [
      { nome: 'MvM do Dia', pergunta: 'como foi hoje?', explica: `Começa em ${br(MVM_MAX)} e cai a cada tarefa que passa da hora sem marcar. É a nota de hoje, só de hoje.` },
      { nome: 'Aplicabilidade', pergunta: 'como foi o mês?', explica: `É a sua constância no ciclo: a média dos dias que já passaram. Vale no máximo ${br(APLICABILIDADE_MAX)}. Um dia ruim não derruba; uma semana de descuido derruba.` },
      { nome: 'Human Token', pergunta: 'quanto vale o seu dia', explica: `É MvM + Aplicabilidade, no máximo ${br(TOKEN_MAX)}. É a moeda do jogo, e ela tem faixas.`, faixas: true },
      { nome: 'Cotação do dia', pergunta: 'por que hoje vale mais que amanhã', explica: `O ciclo tem ${CICLO_DIAS_UTEIS} dias úteis e começa no primeiro dia útil do mês. A cotação começa em ${br(COTACAO_DIA_1)} no dia 1 e cai 1 centavo por dia útil, até parar em ${br(COTACAO_ULTIMO)}.` },
    ],
    caixas: [
      {
        tom: 'atencao',
        titulo: 'A trava do estudo',
        linhas: [
          `Se você não mantém constância na tarefa de leitura, seu token trava em ${br(TRAVA_SEM_ESTUDO)} — um centésimo abaixo do ouro. De propósito.`,
          'Você pode fazer tudo o resto perfeito e mesmo assim não chegar ao ouro. Sem estudo, não tem ouro.',
        ],
      },
      {
        tom: 'dica',
        titulo: 'Os pontos, enfim',
        linhas: [
          '10 pontos por tarefa feita.',
          '+5 pontos se você marcou dentro do horário dela.',
          'Tudo isso multiplicado pela cotação do dia.',
          `Ou seja: a mesma tarefa, feita na hora no dia 1, vale ${Math.round(15 * COTACAO_DIA_1)} pontos. Feita atrasada no dia 21, vale ${Math.round(10 * cotacaoDoDia(21))}. Quase o dobro de diferença, pelo mesmo trabalho.`,
        ],
      },
    ],
  },
  {
    n: 7,
    id: 'ranking',
    titulo: 'Ver o ranking',
    resumo: `Existe uma tela só do placar: ${ENDERECOS.placar}`,
    link: `https://${ENDERECOS.placar}`,
    caixas: [
      {
        tom: 'mapa',
        titulo: 'O que você vê lá',
        linhas: [
          'Master Task — tempo real: suas tarefas de hoje com a cor de cada uma.',
          'Progresso do dia: seu MvM, sua Aplicabilidade e o Human Token do dia.',
          'E o ranking do ciclo: os 10 primeiros do time, por pontos.',
          'Essa tela é só de olhar. Marcar tarefa continua sendo no Método, no Hábito 2.',
        ],
      },
      {
        tom: 'atencao',
        titulo: 'Se aparecer "Entre na sua conta pra jogar o X-GAME"',
        linhas: ['Significa que você não está logado. Volte para a Aula 1 e entre de novo.'],
      },
    ],
  },
  {
    n: 8,
    id: 'primeiro-dia',
    titulo: 'Mãos na prática: seu primeiro dia',
    resumo: 'Faça exatamente isto amanhã. Vá marcando conforme cumprir — a página guarda no seu celular.',
    checklist: [
      'Ao acordar — abra o ícone na tela inicial e olhe suas tarefas do dia. Só olhe. Saiba o que te espera.',
      'Na primeira tarefa — faça e marque na hora. Sinta a cor mudar para FEITO.',
      'Se pedir foto — tire na hora, com a tarefa na frente. Não deixe para depois.',
      'No meio do dia — abra e veja seu MvM. Se caiu, você já sabe qual tarefa passou da hora.',
      'Antes de dormir — abra o X-GAME e olhe o Human Token do dia. Anote o número num papel.',
      'No dia seguinte — compare. É o único número que importa: o de ontem contra o de hoje.',
    ],
    caixas: [{
      tom: 'dica',
      titulo: 'A meta da primeira semana',
      linhas: [
        'Não é ficar em primeiro no ranking. É marcar todas as tarefas no mesmo dia em que fez, por 5 dias seguidos. Só isso.',
        'Quem faz isso chega no prata sem esforço. O ouro vem depois, com o estudo em dia.',
      ],
    }],
  },
];

export const PERGUNTAS = [
  { p: 'Esqueci de marcar ontem. Perdi tudo?', r: `Não. Você perdeu os pontos daquele dia, mas o ciclo tem ${CICLO_DIAS_UTEIS} dias. A Aplicabilidade é média — um dia ruim entre vinte bons quase não aparece.` },
  { p: 'Preciso de computador?', r: 'Não. Tudo funciona no celular. A maioria das pessoas do time usa só o celular.' },
  { p: 'Fiz a tarefa mas esqueci de tirar a foto. E agora?', r: 'Fale com seu gestor. Sem a comprovação a tarefa não fecha sozinha — ela cai na análise dele.' },
  { p: 'O botão de concluir não acende, mesmo com tudo preenchido.', r: `Na tarefa de estudo o botão só libera com a foto E o resumo de no mínimo ${RESUMO_MIN} caracteres. Olhe embaixo do botão: ele diz o que ainda falta. E o contador em cima diz quantas letras faltam.` },
  { p: `Por que meu token não passa de ${br(TRAVA_SEM_ESTUDO)}?`, r: 'É a trava do estudo. Sem constância na tarefa de leitura, o sistema segura você um centésimo abaixo do ouro. Retome a leitura e ela destrava.' },
  { p: 'Quando começa um ciclo novo?', r: `No primeiro dia útil de cada mês. Ele dura ${CICLO_DIAS_UTEIS} dias úteis. Sábado e domingo não contam.` },
  { p: 'Fim de semana conta?', r: 'Não. O ciclo só anda em dia útil.' },
  { p: 'Não achei o menu Top College.', r: `Use o caminho curto: abra ${ENDERECOS.metodo}. Vai direto para o Método.` },
  { p: 'A tela ficou branca ou travou.', r: 'Puxe a tela para baixo para recarregar. Se continuar, feche o navegador e abra de novo. Se persistir, use o Tira Dúvidas aqui em cima e mande um print.' },
];

export const DICIONARIO = [
  { palavra: 'Aba', significa: 'Cada seção da tela, como as divisórias de um caderno. Você troca de aba tocando no nome dela.' },
  { palavra: 'Aplicabilidade', significa: `Sua constância no ciclo. Vale até ${br(APLICABILIDADE_MAX)}.` },
  { palavra: 'Ciclo', significa: `O período do jogo: ${CICLO_DIAS_UTEIS} dias úteis, começando no primeiro dia útil do mês.` },
  { palavra: 'Comprovação', significa: 'A foto que prova que você fez a tarefa.' },
  { palavra: 'Cotação', significa: `Quanto o dia de hoje vale. Começa em ${br(COTACAO_DIA_1)} e cai até ${br(COTACAO_ULTIMO)}.` },
  { palavra: 'Human Token', significa: `A moeda do jogo. MvM + Aplicabilidade, no máximo ${br(TOKEN_MAX)}.` },
  { palavra: 'Master Task', significa: 'A lista das suas tarefas do dia.' },
  { palavra: 'MvM do Dia', significa: `Sua nota de hoje. Começa em ${br(MVM_MAX)} e cai sozinha.` },
  { palavra: 'Print', significa: 'Uma foto da própria tela do celular.' },
  { palavra: 'Ranking', significa: 'A lista das pessoas do time por pontos no ciclo.' },
  { palavra: 'Ritual do Amanhecer', significa: 'A rotina da manhã, com música e o quadro dos sonhos.' },
];

export const FRASES_DO_RODAPE = 'ANTECIPAÇÃO É PODER · REAÇÃO É FRACASSO · BUSQUE O REAL TIME';

/** Quantas aulas a pessoa já marcou como lida — é o que a barra do topo mostra. */
export function progressoDasAulas(lidas = []) {
  const total = AULAS.length;
  const feitas = AULAS.filter((a) => lidas.includes(a.id)).length;
  return { feitas, total, pct: total ? Math.round((feitas / total) * 100) : 0 };
}
