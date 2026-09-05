// metodo — O MÉTODO VIVO (DIR-43, 01/09/2026): os 8 Hábitos do Sucesso como
// ferramenta, não como slide. Fonte única de: conteúdo dos hábitos, rotina
// padrão do Master Task (a rotina DITADA pelo dono, como exemplo editável),
// períodos do dia, geração do dia a partir da rotina, progresso e o link de
// agenda do Google (URL de template oficial — sem OAuth).

export const HABITOS = [
  { n: 1, id: 'sonho', curto: 'Sonho', completo: 'Sonho', titulo: 'SONHO', sub: 'Clareza de destino', texto: 'Sem clareza de destino, toda energia se dispersa. O sonho dá direção, foco e propósito — é o combustível do compromisso nos momentos difíceis.' },
  { n: 2, id: 'compromisso', curto: 'Compromisso', completo: 'Compromisso', titulo: 'COMPROMISSO', sub: 'Decisão diária', texto: 'Talento faz você começar na frente; disciplina faz você continuar. Todos os dias. Sem exceção. Sem negociação.' },
  { n: 3, id: 'lista', curto: 'Lista', completo: 'Lista de Networking', titulo: 'LISTA DE NETWORKING', sub: 'O ambiente vence', texto: 'O ambiente ou te eleva ou te limita. Sua lista de network é um ativo estratégico — qualifique cada pessoa de 1 a 5 e trate a lista como patrimônio.' },
  { n: 4, id: 'contato', curto: 'Contato', completo: 'Contato e Convite', titulo: 'CONTATO E CONVITE', sub: 'Método F.O.R.M. + seu script', texto: 'Antes de apresentar, entenda a pessoa: Família, Ocupação, Recreação — e então a Mensagem certa. Cada um escreve o PRÓPRIO script e o aperfeiçoa a cada conversa.' },
  { n: 5, id: 'apresentacao', curto: 'Apresentação', completo: 'Apresentação de Sucesso', titulo: 'APRESENTAÇÃO DE SUCESSO', sub: 'Clareza e valor', texto: 'Conexão → FORM → Mensagem → Convite → Apresentação → Próximo Passo. Você não apresenta uma oportunidade — apresenta uma possibilidade. Meta do método: 3 reuniões por dia, de 45 a 60 minutos.' },
  { n: 6, id: 'acompanhamento', curto: 'Acompanhamento', completo: 'Acompanhamento e Fechamento', titulo: 'ACOMPANHAMENTO E FECHAMENTO', sub: 'PPV — Próximo Ponto de Venda', texto: 'Cada etapa precisa conduzir ao próximo ponto. Os dois pilares: DOR + CONFIANÇA. É o CRM: a fila do dia, os clientes e a esteira de captação.' },
  { n: 7, id: 'verificacao', curto: 'Verificação', completo: 'Verificação do Progresso', titulo: 'VERIFICAÇÃO DO PROGRESSO', sub: 'Medir e corrigir', texto: 'O que não se mede, não se corrige: metas, reuniões do dia, win rate, objeções e PPV — a Visão Executiva.' },
  { n: 8, id: 'duplicacao', curto: 'Duplicação', completo: 'Duplicação dos 8 Hábitos do Sucesso', titulo: 'DUPLICAÇÃO DOS 8 HÁBITOS DO SUCESSO', sub: 'Ensinar e multiplicar', texto: 'Conhecimento é o que adquirimos; sabedoria é o que colocamos em prática. Ensine o método — o local de treinamento do time.' },
];

/**
 * 🎓 DIR-69 — o nome do Hábito em DUAS PEÇAS.
 *
 * Ordem do dono: "quando eu clico adentro, precisa aparecer o nome completo.
 * Exemplo: é Lista de Networking, Contato e Convite, Apresentação de Sucesso...
 * Pode até ficar o primeiro nome ali na frente, mas quando clica tem que
 * aparecer o complemento do que são os oito hábitos do sucesso."
 *
 * Então: `curto` é o apelido que continua no seletor (a lista de 8 botões não
 * cabe com o nome inteiro), e `completo` é o nome oficial, que a faixa mostra
 * quando você ENTRA no hábito. O `complemento` é o que sobra do completo
 * depois do curto — é ele que a tela escreve num peso mais leve, pra frase
 * ler como uma coisa só ("Lista" + "de Networking") em vez de repetir a
 * palavra duas vezes.
 *
 * Hábitos 1 e 2 não têm complemento (o nome oficial já é uma palavra só):
 * nesse caso `complemento` volta vazio e a tela simplesmente não escreve nada.
 */
export function partesDoHabito(id) {
  const h = HABITOS.find((x) => x.id === id);
  if (!h) return null;
  const completo = h.completo || h.curto || h.titulo;
  const curto = h.curto || completo;
  const combina = completo.toLowerCase().startsWith(curto.toLowerCase());
  return { curto, completo, complemento: combina ? completo.slice(curto.length).trim() : '' };
}

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

// ══ 📜 Hábito 4 — CONTATO E CONVITE VIVO (DIR-47, 03/09/2026) ══
// Depois de cada contato, registra-se o desfecho; agendados e retornos do
// dia formam a AGENDA DO DIA (o super admin enxerga o time inteiro porque
// o escopo dele já é a lista toda).
export const RESULTADOS_CONTATO = [
  { id: 'feito', emoji: '✅', label: 'Contato feito' },
  { id: 'agendado', emoji: '📅', label: 'Reunião agendada' },
  { id: 'retornar', emoji: '🔁', label: 'Pediu pra retornar' },
  { id: 'nao_atendeu', emoji: '📵', label: 'Não atendeu' },
  { id: 'sem_interesse', emoji: '🚫', label: 'Sem interesse' },
];
export const resultadoContato = (id) => RESULTADOS_CONTATO.find((r) => r.id === id) || null;

/** Registro válido? Agendado exige data/hora; pedir retorno exige data. */
export function registroContatoValido(r) {
  if (!r || !resultadoContato(r.resultado)) return false;
  if (r.resultado === 'agendado' && !r.quando) return false;
  if (r.resultado === 'retornar' && !r.retornar_em) return false;
  return true;
}

/**
 * A AGENDA DO DIA do Contato e Convite: varre o histórico contatos_metodo
 * dos clientes do escopo e devolve os agendados e os retornos marcados pro
 * dia pedido, ordenados por hora. Quem chama decide o escopo (o super admin
 * passa a lista completa — "todas as agendas do dia").
 */
export function agendaDoDiaContatos(clientes = [], diaISO) {
  const dia = String(diaISO || '').slice(0, 10);
  const agendados = [];
  const retornos = [];
  for (const cliente of (Array.isArray(clientes) ? clientes : [])) {
    for (const registro of (Array.isArray(cliente?.contatos_metodo) ? cliente.contatos_metodo : [])) {
      if (registro?.resultado === 'agendado' && String(registro.quando || '').slice(0, 10) === dia) {
        agendados.push({ cliente, registro });
      }
      if (registro?.resultado === 'retornar' && String(registro.retornar_em || '').slice(0, 10) === dia) {
        retornos.push({ cliente, registro });
      }
    }
  }
  agendados.sort((a, b) => String(a.registro.quando).localeCompare(String(b.registro.quando)));
  retornos.sort((a, b) => String(a.cliente.full_name || '').localeCompare(String(b.cliente.full_name || ''), 'pt-BR'));
  return { agendados, retornos };
}

/** Durações de reunião oferecidas pelo agendador (o método sugere 45-60). */
export const DURACOES_REUNIAO = [30, 45, 60, 90];

/**
 * DIR-48 — monta o corpo do evento pra Calendar API (criação REAL na agenda
 * da própria pessoa). Fonte única: o mesmo objeto serve pro insert e pro
 * fallback de link. Devolve null se o início for inválido.
 */
export function eventoGoogleDaReuniao({ titulo, inicio, duracaoMin = 60, detalhes = '', local = '', timeZone = 'America/Sao_Paulo' }) {
  const ini = new Date(inicio);
  if (Number.isNaN(ini.getTime())) return null;
  const fim = new Date(ini.getTime() + (Number(duracaoMin) > 0 ? Number(duracaoMin) : 60) * 60000);
  const semMs = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
  return {
    summary: titulo || 'Reunião — Leilão NoZap',
    description: detalhes || 'Apresentação de sucesso — Leilão NoZap',
    ...(local ? { location: local } : {}),
    start: { dateTime: semMs(ini), timeZone },
    end: { dateTime: semMs(fim), timeZone },
    // 🔔 DIR-53 — o alarme oficial: o Google avisa 30 e 10 min antes, no
    // celular, mesmo com o app fechado. Configurado NA CRIAÇÃO do evento.
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }, { method: 'popup', minutes: 10 }] },
  };
}

/**
 * DIR-50 — o ID do evento na Google Agenda, pra editar/apagar de verdade.
 * Registros novos guardam `google_event_id`; nos antigos só existe o link —
 * o `eid` do link é base64url de "<idDoEvento> <emailDaAgenda>", então dá
 * pra extrair. Devolve null quando não há evento Google.
 */
export function idDoEventoGoogle(registro) {
  if (registro?.google_event_id) return registro.google_event_id;
  const link = String(registro?.google_event_link || '');
  const m = link.match(/[?&]eid=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const decodificado = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    const id = decodificado.split(' ')[0];
    return id || null;
  } catch { return null; }
}

/** Segunda a domingo da semana que contém o dia dado (datas ISO yyyy-mm-dd). */
export function semanaDe(diaISO) {
  const d = new Date(`${String(diaISO).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const desloc = (d.getDay() + 6) % 7; // segunda = 0
  const ini = new Date(d); ini.setDate(d.getDate() - desloc);
  const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { inicio: iso(ini), fim: iso(fim) };
}

/** Meta do método: 3 apresentações por dia útil → 15 por semana, por pessoa. */
export const META_REUNIOES_SEMANA = 15;

/**
 * DIR-51 — a visão MACRO da semana (TIME INTEIRO): total de reuniões
 * agendadas na semana do dia dado e a quebra por pessoa, com % da meta.
 */
export function resumoSemanaReunioes(clientes = [], diaISO) {
  const sem = semanaDe(diaISO);
  if (!sem) return { total: 0, porPessoa: [], semana: null };
  const porPessoa = new Map();
  let total = 0;
  for (const cliente of (Array.isArray(clientes) ? clientes : [])) {
    for (const registro of (Array.isArray(cliente?.contatos_metodo) ? cliente.contatos_metodo : [])) {
      const dia = String(registro?.quando || '').slice(0, 10);
      if (registro?.resultado !== 'agendado' || dia < sem.inicio || dia > sem.fim) continue;
      total++;
      const chave = registro.registrado_por_id || registro.registrado_por_nome || 'sem_dono';
      const atual = porPessoa.get(chave) || { id: chave, nome: registro.registrado_por_nome || 'Sem nome', total: 0 };
      atual.total++;
      porPessoa.set(chave, atual);
    }
  }
  const lista = [...porPessoa.values()]
    .map((p) => ({ ...p, pct: Math.round((p.total / META_REUNIOES_SEMANA) * 100) }))
    .sort((a, b) => b.total - a.total || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  return { total, porPessoa: lista, semana: sem };
}

/**
 * DIR-53 — a reunião MINHA mais próxima de começar (entre agora e a janela,
 * em minutos): é o gatilho do popup "🔔 reunião em X min" no app.
 */
export function reuniaoIminente(clientes = [], uid, agoraISO, janelaMin = 15) {
  const agora = new Date(agoraISO);
  if (Number.isNaN(agora.getTime()) || !uid) return null;
  let melhor = null;
  for (const cliente of (Array.isArray(clientes) ? clientes : [])) {
    for (const registro of (Array.isArray(cliente?.contatos_metodo) ? cliente.contatos_metodo : [])) {
      if (registro?.resultado !== 'agendado' || registro.registrado_por_id !== uid) continue;
      const ini = new Date(registro.quando || '');
      if (Number.isNaN(ini.getTime())) continue;
      const min = Math.round((ini.getTime() - agora.getTime()) / 60000);
      if (min < 0 || min > janelaMin) continue;
      if (!melhor || min < melhor.minutos) melhor = { cliente, registro, minutos: min };
    }
  }
  return melhor;
}

/** Rótulos dos dias pro cadastro da reunião recorrente (índice = getDay()). */
export const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/**
 * DIR-54.1 — o horário de TÉRMINO a partir de "HH:mm" de início + minutos de
 * duração (o inverso de duracaoEntreHoras — pra exibir "09:00 às 13:00" em
 * vez do minutos crus, que fica feio pra reunião longa). Vira o dia sozinho.
 */
export function horaFinal(horaInicio, duracaoMin) {
  const m = String(horaInicio || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const totalMin = (Number(m[1]) * 60 + Number(m[2]) + (Number(duracaoMin) || 0)) % (24 * 60);
  return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
}

/**
 * DIR-54 — duração em minutos a partir de "HH:mm" de início e término (pro
 * cadastro que prefere dizer "até às" em vez de contar minutos). Vira o dia
 * (término menor que início) soma 24h — reunião nunca "termina no passado".
 * Devolve null se as horas forem inválidas ou o término for igual ao início.
 */
export function duracaoEntreHoras(horaInicio, horaFim) {
  const paraMin = (h) => {
    const m = String(h || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const hh = Number(m[1]); const mm = Number(m[2]);
    if (hh > 23 || mm > 59) return null;
    return hh * 60 + mm;
  };
  const ini = paraMin(horaInicio); const fim = paraMin(horaFim);
  if (ini === null || fim === null || ini === fim) return null;
  return fim > ini ? fim - ini : (fim + 24 * 60) - ini;
}

/**
 * DIR-52 — as reuniões DA EMPRESA que caem no dia dado: recorrentes (pelo
 * dia da semana) e de data única, ativas, cada uma com `quando` montado
 * (dia + hora) pra entrar na linha do tempo com selo 🏛️.
 */
export function reunioesEmpresaDoDia(lista = [], diaISO) {
  const dia = String(diaISO || '').slice(0, 10);
  const d = new Date(`${dia}T12:00:00`);
  if (Number.isNaN(d.getTime())) return [];
  const semana = d.getDay();
  return (Array.isArray(lista) ? lista : [])
    .filter((r) => r && r.ativo !== false && (
      (r.dia_semana !== null && r.dia_semana !== undefined && Number(r.dia_semana) === semana)
      || String(r.data || '').slice(0, 10) === dia
    ))
    .map((r) => ({ ...r, quando: `${dia}T${r.hora || '00:00'}` }))
    .sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || '')));
}

/**
 * DIR-49 — a LINHA DO TEMPO UNIFICADA do dia: reuniões do método, reuniões
 * da esteira e eventos do Google numa lista só, ordenada pela hora. Cada
 * item entra com `quando` (ISO com hora, ou só a data pra evento de dia
 * inteiro) e a sua `origem` ('metodo' | 'esteira' | 'retorno' | 'google');
 * dia inteiro vem primeiro. Fonte única — a tela não ordena nada sozinha.
 */
export function linhaDoTempoUnificada(itens = []) {
  const hora = (i) => {
    const s = String(i?.quando || '');
    const d = new Date(s);
    if (s.length <= 10 || Number.isNaN(d.getTime())) return '00:00'; // sem hora = dia inteiro, abre o dia
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  return [...(Array.isArray(itens) ? itens : [])].sort((a, b) => hora(a).localeCompare(hora(b)));
}

/**
 * DIR-49.1 — o ÚLTIMO desfecho registrado de um cliente (pelo carimbo `em`),
 * ou null. É o que a fila mostra pra provar que o registro salvou.
 */
export function ultimoContato(cliente) {
  const lista = Array.isArray(cliente?.contatos_metodo) ? cliente.contatos_metodo : [];
  if (!lista.length) return null;
  return [...lista].sort((a, b) => String(a?.em || '').localeCompare(String(b?.em || ''))).at(-1) || null;
}

/**
 * DIR-49.1 — as PRÓXIMAS reuniões: agendados de dias DEPOIS do dia dado,
 * ordenados por data/hora. Reunião futura não pode ser invisível.
 */
export function proximasReunioes(clientes = [], depoisDeISO) {
  const dia = String(depoisDeISO || '').slice(0, 10);
  const proximas = [];
  for (const cliente of (Array.isArray(clientes) ? clientes : [])) {
    for (const registro of (Array.isArray(cliente?.contatos_metodo) ? cliente.contatos_metodo : [])) {
      if (registro?.resultado === 'agendado' && String(registro.quando || '').slice(0, 10) > dia) proximas.push({ cliente, registro });
    }
  }
  proximas.sort((a, b) => String(a.registro.quando).localeCompare(String(b.registro.quando)));
  return proximas;
}

/** Plural honesto dos contadores: plural(1,'reunião','reuniões') → "1 reunião". */
export function plural(n, umItem, varios) {
  return `${n} ${Number(n) === 1 ? umItem : varios}`;
}

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

// ══ 🤝 Hábito 3 — LISTA DE NETWORK QUALIFICADA (DIR-46, 03/09/2026) ══
// "É tipo uma agenda de telefone": cada contato ganha 3 notas de 1 a 5
// (confiança em mim, condição financeira, apetite ao produto APRESENTADO —
// por isso o executivo escolhe o produto no modal) e a lista mostra a
// probabilidade de fechamento derivada da soma. Régua transparente:
// pct = (total − 3) / 12 → 1/1/1 = 0%, 3/4/5 = 75%, 5/5/5 = 100%.
export const PRODUTOS_APRESENTACAO = [
  { id: 'parceiro_compra', label: 'Parceiro de Compra', emoji: '🤝' },
  { id: 'licencas', label: 'Licenças', emoji: '📜' },
];
export const DIMENSOES_QUALIFICACAO = [
  { id: 'confianca', label: 'Confiança em mim', emoji: '🫱' },
  { id: 'financeiro', label: 'Condição financeira', emoji: '💰' },
  { id: 'apetite', label: 'Apetite ao produto', emoji: '🔥' },
];
export const produtoApresentacao = (id) => PRODUTOS_APRESENTACAO.find((p) => p.id === id) || null;

export function qualificacaoNetworkCompleta(q) {
  return !!q && DIMENSOES_QUALIFICACAO.every((d) => qualificacaoValida(q[d.id]));
}

/** Soma das 3 notas (3 a 15), ou null se a qualificação está incompleta. */
export function totalQualificacao(q) {
  if (!qualificacaoNetworkCompleta(q)) return null;
  return DIMENSOES_QUALIFICACAO.reduce((soma, d) => soma + q[d.id], 0);
}

export const FAIXAS_PROBABILIDADE = [
  { id: 'quente', emoji: '🔥', label: 'Quente', minPct: 70 },
  { id: 'morno', emoji: '🌤️', label: 'Morno', minPct: 40 },
  { id: 'frio', emoji: '❄️', label: 'Frio', minPct: 0 },
];

/** Probabilidade de fechamento pela qualificação: {total, pct, faixa} ou null. */
export function probabilidadeFechamento(q) {
  const total = totalQualificacao(q);
  if (total === null) return null;
  const pct = Math.round(((total - 3) / 12) * 100);
  const faixa = FAIXAS_PROBABILIDADE.find((f) => pct >= f.minPct) || FAIXAS_PROBABILIDADE.at(-1);
  return { total, pct, faixa };
}

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
