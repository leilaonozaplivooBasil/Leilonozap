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

// ✅ Hábito 2 — A ROTINA PERFEITA (ditada pelo dono em 03/09/2026, DIR-45).
// Não é agenda de posts: é a rotina REAL virando narrativa diária nas redes.
// Cada item tem o `detalhe` (a linha do Master Task) e o `guia` (a orientação
// estratégica do dono pra aquele horário). É o modelo inicial: cada um edita a sua.
export const PRINCIPIO_ROTINA = {
  percepcoes: ['DISCIPLINA', 'HUMANIDADE', 'EVOLUÇÃO', 'CREDIBILIDADE', 'NEGÓCIO'],
  regra: 'Primeiro seja interessante. Depois desperte interesse.',
  texto: 'A rede social acompanha a vida real — sem transformar cada momento em propaganda. '
    + 'Os Stories são a janela do dia: um vídeo de segundos, uma foto, uma frase basta. '
    + 'Prova social contínua, sem parecer artificial.',
};

export const ROTINA_PADRAO = [
  { hora: '05:00', titulo: 'Acordar — gratidão e foco no sonho', detalhe: 'Primeiro pensamento do dia: POR QUE você está construindo isso.',
    guia: 'Gratidão, lembrar do objetivo, visualizar o que está construindo e organizar o dia na cabeça. Conteúdo simples: a manhã, o relógio, o café, a janela — com uma mensagem curta de propósito, disciplina ou constância. Percepção a gerar: "essa pessoa tem propósito e começa o dia com direção."' },
  { hora: '05:15', titulo: 'Story ANTES da atividade física', detalhe: 'Mostre que está começando — tênis, rua, horário. Sem ensinar, sem vender.',
    guia: 'O primeiro conteúdo vem ANTES da corrida: colocando o tênis, saindo de casa, no elevador, mostrando o horário ou falando do desafio do dia. Função: abrir a narrativa do dia. Quem acompanha vê "ele acordou cedo e está indo treinar" — e fica esperando o próximo Story.' },
  { hora: '05:30', titulo: 'Corrida / atividade física + Story DURANTE', detalhe: 'Treino acontecendo: suor, relógio, paisagem + frase de disciplina.',
    guia: 'Postagem curta no meio do treino: corrida, academia, distância, suor. Frase sobre disciplina, constância, começar sem vontade. Isso é PROVA SOCIAL: não é dizer "sou disciplinado", é mostrar a disciplina acontecendo. Mensagem indireta: "se eu consigo cuidar da minha evolução todo dia, você também pode começar."' },
  { hora: '06:45', titulo: 'Final do treino — resultado + reflexão', detalhe: 'Fechou a história: começou → fez → terminou. Resultado + uma lição.',
    guia: 'Mostre o fechamento: distância, tempo, suor, missão cumprida — e uma mensagem simples do que o treino provocou. Direções: "nem sempre você precisa estar motivado, precisa começar" · "45 minutos cuidando do corpo mudam a energia das próximas horas" · "mais importante que intensidade é conseguir repetir amanhã". Treino vira DISCIPLINA + PROVA + APRENDIZADO.' },
  { hora: '07:00', titulo: 'Leitura do dia', detalhe: 'Mínimo 20 minutos — retire UMA ideia aplicável hoje.',
    guia: 'Não é só "ler livro": é alimentar a mente antes do trabalho. Regra: retirar UMA única ideia. Pode registrar a página, uma frase, uma anotação. Pergunta: "o que eu li hoje que consigo aplicar na minha vida ou no meu negócio?" Uma ideia basta.' },
  { hora: '08:00', titulo: 'Caminho pra empresa — Story espontâneo', detalhe: 'A transição VIDA → EMPRESA. Fale do que estiver na cabeça — sem forçar.',
    guia: 'No carro parado, andando, no café: um Story espontâneo sobre qualquer inspiração da manhã — treino, leitura, família, mercado, algo que acabou de perceber. Regra: NÃO FORÇAR CONTEÚDO. A ideia é mostrar uma pessoa pensando. Constrói a característica mais poderosa: "essa pessoa tem coisas interessantes pra dizer."' },
  { hora: '08:30', titulo: 'Chegar à empresa — mostrar o ambiente', detalhe: 'Porta, escritório, equipe, produtos. Pode só música — o ambiente fala.',
    guia: 'O ambiente é PROVA DE REALIDADE: empresa + equipe + estrutura + produtos + organização. A percepção muda de "ele fala de um negócio" para "esse negócio existe — estou acompanhando ele acontecer". Varie o que mostra ao longo dos dias, naturalmente.' },
  { hora: '08:45', titulo: 'Organização do dia (Master Task)', detalhe: 'Agenda, prioridades, pendências, reuniões, metas. Aqui começa a execução.',
    guia: 'Não precisa virar conteúdo. Pergunta central: "quais são as TRÊS coisas que precisam acontecer hoje para este dia ter valido a pena?"' },
  { hora: '09:00', titulo: 'Treinamento diário com o time', detalhe: 'Presença + atenção + pelo menos UM aprendizado retirado.',
    guia: 'O treinamento não é só formação — demonstra que existe CULTURA DE APRENDIZADO. Esteja presente e saia com pelo menos um aprendizado anotado.' },
  { hora: '09:40', titulo: 'Post rápido do aprendizado', detalhe: '1 a 3 minutos: foto do livro, frase, tela do treinamento + uma linha.',
    guia: 'NÃO é parar pra produzir vídeo. Achou algo interessante na leitura ou no treinamento? Posta: foto do livro, frase, caderno, tela — "isso aqui do treinamento de hoje ficou na minha cabeça…" e UMA linha. Acabou. Mostra todo dia "eu continuo estudando" — autoridade sem precisar dizer "sou especialista".' },
  { hora: '10:00', titulo: 'ABRIR A LOJA', detalhe: 'Horário SIMBÓLICO de abertura: "Loja aberta. Vamos começar mais um dia."',
    guia: 'Abrir a loja não é abrir porta física — 10h é o horário simbólico do negócio começar em público. Sequência: 1) Inspiração ("hoje no treinamento surgiu uma ideia…") → 2) Aplicação ("isso acontece muito no nosso mercado…") → 3) Negócio ("olha esse produto que entrou hoje") → 4) Comparação (preço de referência) → 5) Leilão NoZap (produto, oportunidade, leilão, loja virtual). Varie os conteúdos: produto novo, comparação com Mercado Livre, bastidores, chegada de mercadoria, vencedor de leilão, entrega, depoimento, explicação do modelo. Nunca precisa mostrar tudo no mesmo dia. A audiência acompanha primeiro A PESSOA, depois a rotina, depois o conhecimento — e naturalmente chega ao negócio.' },
  { hora: '10:30', titulo: 'Organização do negócio (até 11:30)', detalhe: 'Gestão: equipe, números, operação, estoque + CONFIRMAR as reuniões da tarde.',
    guia: 'Sai do conteúdo, entra em gestão: equipe, números, operação, comercial, marketing, estoque, pendências, responsáveis, reuniões da tarde. Objetivo: deixar a empresa preparada pra produção da tarde.' },
  { hora: '12:00', titulo: 'Almoço', detalhe: 'Pausa real — sem obrigação de virar conteúdo.',
    guia: 'Se acontecer algo genuinamente interessante, pode compartilhar. Caso contrário: VIVA O ALMOÇO.' },
  { hora: '13:00', titulo: 'Reunião 1 (45-60 min)', detalhe: 'Apresentação de sucesso — termina com PRÓXIMO PASSO DEFINIDO.',
    guia: 'Apresentação, oportunidade, investimento, parceria, fechamento — e SEMPRE conduzir ao próximo passo.' },
  { hora: '14:30', titulo: 'Reunião 2 (45-60 min)', detalhe: 'Mesmo padrão. Nenhuma reunião termina em "depois a gente conversa".',
    guia: 'Toda reunião termina com PRÓXIMO PASSO DEFINIDO: proposta, documento, nova reunião, análise, contrato, PPV ou fechamento. "Depois a gente conversa" não existe.' },
  { hora: '16:00', titulo: 'Reunião 3 (45-60 min)', detalhe: 'Meta: 3 reuniões PRODUTIVAS no dia.',
    guia: 'O objetivo não é cumprir agenda — é alimentar continuamente PIPELINE → FOLLOW-UP → FECHAMENTO.' },
  { hora: '17:30', titulo: 'Contratos + follow-ups', detalhe: 'Transformar as conversas do dia em resultado. Nenhuma oportunidade solta.',
    guia: 'Revisar TODAS as reuniões do dia. Para cada negociação: estágio, valor, objeção, responsável, próxima ação, data e PPV. Nenhuma oportunidade importante termina o dia solta.' },
  { hora: '18:30', titulo: 'Fechamento do dia', detalhe: 'Master Task: o que prometi? O que fiz? O que ficou? O que entra amanhã?',
    guia: 'Abrir o Master Task e prestar contas: o que eu prometi fazer, o que realmente fiz, o que ficou pendente, o que precisa entrar amanhã. O objetivo não é terminar todo dia perfeito — é impedir que um dia desorganizado contamine o dia seguinte.' },
  { hora: '21:30', titulo: 'Leitura leve + descanso', detalhe: 'Reduzir estímulos. A rotina de amanhã começa às 05:00.',
    guia: 'Dormir cedo não é ausência de produtividade — é preparação pra conseguir repetir a produtividade amanhã.' },
];

/** A escada da narrativa: o dia inteiro conta UMA história, não dez propagandas. */
export const NARRATIVA_DO_DIA = [
  { hora: '05:00', frase: 'Tenho propósito.' },
  { hora: '05:15', frase: 'Estou começando.' },
  { hora: '05:30', frase: 'Faço aquilo que digo.' },
  { hora: '06:45', frase: 'Terminei aquilo que comecei.' },
  { hora: '07:00', frase: 'Estou evoluindo.' },
  { hora: '08:00', frase: 'Tenho pensamentos e opiniões.' },
  { hora: '08:30', frase: 'Existe estrutura por trás de mim.' },
  { hora: '09:00', frase: 'Continuo aprendendo.' },
  { hora: '10:00', frase: 'Tenho um negócio real.' },
  { hora: '13:00', frase: 'Trabalho e produzo.' },
  { hora: '18:30', frase: 'Presto contas do meu próprio dia.' },
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
