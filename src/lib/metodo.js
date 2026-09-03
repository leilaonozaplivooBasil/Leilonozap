// metodo — O MÉTODO VIVO (DIR-43, 01/09/2026): os 8 Hábitos do Sucesso como
// ferramenta, não como slide. Fonte única de: conteúdo dos hábitos, rotina
// padrão do Master Task (a rotina DITADA pelo dono, como exemplo editável),
// períodos do dia, geração do dia a partir da rotina, progresso e o link de
// agenda do Google (URL de template oficial — sem OAuth).

export const HABITOS = [
  { n: 1, id: 'sonho', titulo: 'SONHO', sub: 'Clareza de destino', texto: 'Sem clareza de destino, toda energia se dispersa. O sonho dá direção, foco e propósito — é o combustível do compromisso nos momentos difíceis.' },
  { n: 2, id: 'compromisso', titulo: 'COMPROMISSO', sub: 'Decisão diária', texto: 'Talento faz você começar na frente; disciplina faz você continuar. Todos os dias. Sem exceção. Sem negociação.' },
  { n: 3, id: 'lista', titulo: 'LISTA DE NETWORK', sub: 'O ambiente vence', texto: 'O ambiente ou te eleva ou te limita. Sua lista de network é um ativo estratégico — qualifique cada pessoa de 1 a 5 e trate a lista como patrimônio.' },
  { n: 4, id: 'contato', titulo: 'CONTATO E CONVITE', sub: 'Método F.O.R.M. + seu script', texto: 'Antes de apresentar, entenda a pessoa: Família, Ocupação, Recreação — e então a Mensagem certa. Cada um escreve o PRÓPRIO script e o aperfeiçoa a cada conversa.' },
  { n: 5, id: 'apresentacao', titulo: 'APRESENTAÇÃO DE SUCESSO', sub: 'Clareza e valor', texto: 'Conexão → FORM → Mensagem → Convite → Apresentação → Próximo Passo. Você não apresenta uma oportunidade — apresenta uma possibilidade. Meta do método: 3 reuniões por dia, de 45 a 60 minutos.' },
  { n: 6, id: 'acompanhamento', titulo: 'ACOMPANHAMENTO E FECHAMENTO', sub: 'PPV — Próximo Ponto de Venda', texto: 'Cada etapa precisa conduzir ao próximo ponto. Os dois pilares: DOR + CONFIANÇA. É o CRM: a fila do dia, os clientes e a esteira de captação.' },
  { n: 7, id: 'verificacao', titulo: 'VERIFICAÇÃO DO PROGRESSO', sub: 'Medir e corrigir', texto: 'O que não se mede, não se corrige: metas, reuniões do dia, win rate, objeções e PPV — a Visão Executiva.' },
  { n: 8, id: 'duplicacao', titulo: 'DUPLICAÇÃO DOS 8 HÁBITOS', sub: 'Ensinar e multiplicar', texto: 'Conhecimento é o que adquirimos; sabedoria é o que colocamos em prática. Ensine o método — o local de treinamento do time.' },
];

// ✅ Hábito 2 — A ROTINA PERFEITA v2 (corrigida pelo dono em 03/09/2026, DIR-45.1):
// 06:45 é TÉRMINO do treino; na chegada organiza-se o AMBIENTE (não o dia);
// 08:55 todos posicionados na sala — 09:00 é horário de COMEÇAR.
// Não é agenda de posts: é a rotina REAL virando narrativa diária nas redes.
// Cada item tem o `detalhe` (a linha do Master Task) e o `guia` (a orientação
// estratégica do dono pra aquele horário). É o modelo inicial: cada um edita a sua.
export const PRINCIPIO_ROTINA = {
  percepcoes: ['VIDA INTERESSANTE', 'PROVA SOCIAL', 'AUTORIDADE', 'CONFIANÇA', 'NEGÓCIO', 'VENDA'],
  regra: 'Primeiro seja interessante. Depois desperte interesse.',
  texto: 'A rotina tem duas funções ao mesmo tempo: construir disciplina e produtividade REAL, '
    + 'e transformar a vida real em prova social e autoridade. A pessoa não passa o dia tentando '
    + 'vender nas redes — os Stories são o acompanhamento natural da rotina, sem parecer publicidade.',
};

export const ROTINA_PADRAO = [
  { hora: '05:00', titulo: 'Acordar — gratidão e foco no sonho', detalhe: 'Primeiro pensamento do dia: POR QUE estou construindo isso?',
    guia: 'Momento rápido de gratidão, propósito, objetivo e foco no que precisa ser construído. Story extremamente natural: o horário, a janela, o café, o começo do dia, uma frase ou reflexão. Percepção gerada: propósito e disciplina.' },
  { hora: '05:15', titulo: 'Story ANTES da atividade física', detalhe: 'O primeiro capítulo do dia: "Estou começando." Sem vender, sem dar aula.',
    guia: 'O Story acontece ANTES do treino: colocando o tênis, saindo de casa, chegando à rua, a preparação, o horário. Não vender nada, não tentar dar aula. Objetivo: criar o primeiro capítulo da história daquele dia — "estou começando".' },
  { hora: '05:30', titulo: 'Início da corrida / atividade física + registro DURANTE', detalhe: 'Registro rápido no meio do treino: distância, relógio, esforço, paisagem.',
    guia: 'Começa efetivamente o treino. Durante, um registro rápido: corrida, caminhada, academia, distância, esforço. Por quê? Porque existe uma diferença enorme entre FALAR sobre disciplina e MOSTRAR disciplina acontecendo. É prova social — e ainda incentiva positivamente quem acompanha.' },
  { hora: '06:45', titulo: 'Término do treino + post', detalhe: 'Fecha a narrativa: PREPARAÇÃO → EXECUÇÃO → CONCLUSÃO. Curto e genuíno.',
    guia: 'Aqui TERMINA o treino — e fecha a história iniciada às 05:15. Registrar rápido: treino concluído, distância, tempo, resultado, sensação, aprendizado. Direções: "Não precisava estar com vontade. Precisava começar." · "Treino encerrado. Agora começa a segunda parte do dia." · "A disciplina de hoje facilita o resultado de amanhã." A pessoa não DIZ que é disciplinada — as pessoas ASSISTEM à disciplina acontecendo.' },
  { hora: '07:00', titulo: 'Leitura do dia — após o treino', detalhe: 'Mínimo 20 minutos. Procure UMA ideia que dê pra aplicar HOJE.',
    guia: 'Logo após o treino. Não é leitura pra cumprir tarefa: é procurar UMA IDEIA aplicável hoje. Pode marcar uma página, uma frase, uma anotação. Não precisa produzir conteúdo elaborado nesse momento.' },
  { hora: '08:00', titulo: 'Caminho pra empresa — Story espontâneo', detalhe: 'A transição VIDA PESSOAL → VIDA EMPRESARIAL. Achou algo interessante? Fala.',
    guia: 'No carro (com segurança), caminhando, no café: conteúdo espontâneo sobre o que inspirou de manhã — treino, leitura, comportamento, mercado, uma percepção. Regra: NÃO INVENTAR assunto pra postar. O objetivo é desenvolver uma pessoa com pensamentos, experiências e opiniões que valham a pena acompanhar.' },
  { hora: '08:30', titulo: 'Chegar à empresa — mostrar o ambiente', detalhe: 'Story rápido: prédio, porta, luzes, produtos, equipe chegando. Pode só música.',
    guia: 'O ambiente transforma discurso em PROVA DE REALIDADE: pessoa → empresa → equipe → estrutura → produtos → operação. A percepção deixa de ser "essa pessoa fala de negócios" e vira "existe uma empresa REAL acontecendo por trás dessa pessoa".' },
  { hora: '08:40', titulo: 'Organização do AMBIENTE (até 08:55)', detalhe: 'Não é organização do dia — é organizar A EMPRESA: sala, mesas, materiais, equipamentos.',
    guia: 'Antes do treinamento: limpar o ambiente, arrumar mesas e cadeiras, organizar materiais e produtos, preparar televisão/projetor, deixar água e o necessário, garantir tudo pronto. Princípio: organização EXTERNA influencia organização INTERNA — a equipe não começa o treinamento no caos. Desenvolve senso de DONO + CUIDADO + PADRÃO + CULTURA. Não importa o cargo: se tem algo fora do lugar, todos ajudam.' },
  { hora: '08:55', titulo: 'TODOS na sala de treinamento', detalhe: '09:00 não é horário de chegar. 09:00 é horário de começar.',
    guia: 'Às 08:55 todo mundo está POSICIONADO: sentado, preparado, material disponível, celular adequado à dinâmica, mente no treinamento. Não é horário de chegar, pegar café, arrumar cadeira, procurar material ou conversar no corredor — tudo isso já aconteceu.' },
  { hora: '09:00', titulo: 'Treinamento diário com o time', detalhe: 'Saia com pelo menos UM aprendizado aplicável.',
    guia: 'Desenvolvimento, cultura, vendas, mentalidade, liderança, produto, comunicação, execução. Cada participante sai com pelo menos 1 APRENDIZADO APLICÁVEL.' },
  { hora: '09:40', titulo: 'Post rápido do aprendizado', detalhe: '1 a 3 minutos: foto do livro, frase, tela, caderno + uma linha.',
    guia: 'Extremamente rápido — não é parar o trabalho pra gravar vídeo produzido. Achou algo bom no treinamento? Registra: foto do livro, tela, frase, anotação. Uma frase basta: "isso aqui do treinamento de hoje fez muito sentido…" O que isso comunica: "essa pessoa trabalha, mas continua estudando." Autoridade construída pela ROTINA, não por autoproclamação.' },
  { hora: '10:00', titulo: 'ABRIR A LOJA', detalhe: 'Conceito: às 10h começa a rotina comercial PÚBLICA do dia. "Loja aberta…"',
    guia: 'Não é levantar porta física — é o horário simbólico do negócio começar em público: "Loja aberta. Começando mais um dia por aqui…" Sequência ideal: 1) APRENDIZADO (algo do treinamento/leitura) → 2) APLICAÇÃO (como conecta com a vida ou o negócio) → 3) PRODUTO (mostrar algo disponível) → 4) COMPARAÇÃO (preço de referência/Mercado Livre) → 5) OPORTUNIDADE (Leilão NoZap, loja virtual, produto ou leilão). Assim existe NARRATIVA, não só tentativa de venda. Varie na semana: produto, comparação, chegada de mercadoria, bastidores, leilão, estoque, vencedor, retirada, entrega, depoimento, curiosidade. Não fazer tudo diariamente — variar mantém natural.' },
  { hora: '10:30', titulo: 'Organização do negócio (até 11:30)', detalhe: 'Agora sim GESTÃO: prioridades, Master Task, pipeline, contratos, reuniões.',
    guia: 'Prioridades, Master Task, comercial, marketing, estoque, operação, pendências, responsáveis, reuniões, pipeline, contratos. Tudo que puder ser resolvido internamente é resolvido ANTES da produção comercial da tarde.' },
  { hora: '12:00', titulo: 'Almoço', detalhe: 'Pausa. Sem obrigação de produzir conteúdo.',
    guia: 'Se surgir algo genuinamente interessante, pode compartilhar. Caso contrário, viva o almoço.' },
  { hora: '13:00', titulo: 'Reunião 1 (45-60 min)', detalhe: 'APRESENTAÇÃO → INTERESSE → PRÓXIMO PASSO.',
    guia: 'Apresentação de sucesso: gerar interesse e conduzir ao próximo passo definido.' },
  { hora: '14:30', titulo: 'Reunião 2 (45-60 min)', detalhe: 'Toda reunião termina com o próximo movimento definido. Nunca "depois a gente conversa".',
    guia: 'Mesma metodologia. Toda reunião termina com um próximo movimento: proposta, análise, documentação, PPV, próxima reunião, contrato ou fechamento. NUNCA "depois a gente conversa".' },
  { hora: '16:00', titulo: 'Reunião 3 (45-60 min)', detalhe: 'Meta: 3 reuniões PRODUTIVAS por dia.',
    guia: 'Não é reunião por reunião — é construção permanente de PIPELINE → NEGOCIAÇÃO → FOLLOW-UP → VENDA.' },
  { hora: '17:30', titulo: 'Contratos + follow-ups', detalhe: 'Nenhuma oportunidade relevante dorme sem próximo passo.',
    guia: 'Revisar as negociações abertas. Para cada uma: valor, estágio, objeção, próxima ação, responsável, prazo e PPV.' },
  { hora: '18:30', titulo: 'Fechamento do dia', detalhe: 'Master Task: o que prometi? O que entreguei? O que ficou? Prioridade de amanhã?',
    guia: 'Abrir o Master Task e conferir: tarefas realizadas, pendências, compromissos, reuniões, vendas, follow-ups e as prioridades de amanhã. A finalidade é fechar mentalmente o dia e NÃO transportar desorganização pra amanhã.' },
  { hora: '21:30', titulo: 'Leitura leve + descanso', detalhe: 'Reduzir estímulos. Amanhã, 05:00 começa novamente.',
    guia: 'Leitura leve, preparação pra dormir. Dormir cedo é preparação pra conseguir repetir a produtividade amanhã.' },
];

/** A escada da narrativa: o dia inteiro conta UMA história, não dez propagandas. */
export const NARRATIVA_DO_DIA = [
  { hora: '05:00', frase: 'Tenho propósito.' },
  { hora: '05:15', frase: 'Estou começando.' },
  { hora: '05:30', frase: 'Estou executando.' },
  { hora: '06:45', frase: 'Termino aquilo que começo.' },
  { hora: '07:00', frase: 'Continuo evoluindo.' },
  { hora: '08:00', frase: 'Tenho pensamentos próprios.' },
  { hora: '08:30', frase: 'Existe uma empresa real.' },
  { hora: '08:40', frase: 'Cuido do ambiente onde trabalho.' },
  { hora: '08:55', frase: 'Respeito horário e preparação.' },
  { hora: '09:00', frase: 'Continuo aprendendo.' },
  { hora: '09:40', frase: 'Compartilho aquilo que aprendo.' },
  { hora: '10:00', frase: 'Meu negócio está aberto.' },
  { hora: '10:30', frase: 'Organizo para executar.' },
  { hora: '13:00–17:30', frase: 'Produzo e vendo.' },
  { hora: '18:30', frase: 'Presto contas do meu próprio resultado.' },
  { hora: '21:30', frase: 'Preparo o próximo dia.' },
];

/** Guia estratégico de um item da rotina, pelo título (tarefa customizada não tem). */
export function guiaDaRotina(titulo) {
  const t = String(titulo || '').trim();
  if (!t) return null;
  return ROTINA_PADRAO.find((r) => r.titulo === t)?.guia || null;
}

/** Período do dia pela hora "HH:mm" — organiza o quadro do Master Task. */
export function periodoDe(hora) {
  const s = String(hora || '').trim();
  if (!s) return 'dia';
  const h = Number(s.slice(0, 2));
  if (!Number.isFinite(h)) return 'dia';
  if (h < 12) return 'manha';
  if (h < 18) return 'tarde';
  return 'noite';
}
export const PERIODOS = [
  { id: 'manha', label: '🌅 Manhã' },
  { id: 'tarde', label: '☀️ Tarde' },
  { id: 'noite', label: '🌙 Noite' },
  { id: 'dia', label: '📌 Sem hora' },
];

/** Gera as tarefas de um dia a partir da rotina (modelo → linhas do dia). */
export function gerarTarefasDaRotina(rotina = [], userId, dataStr) {
  return (Array.isArray(rotina) ? rotina : [])
    .filter((r) => r && r.titulo)
    .map((r, i) => ({
      user_id: userId,
      data: dataStr,
      hora: r.hora || '',
      titulo: r.titulo,
      detalhe: r.detalhe || '',
      feito: false,
      ordem: i,
    }));
}

/** Progresso do dia: feitas ÷ total (0-100), sem inventar número em dia vazio. */
export function progressoDia(tarefas = []) {
  const total = tarefas.length;
  const feitas = tarefas.filter((t) => t.feito).length;
  return { total, feitas, pct: total > 0 ? (feitas / total) * 100 : 0 };
}

/**
 * Link do Google Agenda (URL de template OFICIAL do Google — abre a agenda da
 * pessoa com o evento pronto pra salvar; sem OAuth, funciona pra qualquer conta).
 */
export function linkGoogleAgenda({ titulo, inicio, duracaoMin = 60, detalhes = '' }) {
  const ini = new Date(inicio);
  if (Number.isNaN(ini.getTime())) return null;
  const fim = new Date(ini.getTime() + duracaoMin * 60000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo || 'Reunião — Leilão NoZap',
    dates: `${fmt(ini)}/${fmt(fim)}`,
    details: detalhes || 'Apresentação de sucesso — Leilão NoZap',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Qualificação 1-5 da lista de network (Hábito 3). */
export const QUALIFICACOES = [1, 2, 3, 4, 5];
export const qualificacaoValida = (n) => Number.isInteger(n) && n >= 1 && n <= 5;

// ══ 🌟 Hábito 1 — QUADRO DOS SONHOS (DIR-44, 03/09/2026) ══
// O quadro do dono tem três horizontes; cada um recebe quantas imagens a
// pessoa quiser, com os detalhes escritos embaixo de cada uma.
export const HORIZONTES_SONHO = [
  { id: 'curto', emoji: '⚡', label: 'Curto prazo', faixa: '1 a 2 anos' },
  { id: 'medio', emoji: '🎯', label: 'Médio prazo', faixa: '2 a 4 anos' },
  { id: 'longo', emoji: '🏆', label: 'Longo prazo', faixa: '5 anos pra frente' },
];
const HORIZONTES_VALIDOS = new Set(HORIZONTES_SONHO.map((h) => h.id));

/** A orientação ditada pelo dono pro campo de detalhes de cada imagem. */
export const PLACEHOLDER_DETALHES_SONHO =
  'Descreva os detalhes EXATOS do seu sonho. Se for um carro: ano, cor, '
  + 'banco de couro, qual roda... Se for uma casa: bairro, metragem, varanda. '
  + 'Quanto mais concreto, mais real.';

/**
 * Normaliza um item de metodo_perfil.sonhos sem perder o legado:
 * string → {titulo}; horizonte inválido/ausente → 'curto'. Não inventa id —
 * quem grava (a tela) atribui, e a leitura preserva o que existir.
 */
export function normalizarSonho(item) {
  const base = typeof item === 'string' ? { titulo: item } : (item && typeof item === 'object' ? item : {});
  const titulo = String(base.titulo || '').trim();
  return {
    ...base,
    titulo: titulo || 'Sonho',
    horizonte: HORIZONTES_VALIDOS.has(base.horizonte) ? base.horizonte : 'curto',
    imagem_url: typeof base.imagem_url === 'string' && base.imagem_url ? base.imagem_url : null,
    detalhes: typeof base.detalhes === 'string' ? base.detalhes : '',
  };
}

/**
 * Agrupa os sonhos por horizonte PRESERVANDO o índice real do array gravado —
 * é pelo índice que a tela edita/remove com segurança (itens legados não têm id).
 * @returns {{curto: Array, medio: Array, longo: Array}} de {sonho, indice}
 */
export function agruparSonhosPorHorizonte(sonhos = []) {
  const grupos = { curto: [], medio: [], longo: [] };
  (Array.isArray(sonhos) ? sonhos : []).forEach((item, indice) => {
    const sonho = normalizarSonho(item);
    grupos[sonho.horizonte].push({ sonho, indice });
  });
  return grupos;
}
