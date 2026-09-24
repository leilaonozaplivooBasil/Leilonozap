// 🔄 O CICLO DO X-GAME — a explicação da gamificação, em seis passos
//
// Dono (24/09/2026): "eu preciso de uma página onde eu tenha esse quadro, os
// oito hábitos do sucesso e a visão executiva do X-Game, e uma explicação, em
// uma página da gamificação. Um desenho, pode ser — vou dar liberdade de ação
// para você."
//
// ⚠️ ISTO NÃO É ENFEITE, E POR ISSO MORA NUMA LIB.
// Cada passo aqui é um mecanismo que EXISTE no sistema, com o arquivo que o
// implementa anotado. Um desenho bonito que descreve um fluxo que o código não
// faz é pior que desenho nenhum: ensina errado, e ninguém descobre. Se algum
// dia um destes passos mudar de regra, o desenho mente — então ele fica aqui,
// ao lado das outras réguas, e não perdido dentro de um .jsx.
//
// A ordem fecha um CÍRCULO de propósito: o último passo devolve ao primeiro.
// É a coisa que a tela antiga nunca disse — as pessoas viam oito portas soltas
// e o X-Game como um placar à parte, sem entender que um alimenta o outro.

export const CICLO_DO_XGAME = Object.freeze([
  {
    id: 'sonho',
    n: 1,
    titulo: 'O sonho define o destino',
    texto: 'Sem clareza de destino, toda energia se dispersa. O Quadro dos Sonhos guarda o que você quer, com prazo e detalhe.',
    ondeMora: 'Hábito 01 — Sonho',
  },
  {
    id: 'rotina',
    n: 2,
    titulo: 'O compromisso vira rotina com horário',
    texto: 'O destino vira agenda: cada tarefa do dia tem uma hora marcada — e é a hora que decide se ela conta cheia, atrasada ou perdida.',
    ondeMora: 'Hábito 02 — Compromisso',
  },
  {
    id: 'comprovacao',
    n: 3,
    titulo: 'Cada entrega vira comprovação',
    texto: 'Foto, áudio ou vídeo na hora de fazer. Uma IA confere, e o que não dá pra cravar vira pergunta, não reprovação.',
    ondeMora: 'a câmera de cada tarefa',
  },
  {
    id: 'moeda',
    n: 4,
    titulo: 'A comprovação vira moeda',
    texto: 'Mentalidade e Valores, Produção, Real Time, Vendas e Estudo. Cada fatia tem peso — e o caráter tem piso: MvM baixo trava a subida.',
    ondeMora: 'a Moeda, no Hábito 07',
  },
  {
    id: 'posicao',
    n: 5,
    titulo: 'A moeda posiciona no time',
    texto: 'O ranking do dia e a Visão Executiva mostram onde você está, ao lado de quem faz o mesmo caminho.',
    ondeMora: 'Visão Executiva X-GAME',
  },
  {
    id: 'volta',
    n: 6,
    titulo: 'E a posição paga o sonho',
    texto: 'O que entra por causa do jogo é o que compra o que está no quadro. O círculo fecha, e recomeça amanhã.',
    ondeMora: 'de volta ao Hábito 01',
  },
]);

/** O passo seguinte, em roda — o sexto devolve ao primeiro. */
export function proximoPassoDoCiclo(id) {
  const i = CICLO_DO_XGAME.findIndex((p) => p.id === id);
  if (i < 0) return null;
  return CICLO_DO_XGAME[(i + 1) % CICLO_DO_XGAME.length];
}
