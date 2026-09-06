// 🤖 O ASSISTENTE DA LISTA — a pessoa escreve menos, e a mesa nasce pronta.
//
// DE ONDE VEIO (dono, 06/09/2026): "quando eu abrir um quadro novo e escrever
// Academia, ele traz um espaço pra ela colocar o peso, botar uma foto, tipo um
// analisador mesmo. Fazer a entrevista: perguntar se ela quer perder peso,
// ganhar — e já gerar uma rotina de treino pra ela, segunda, terça, quarta…
// E ela podendo organizar. Sempre ajudando ela a organizar o dia pra escrever
// menos, e cada vez mais ficar viciada na plataforma."
//
// ── AS TRÊS DECISÕES DESTE ARQUIVO ──────────────────────────────────────────
//
// 1. O ASSISTENTE É RECONHECIDO PELO NOME DA LISTA, E É SEMPRE UM CONVITE.
//    Escreveu "Academia" e aparece "montar com o assistente" — nunca um modal
//    que abre sozinho por cima do que a pessoa estava fazendo. Ferramenta que
//    interrompe vira ferramenta que a pessoa aprende a fechar rápido.
//
// 2. A ENTREVISTA É CURTA E TODA PERGUNTA MUDA O RESULTADO. Três perguntas
//    obrigatórias (objetivo, dias por semana, nível) porque cada uma troca o
//    treino gerado. Peso e foto são OPCIONAIS: são o acompanhamento, não o
//    plano — pedir dado que não muda nada é o jeito mais rápido de a pessoa
//    desistir no meio.
//
// 3. O QUE SAI É CARD NORMAL, não um formato especial. Cada dia de treino é um
//    card com checklist de exercícios — os mesmos cards que ela arrasta, edita,
//    manda pro dia. Se o assistente gerasse um objeto próprio, metade das
//    funções do quadro não valeria pra ele.

/** Um assistente por contexto. Acrescentar outro é uma entrada aqui. */
export const ASSISTENTES = [
  {
    id: 'academia',
    quando: /academia|treino|malha|muscula[çc][ãa]o|fitness|shape/i,
    titulo: 'Montar a sua rotina de treino',
    convite: 'Responde três coisas e eu monto a semana inteira',
    perguntas: [
      {
        id: 'objetivo', rotulo: 'O que você quer?', tipo: 'escolha',
        opcoes: [
          { valor: 'perder', rotulo: 'Perder peso' },
          { valor: 'ganhar', rotulo: 'Ganhar massa' },
          { valor: 'condicionar', rotulo: 'Condicionamento' },
        ],
      },
      {
        id: 'dias', rotulo: 'Quantos dias por semana?', tipo: 'escolha',
        opcoes: [
          { valor: 3, rotulo: '3 dias' },
          { valor: 4, rotulo: '4 dias' },
          { valor: 5, rotulo: '5 dias' },
          { valor: 6, rotulo: '6 dias' },
        ],
      },
      {
        id: 'nivel', rotulo: 'Como você está hoje?', tipo: 'escolha',
        opcoes: [
          { valor: 'comecando', rotulo: 'Começando agora' },
          { valor: 'treinando', rotulo: 'Já treino' },
        ],
      },
      { id: 'peso', rotulo: 'Seu peso hoje (kg)', tipo: 'numero', opcional: true, ajuda: 'só pra acompanhar a evolução' },
      { id: 'foto', rotulo: 'Foto de hoje', tipo: 'foto', opcional: true, ajuda: 'o antes, pra comparar depois' },
    ],
  },
];

export function assistenteDaLista(nome) {
  return ASSISTENTES.find((a) => a.quando.test(String(nome || ''))) || null;
}

export function assistentePorId(id) {
  return ASSISTENTES.find((a) => a.id === id) || null;
}

/** As obrigatórias que ainda não foram respondidas. Vazio = dá pra gerar. */
export function faltaResponder(assistente, respostas = {}) {
  if (!assistente) return [];
  return assistente.perguntas
    .filter((p) => !p.opcional && (respostas[p.id] === undefined || respostas[p.id] === null || respostas[p.id] === ''))
    .map((p) => p.id);
}

// ── O TREINO ────────────────────────────────────────────────────────────────
// As divisões são as clássicas de academia, e a escolha entre elas é o número
// de dias — não o objetivo. Objetivo muda o QUE se faz dentro do dia (carga,
// repetição, cardio); divisão muda COMO a semana é repartida. Misturar os dois
// é o erro que gera "treino de perna" em quem pediu 3 dias de corpo inteiro.
const DIVISOES = {
  3: [
    ['Corpo inteiro A', ['Agachamento', 'Supino reto', 'Remada curvada', 'Desenvolvimento de ombro', 'Prancha']],
    ['Corpo inteiro B', ['Levantamento terra', 'Puxada alta', 'Leg press', 'Elevação lateral', 'Abdominal']],
    ['Corpo inteiro C', ['Afundo', 'Supino inclinado', 'Remada baixa', 'Rosca direta', 'Tríceps corda']],
  ],
  4: [
    ['Superior A', ['Supino reto', 'Remada curvada', 'Desenvolvimento', 'Rosca direta', 'Tríceps testa']],
    ['Inferior A', ['Agachamento livre', 'Leg press', 'Cadeira extensora', 'Panturrilha', 'Prancha']],
    ['Superior B', ['Supino inclinado', 'Puxada alta', 'Elevação lateral', 'Rosca martelo', 'Tríceps corda']],
    ['Inferior B', ['Levantamento terra', 'Afundo', 'Mesa flexora', 'Elevação pélvica', 'Abdominal']],
  ],
  5: [
    ['Peito e tríceps', ['Supino reto', 'Supino inclinado', 'Crucifixo', 'Tríceps testa', 'Tríceps corda']],
    ['Costas e bíceps', ['Puxada alta', 'Remada curvada', 'Remada baixa', 'Rosca direta', 'Rosca martelo']],
    ['Pernas', ['Agachamento livre', 'Leg press', 'Cadeira extensora', 'Mesa flexora', 'Panturrilha']],
    ['Ombro e abdômen', ['Desenvolvimento', 'Elevação lateral', 'Elevação frontal', 'Prancha', 'Abdominal infra']],
    ['Posterior e core', ['Levantamento terra', 'Elevação pélvica', 'Cadeira flexora', 'Prancha lateral', 'Abdominal']],
  ],
  6: [
    ['Empurrar A', ['Supino reto', 'Desenvolvimento', 'Crucifixo', 'Tríceps corda']],
    ['Puxar A', ['Puxada alta', 'Remada curvada', 'Rosca direta', 'Face pull']],
    ['Pernas A', ['Agachamento livre', 'Leg press', 'Cadeira extensora', 'Panturrilha']],
    ['Empurrar B', ['Supino inclinado', 'Elevação lateral', 'Paralelas', 'Tríceps testa']],
    ['Puxar B', ['Barra fixa', 'Remada baixa', 'Rosca martelo', 'Encolhimento']],
    ['Pernas B', ['Levantamento terra', 'Afundo', 'Mesa flexora', 'Elevação pélvica']],
  ],
};

/** Os dias da semana que recebem treino, pra N dias — descanso bem espalhado. */
const DIAS_DA_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const ESCALA = {
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
};

/** O que o objetivo acrescenta no fim de cada treino. */
const FECHO = {
  perder: '20 min de esteira ou bike (moderado)',
  condicionar: '10 min de circuito no fim',
  ganhar: null,
};

const SERIES = {
  comecando: { perder: '3x12', ganhar: '3x10', condicionar: '3x15' },
  treinando: { perder: '4x12', ganhar: '4x8', condicionar: '4x15' },
};

/**
 * A entrevista respondida vira CARDS (um por dia de treino) e FICHA (o
 * acompanhamento). Nada de rede aqui: quem grava é a tela.
 * Devolve `null` quando falta responder alguma obrigatória.
 */
export function gerarDaEntrevista(assistenteId, respostas = {}) {
  const a = assistentePorId(assistenteId);
  if (!a || faltaResponder(a, respostas).length) return null;
  if (a.id !== 'academia') return null;

  const dias = Number(respostas.dias) || 3;
  const objetivo = String(respostas.objetivo || 'condicionar');
  const nivel = String(respostas.nivel || 'comecando');
  const divisao = DIVISOES[dias] || DIVISOES[3];
  const escala = ESCALA[dias] || ESCALA[3];
  const serie = (SERIES[nivel] || SERIES.comecando)[objetivo] || '3x12';
  const fecho = FECHO[objetivo];

  const cards = divisao.map(([nome, exercicios], i) => ({
    titulo: `${DIAS_DA_SEMANA[escala[i]]} — ${nome}`,
    // cada exercício já vem com a série: é o que faz a pessoa não ter que
    // escrever nada e ainda assim saber o que fazer na máquina
    checklist: [
      ...exercicios.map((e) => ({ texto: `${e} — ${serie}`, feito: false })),
      ...(fecho ? [{ texto: fecho, feito: false }] : []),
    ],
  }));

  return {
    cards,
    ficha: {
      assistente: a.id,
      objetivo,
      dias,
      nivel,
      serie,
      peso_inicial: respostas.peso ? Number(respostas.peso) : null,
      foto_url: respostas.foto || null,
    },
  };
}

/** O resumo da ficha, pro cabeçalho da lista. '' quando não há ficha. */
export function resumoDaFicha(ficha) {
  if (!ficha || !ficha.assistente) return '';
  if (ficha.assistente !== 'academia') return '';
  const alvo = { perder: 'perder peso', ganhar: 'ganhar massa', condicionar: 'condicionamento' }[ficha.objetivo] || '';
  const partes = [alvo, `${ficha.dias}x na semana`, ficha.serie];
  if (ficha.peso_inicial) partes.push(`${ficha.peso_inicial} kg`);
  return partes.filter(Boolean).join(' · ');
}
