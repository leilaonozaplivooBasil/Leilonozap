// 🔗 A TAREFA DO DIA SABE PRA ONDE LEVAR.
//
// DE ONDE VEIO (dono, 06/09/2026): "esse planejamento diário precisa turbinar
// ele com as ferramentas. Nos oito hábitos do sucesso que a gente já tem, ele
// faz o link direto... de dez e meia às onze e meia eu vou abrir ali, reunião
// de não sei o quê, que eu vou organizar a reunião, já vai entrar na minha
// reunião do dia; fazer contato com fulano, aí eu vou buscar esse contato no
// terceiro hábito."
//
// ── AS TRÊS DECISÕES DESTE ARQUIVO ──────────────────────────────────────────
//
// 1. É TABELA DE CÓDIGO, NÃO COLUNA DE BANCO. A ligação muda quando a Rotina
//    Perfeita muda — e a Rotina é conteúdo do dono, revisto direto no código.
//    Uma coluna no banco obrigaria uma migração a cada ajuste de redação, e
//    deixaria as tarefas antigas com o vínculo velho pra sempre.
//
// 2. TAREFA SEM FERRAMENTA NÃO GANHA BOTÃO. "Almoço" e "Leitura leve" não têm
//    pra onde levar. Botão que abre a tela errada é pior que botão nenhum: a
//    pessoa clica uma vez, se perde, e não clica mais em nenhum.
//
// 3. O CASAMENTO É POR TÍTULO, E POR ISSO ELE É POR PADRÃO — NÃO POR IGUALDADE.
//    A pessoa escreve tarefa própria ("ligar pro Renan", "reunião com o
//    contador") e o dia é gerado com textos que já mudaram duas vezes. Casar
//    string exata deixaria tudo isso órfão. Aqui vale o PADRÃO no título, na
//    ordem em que está escrito abaixo — a primeira regra que casa, vence.

/**
 * Os alvos possíveis. `secao` é o id do Hábito em HABITOS (o mesmo que
 * `onIr(secao, sub)` já entende — a navegação entre Hábitos que o CRM usa
 * desde o Hábito 4→3). `sub` é a sub-aba, quando o Hábito tem mais de uma.
 */
export const FERRAMENTAS = {
  sonho: { habito: 1, secao: 'sonho', rotulo: 'Quadro dos Sonhos' },
  lista: { habito: 3, secao: 'lista', rotulo: 'Lista de Networking' },
  agenda: { habito: 4, secao: 'contato', rotulo: 'Agenda e contatos' },
  apresentacao: { habito: 5, secao: 'apresentacao', rotulo: 'Apresentação' },
  esteira: { habito: 6, secao: 'acompanhamento', sub: 'expansao', rotulo: 'Esteira e follow-up' },
  numeros: { habito: 7, secao: 'verificacao', rotulo: 'Visão Executiva' },
  time: { habito: 8, secao: 'duplicacao', rotulo: 'Treinar o time' },
  // 🗂️ o NOSSO quadro — mora dentro do próprio Compromisso (Hábito 2), e por
  // isso não navega pra outro Hábito: abre a aba ao lado.
  quadro: { habito: 2, secao: 'compromisso', sub: 'quadro', rotulo: 'Nosso quadro' },
};

// A ordem IMPORTA: a primeira que casar é a que vale. "Reunião 1" tem que bater
// em `reuni` antes de qualquer regra mais larga pegar ela.
const REGRAS = [
  [/reuni[ãa]o\s*\d|^reuni[ãa]o|agendar|agenda\b/i, 'agenda'],
  [/contato|ligar|convite|whats|prospec/i, 'agenda'],
  [/organiza[çc][ãa]o do neg[óo]cio|master task|fechamento do dia|priorida|pend[êe]nc|pipeline|contrato\s*$/i, 'quadro'],
  [/contrato|follow[- ]?up|acompanh|ppv|fecha(r|mento) de venda/i, 'esteira'],
  [/lista|network/i, 'lista'],
  [/treinamento|treinar|ensinar|duplica|sala de treinamento|time\b/i, 'time'],
  [/apresenta[çc][ãa]o/i, 'apresentacao'],
  [/sonho|gratid[ãa]o/i, 'sonho'],
  [/meta|n[úu]mero|resultado|win rate|verifica/i, 'numeros'],
];

/**
 * A ferramenta de uma tarefa, pelo título. Devolve `null` quando a tarefa não
 * tem pra onde levar — e isso é resposta, não falha.
 * @param {string} titulo
 * @returns {{chave:string, habito:number, secao:string, sub?:string, rotulo:string}|null}
 */
export function ferramentaDaTarefa(titulo) {
  const t = String(titulo || '');
  if (!t.trim()) return null;
  for (const [padrao, chave] of REGRAS) {
    if (padrao.test(t)) return { chave, ...FERRAMENTAS[chave] };
  }
  return null;
}

/**
 * A ferramenta pelo NÚMERO do Hábito — pra tarefa que já vem com `habito`
 * gravado (a gestão do X-Performance distribui tarefa com Hábito marcado,
 * DIR da sessão paralela, 06/09/2026). Hábito gravado vence o título: quem
 * distribuiu sabia pra onde ela ia.
 */
export function ferramentaDoHabito(n) {
  const num = Number(n);
  const chave = Object.keys(FERRAMENTAS).find((k) => FERRAMENTAS[k].habito === num && k !== 'quadro');
  return chave ? { chave, ...FERRAMENTAS[chave] } : null;
}

/** A ferramenta de uma TAREFA: o Hábito gravado, se houver; senão, o título. */
export function ferramentaDe(tarefa) {
  return ferramentaDoHabito(tarefa?.habito) || ferramentaDaTarefa(tarefa?.titulo);
}

/** Quantas tarefas do dia têm ferramenta — o número que a tela usa pra dizer
 *  "12 das 20 tarefas de hoje abrem uma ferramenta". */
export function tarefasComFerramenta(tarefas = []) {
  return (Array.isArray(tarefas) ? tarefas : []).filter((t) => !!ferramentaDaTarefa(t?.titulo)).length;
}
