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

// ✅ Hábito 2 — a ROTINA PADRÃO (exemplo real ditado pelo dono, 01/09/2026).
// É o modelo inicial do Master Task: cada um edita a sua.
export const ROTINA_PADRAO = [
  { hora: '05:00', titulo: 'Acordar — gratidão e foco no sonho', detalhe: 'Primeiro pensamento do dia: POR QUE você está construindo isso.' },
  { hora: '05:15', titulo: 'Post no Instagram ao acordar', detalhe: 'Registro do início do dia — disciplina em público.' },
  { hora: '05:30', titulo: 'Corrida + comentário no Instagram', detalhe: 'Treino do corpo; um comentário sobre a corrida no post.' },
  { hora: '06:45', titulo: 'Leitura do dia', detalhe: 'Mínimo 20 minutos — anote UMA ideia pra aplicar hoje.' },
  { hora: '08:30', titulo: 'Chegar na empresa — organizar o dia', detalhe: 'Revisar o Master Task, prioridades e pendências.' },
  { hora: '09:00', titulo: 'Treinamento (9h)', detalhe: 'Treinamento diário com o time.' },
  { hora: '09:40', titulo: 'Post: aprendizado da leitura + treinamento', detalhe: 'Conte no Instagram o que aprendeu hoje.' },
  { hora: '10:00', titulo: 'Abrir a loja + post de conteúdo', detalhe: 'Comparação de preço, produtos, leilão, loja virtual — fale do negócio.' },
  { hora: '10:30', titulo: 'Organização do negócio (até 11:30)', detalhe: 'Tudo que o negócio pede + CONFIRMAR as reuniões da tarde.' },
  { hora: '12:00', titulo: 'Almoço', detalhe: '' },
  { hora: '13:00', titulo: 'Reunião 1 (45-60 min)', detalhe: 'Apresentação de sucesso — conduzir ao próximo ponto.' },
  { hora: '14:30', titulo: 'Reunião 2 (45-60 min)', detalhe: 'Apresentação de sucesso — conduzir ao próximo ponto.' },
  { hora: '16:00', titulo: 'Reunião 3 (45-60 min)', detalhe: 'Meta do método: 3 reuniões no dia.' },
  { hora: '17:30', titulo: 'Fechar contratos e follow-ups', detalhe: 'PPV de cada negociação do dia marcado na esteira.' },
  { hora: '18:30', titulo: 'Fechamento do dia', detalhe: 'Conferir o Master Task, organizar o de amanhã, registrar o progresso.' },
  { hora: '21:30', titulo: 'Leitura e descanso', detalhe: 'Dormir cedo — o dia começa às 5h.' },
];

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
