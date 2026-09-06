// 🗂️ O NOSSO QUADRO — a mesa de trabalho dentro do Compromisso (Hábito 2).
//
// DE ONDE VEIO (dono, 06/09/2026): "a gente precisa de um ambiente dentro da
// organização que lembre um Trello, só que mais fluido... e a gente fazer o
// nosso Trello, o nosso, ALI" — no Compromisso, junto do dia. É o ambiente da
// tarefa das 10:30: "prioridades, Master Task, pipeline, contratos, reuniões".
//
// ── AS TRÊS DECISÕES DESTE ARQUIVO ──────────────────────────────────────────
//
// 1. AS COLUNAS SÃO HORIZONTES, NÃO ETAPAS. Um quadro de etapas (a fazer →
//    fazendo → feito) obriga a mover a mesma coisa três vezes e não responde a
//    pergunta que a pessoa faz de manhã, que é "o que é pra HOJE?". Horizonte
//    responde. É também o vocabulário que a casa já usa no Quadro dos Sonhos
//    (curto/médio/longo) — duas gramáticas diferentes no mesmo app cansa.
//
// 2. MOVER É LIVRE, E ISSO É O "MAIS FLUIDO". No quadro da diretoria existe
//    trava (nada chega em Entregue sem revisão) porque lá o card vira PONTO e
//    dinheiro. Aqui não vira nada: é a mesa de uma pessoa só. Trava numa mesa
//    pessoal é burocracia sem beneficiário.
//
// 3. O CARTÃO VIRA TAREFA DO DIA — UMA VEZ. É a frase do dono ("já vai entrar
//    na minha reunião do dia"). Uma vez, e não a cada clique: o cartão guarda
//    que já virou. Sem isso, dois toques enchem o dia de tarefa repetida — e
//    tarefa repetida no X-Pay divide o dinheiro do dia por um número inflado.

export const COLUNAS_QUADRO = [
  { id: 'hoje', nome: 'Hoje', ajuda: 'o que não passa de hoje' },
  { id: 'semana', nome: 'Esta semana', ajuda: 'tem data, mas não é agora' },
  { id: 'depois', nome: 'Depois', ajuda: 'importante, e não urgente — fica visível pra não virar esquecimento' },
  { id: 'feito', nome: 'Feito', ajuda: 'saiu da mesa' },
];

export const ORDEM_QUADRO = COLUNAS_QUADRO.map((c) => c.id);

/** Coluna existe? Mover é livre entre as que existem — ver decisão 2. */
export function podeMoverCartao(para) {
  return ORDEM_QUADRO.includes(para);
}

/** Move sem mutar. Devolve a MESMA lista quando o destino não existe. */
export function moverCartao(lista, id, para) {
  const arr = Array.isArray(lista) ? lista : [];
  if (!podeMoverCartao(para)) return arr;
  const alvo = arr.find((c) => c.id === id);
  if (!alvo || alvo.coluna === para) return arr;
  return arr.map((c) => (c.id === id ? { ...c, coluna: para } : c));
}

/**
 * 🔗 O cartão vira tarefa do dia. Devolve a LINHA de metodo_tarefas pronta —
 * a gravação é da tela; aqui mora só a regra de o que vira o quê.
 * Devolve `null` quando o cartão já virou tarefa (ver decisão 3) ou não existe.
 */
export function tarefaDoCartao(cartao, { userId, dataISO, hora = null } = {}) {
  if (!cartao || !userId || !dataISO) return null;
  if (cartao.virou_tarefa_id) return null;
  return {
    user_id: userId,
    data: String(dataISO).slice(0, 10),
    hora: hora || null,
    titulo: String(cartao.titulo || '').trim(),
    detalhe: cartao.detalhe || null,
    feito: false,
  };
}

/**
 * O resumo da mesa, pro cabeçalho e pro relatório do Hábito 7.
 * `atrasados` olha o prazo contra a data que ENTRA POR PARÂMETRO — função que
 * lê o relógio sozinha vira teste que passa de manhã e falha de madrugada.
 */
export function resumoDoQuadro(cartoes = [], hojeISO) {
  const lista = Array.isArray(cartoes) ? cartoes : [];
  const hoje = String(hojeISO || '').slice(0, 10);
  const porColuna = ORDEM_QUADRO.reduce(
    (acc, c) => ({ ...acc, [c]: lista.filter((x) => x.coluna === c).length }), {},
  );
  const abertos = lista.filter((c) => c.coluna !== 'feito');
  return {
    porColuna,
    total: lista.length,
    abertos: abertos.length,
    atrasados: hoje ? abertos.filter((c) => c.prazo && String(c.prazo).slice(0, 10) < hoje).length : 0,
    viraramTarefa: lista.filter((c) => !!c.virou_tarefa_id).length,
  };
}
