// 🏛️ AS AGENDAS DA CASA — o catálogo de mentorias, treinamentos, eventos e
// reuniões de área que a empresa já tem, pronto pra ser marcado.
//
// DE ONDE VEIO (dono, 06/09/2026, com print do agendador aberto): "aqui
// inserir as agendas e mentorias da empresa: Mentalidade do Executivo,
// Onboarding, Mentalidade do Diretor, Mentalidade do CEO, Eventos Top College,
// Treinamento X-eos, entre outros que você pode inserir de marcado, reunião
// com o Marketing, reunião com Financeiro — tudo como funciona o mercado."
//
// ── AS TRÊS DECISÕES DESTE ARQUIVO ──────────────────────────────────────────
//
// 1. AGENDA DA EMPRESA NÃO É CONTATO, E ISSO MUDA ONDE ELA É GRAVADA.
//    O agendador de hoje pergunta "com quem é a reunião?" e grava em
//    `customers.contatos_metodo` — o histórico DAQUELA pessoa. Mentoria não
//    tem uma pessoa do outro lado: tem a casa inteira. Por isso agenda da
//    empresa vai pra `reunioes_empresa` (a tabela da DIR-52), e não vira
//    registro de contato de ninguém. Forçá-la no contato encheria o histórico
//    de um coitado com a agenda da empresa toda.
//
// 2. O CATÁLOGO É CÓDIGO, NÃO TABELA. A grade da casa muda com o negócio
//    ("a partir de janeiro a Mentalidade do CEO é quinta"), e é uma decisão
//    de gente, não um dado que os usuários criam. Uma lista aqui é uma linha
//    de diff revisável; uma tabela de catálogo seria uma migração, uma tela de
//    cadastro e uma chance a mais de alguém digitar "Mentalidad" errado.
//
// 3. CADA AGENDA CARREGA A CADÊNCIA DO MERCADO, E ELA É SUGESTÃO.
//    "Como funciona o mercado" é uma grade que já existe: mentoria de noite,
//    reunião de área de manhã, evento no sábado. O catálogo traz isso pronto
//    pra pessoa CONFIRMAR em vez de decidir do zero — mas tudo é editável na
//    tela. Sugestão que não dá pra mudar vira camisa de força.

/** Famílias — só pra agrupar e dar cara na lista. */
export const FAMILIAS_AGENDA = [
  { id: 'mentoria', label: 'Mentorias', emoji: '🎓' },
  { id: 'treinamento', label: 'Treinamentos', emoji: '🛠️' },
  { id: 'evento', label: 'Eventos', emoji: '🎤' },
  { id: 'gestao', label: 'Reuniões de gestão', emoji: '📊' },
];

// `origem` diz quem inventou cada linha: 'dono' são as que ele ditou; 'proposta'
// são as que eu acrescentei sob o "entre outros que você pode inserir". Ficam
// marcadas pra ele poder cortar as minhas sem ter que lembrar quais eram.
//
// `publico`: 'todos' aparece pra empresa inteira; 'diretoria' só pra quem tem
// visão total. `dia_semana`: 0=domingo … 6=sábado.
export const AGENDAS_EMPRESA = [
  // ── ditadas pelo dono ─────────────────────────────────────────────────────
  {
    id: 'mentalidade-executivo', nome: 'Mentalidade do Executivo', familia: 'mentoria',
    publico: 'todos', origem: 'dono', trilha: 'executivo', habitos: [1, 2, 3, 4, 5],
    dia_semana: 2, hora: '19:30', duracao_min: 90,
    descricao: 'A mentoria de quem está fazendo: do Sonho à Apresentação de Sucesso.',
  },
  {
    id: 'onboarding', nome: 'Onboarding', familia: 'mentoria',
    publico: 'todos', origem: 'dono', habitos: [1, 2],
    dia_semana: 3, hora: '19:00', duracao_min: 60,
    descricao: 'A primeira semana de quem chegou: como a casa funciona e o que fazer amanhã.',
  },
  {
    id: 'mentalidade-diretor', nome: 'Mentalidade do Diretor', familia: 'mentoria',
    publico: 'diretoria', origem: 'dono', trilha: 'diretor', habitos: [5, 6, 7, 8],
    dia_semana: 1, hora: '19:30', duracao_min: 90,
    descricao: 'Multiplicar e medir: acompanhamento, verificação e duplicação.',
  },
  {
    id: 'mentalidade-ceo', nome: 'Mentalidade do CEO', familia: 'mentoria',
    publico: 'diretoria', origem: 'dono', trilha: 'ceo', habitos: [5, 6, 7, 8],
    dia_semana: 1, hora: '21:00', duracao_min: 90,
    descricao: 'Construir o sistema: a operação que roda sem você na sala.',
  },
  {
    id: 'eventos-topcollege', nome: 'Eventos Top College', familia: 'evento',
    publico: 'todos', origem: 'dono',
    dia_semana: 6, hora: '09:00', duracao_min: 240,
    descricao: 'Os encontros presenciais da academia — dia inteiro de formação.',
  },
  {
    id: 'treinamento-xeos', nome: 'Treinamento X-eos', familia: 'treinamento',
    publico: 'todos', origem: 'dono',
    dia_semana: 4, hora: '20:00', duracao_min: 60,
    descricao: 'A ferramenta na prática: o sistema que sustenta a operação.',
  },
  {
    id: 'reuniao-marketing', nome: 'Reunião com Marketing', familia: 'gestao',
    publico: 'diretoria', origem: 'dono',
    dia_semana: 3, hora: '10:00', duracao_min: 60,
    descricao: 'Campanha, material e o que a rua está pedindo.',
  },
  {
    id: 'reuniao-financeiro', nome: 'Reunião com Financeiro', familia: 'gestao',
    publico: 'diretoria', origem: 'dono',
    dia_semana: 4, hora: '10:00', duracao_min: 60,
    descricao: 'Caixa, comissões e o que fecha o mês.',
  },

  // ── propostas minhas, sob o "entre outros que você pode inserir" ───────────
  {
    id: 'reuniao-oportunidade', nome: 'Reunião de Oportunidade', familia: 'evento',
    publico: 'todos', origem: 'proposta', habitos: [4],
    dia_semana: 2, hora: '20:00', duracao_min: 60,
    descricao: 'Onde o convidado vê o negócio pela primeira vez — é pra cá que o Hábito 4 convida.',
  },
  {
    id: 'treinamento-produto', nome: 'Treinamento de Produto', familia: 'treinamento',
    publico: 'todos', origem: 'proposta', habitos: [3],
    dia_semana: 5, hora: '20:00', duracao_min: 60,
    descricao: 'O que a gente vende, por dentro: quem não sabe o produto não apresenta.',
  },
  {
    id: 'reuniao-lideranca', nome: 'Reunião de Liderança', familia: 'gestao',
    publico: 'diretoria', origem: 'proposta', xperformance: true,
    dia_semana: 1, hora: '09:00', duracao_min: 60,
    descricao: 'A segunda-feira da diretoria. A pauta dela é o documento do X-Performance.',
  },
  {
    id: 'fechamento-do-mes', nome: 'Fechamento do Mês', familia: 'gestao',
    publico: 'todos', origem: 'proposta', habitos: [7],
    dia_semana: 1, hora: '19:00', duracao_min: 90,
    descricao: 'Os números batidos e o que fica combinado pro mês que vem.',
  },
];

export function agendaPorId(id) {
  return AGENDAS_EMPRESA.find((a) => a.id === id) || null;
}

/**
 * 🔒 Quem enxerga o quê. `diretoria` é, hoje, quem tem visão total — a mesma
 * régua de quem já podia cadastrar reunião pra empresa inteira. Não inventei
 * um segundo modelo de permissão só pra esta lista.
 */
export function podeVerAgenda(item, { visaoTotal = false } = {}) {
  return String(item?.publico || 'todos') !== 'diretoria' || !!visaoTotal;
}

/** O catálogo já filtrado, agrupado por família na ordem de FAMILIAS_AGENDA. */
export function agendasVisiveis({ visaoTotal = false } = {}) {
  return FAMILIAS_AGENDA
    .map((f) => ({ ...f, itens: AGENDAS_EMPRESA.filter((a) => a.familia === f.id && podeVerAgenda(a, { visaoTotal })) }))
    .filter((f) => f.itens.length > 0);
}

/**
 * A agenda escolhida vira LINHA de `reunioes_empresa` — o mesmo formato que o
 * bloco 🏛️ da gestão já grava. Nada de tabela nova: mesma verdade, num lugar só.
 *
 * `recorrencia` 'semana' guarda o dia da semana e ignora a data; 'data' faz o
 * contrário. Guardar os dois seria deixar o banco decidir depois qual vale —
 * e ele escolheria errado metade das vezes.
 */
export function linhaDaAgenda(agenda, {
  recorrencia = 'semana', dia_semana, data, hora, duracao_min, detalhes,
  criadoPorId = null, criadoPorNome = '',
} = {}) {
  if (!agenda) return null;
  const porSemana = recorrencia !== 'data';
  const dia = Number(dia_semana ?? agenda.dia_semana);
  return {
    titulo: agenda.nome,
    agenda_id: agenda.id,
    dia_semana: porSemana && Number.isFinite(dia) ? dia : null,
    data: porSemana ? null : (String(data || '').slice(0, 10) || null),
    hora: hora || agenda.hora,
    duracao_min: Number(duracao_min) > 0 ? Number(duracao_min) : agenda.duracao_min,
    publico: agenda.publico || 'todos',
    detalhes: (detalhes || '').trim() || agenda.descricao || null,
    ativo: true,
    criado_por_id: criadoPorId,
    criado_por_nome: criadoPorNome || '',
  };
}
