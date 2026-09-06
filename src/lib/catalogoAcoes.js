// 📚 O CATÁLOGO DE AÇÕES — "o que tem pra fazer", com mentalidade, Hábito e
// peso já reconhecidos.
//
// DE ONDE VEIO (ditado pelo dono em 06/09/2026, na gestão do X-Performance):
// "eu gostaria que o sistema identificasse o peso e qual é a mentalidade
// dessa ação — temos três, executivo, diretor e CEO. Que me desse uma lista
// de opções do que tem pra fazer; ao selecionar, ele já me diz o peso e a
// mentalidade. E cada ação que eu for colocando eu poder adicionar nesse
// menu suspenso."
//
// TRÊS PEÇAS:
//   1. classificarAcao(titulo) — lê o texto e diz a mentalidade e o Hábito.
//      A regra é por palavra: quem fala de time, números, conferir, treinar
//      está multiplicando (diretor); quem fala de diretoria, sistema,
//      processo, estratégia está construindo (CEO); o resto é a própria mão
//      (executivo). O peso vem da régua de sempre (título + mentalidade).
//   2. ACOES_PADRAO — o catálogo inicial, no código, pra lista nunca nascer
//      vazia. O que o dono acrescenta vai pra tabela xperf_acoes.
//   3. catalogoJunto(padrao, doBanco) — uma lista só, sem título repetido, o
//      do banco por cima do padrão (o dono pode "corrigir" uma ação padrão
//      salvando a dele com o mesmo nome).
import { pesoComMentalidade, mentalidadeDe, habitosDaMentalidade } from './mentalidades.js';

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ordem importa: CEO antes de diretor (quem fala de "diretoria" está acima do time)
const REGRAS_MENTALIDADE = [
  { id: 'ceo', re: /diretoria|estrateg|sistema|processo|empresa|expans|investid|socied|orcamento|formar (um |o )?diretor|cultura|governanca|conselho/ },
  { id: 'diretor', re: /\btime\b|equipe|1:1|1 a 1|conferir|conferencia|numeros|indicador|win rate|validar|treinar|treinamento|acompanh|pauta|reuniao de segunda|corrigir|duplica|ensinar|mentoria|liderar|delegar|cobrar/ },
];

const REGRAS_HABITO = [
  { n: 8, re: /treinar|treinamento|ensinar|duplica|formar|multiplicar/ },
  { n: 7, re: /numeros|verific|indicador|win rate|metas?\b|medir|conferir|resultado|placar|relatorio/ },
  { n: 6, re: /follow|fechamento|fechar|ppv|acompanh|proposta|negocia/ },
  { n: 5, re: /apresenta|reuniao com cliente|demonstra/ },
  { n: 4, re: /contato|convite|convidar|f\.?o\.?r\.?m|script|mensagem|ligar|whatsapp/ },
  { n: 3, re: /lista|networking|prospec|indicac|contatos novos/ },
  { n: 2, re: /rotina|compromisso|treino|gratidao|disciplina|planejamento do dia/ },
  { n: 1, re: /sonho|quadro|visao de futuro|proposito/ },
];

/** Lê o título e diz mentalidade, Hábito e peso — com o porquê. */
export function classificarAcao(titulo, mentalidadeFixa = null) {
  const t = semAcento(titulo);
  const achada = REGRAS_MENTALIDADE.find((r) => r.re.test(t));
  const mentalidade = mentalidadeDe(mentalidadeFixa)?.id || achada?.id || 'executivo';
  const foco = habitosDaMentalidade(mentalidade);
  const lido = REGRAS_HABITO.find((r) => r.re.test(t))?.n || null;
  // o Hábito lido tem que estar na trilha da mentalidade; se não estiver, o mais perto dela
  const habito = lido == null ? null : (foco.includes(lido) ? lido : foco.reduce((m, n) => (Math.abs(n - lido) < Math.abs(m - lido) ? n : m), foco[0]));
  const { peso, porque } = pesoComMentalidade(titulo, mentalidade);
  return {
    mentalidade, habito, peso, porque,
    porqueMentalidade: mentalidadeFixa ? 'escolhida por você' : (achada ? `pelo texto: fala de ${achada.id === 'ceo' ? 'sistema/diretoria' : 'time/números'}` : 'pelo texto: ação da própria mão'),
  };
}

/** O catálogo inicial — cada linha já com a classificação da régua. */
const BASE = [
  // ── executivo: a própria mão (Hábitos 1 a 5) ──
  ['Escrever o sonho do ciclo no quadro', 'executivo', 1],
  ['Gerar e cumprir a Rotina Perfeita do dia', 'executivo', 2],
  ['Qualificar 10 pessoas da lista de networking (1 a 5)', 'executivo', 3],
  ['Fazer 20 contatos com F.O.R.M. e o próprio script', 'executivo', 4],
  ['Fazer 3 apresentações de sucesso (45 a 60 min)', 'executivo', 5],
  ['Postar o story da rotina (antes, durante e depois)', 'executivo', 2],
  ['Enviar o convite para a apresentação de amanhã', 'executivo', 4],
  // ── diretor: multiplicar e medir (Hábitos 5 a 8) ──
  ['Pegar as pautas da reunião de segunda', 'diretor', 7],
  ['Reunião 1:1 com cada executivo do time', 'diretor', 6],
  ['Conferir os números da semana (reuniões, win rate, PPV)', 'diretor', 7],
  ['Validar as tarefas do time (conferência dupla)', 'diretor', 7],
  ['Treinar o time no Hábito da semana', 'diretor', 8],
  ['Acompanhar o follow-up dos clientes em PPV do time', 'diretor', 6],
  ['Corrigir o gargalo apontado na reunião de segunda', 'diretor', 7],
  // ── CEO: construir o sistema (Hábitos 5 a 8) ──
  ['Preparar a reunião de diretoria de segunda', 'ceo', 7],
  ['Revisar o planejamento executivo do ciclo', 'ceo', 7],
  ['Decidir com os números: o gargalo da empresa nesta semana', 'ceo', 7],
  ['Formar um diretor novo (plano de 30 dias)', 'ceo', 8],
  ['Desenhar o processo que hoje depende de uma pessoa só', 'ceo', 8],
  ['Apresentar a estratégia do trimestre para a diretoria', 'ceo', 5],
];

export const ACOES_PADRAO = BASE.map(([titulo, mentalidade, habito]) => ({
  id: `padrao:${semAcento(titulo).replace(/[^a-z0-9]+/g, '-')}`,
  titulo, mentalidade, habito,
  peso: pesoComMentalidade(titulo, mentalidade).peso,
  categoria: 'mentoria',
  padrao: true,
}));

/** Uma lista só: o banco por cima do padrão (mesmo título = a do banco vale), ordenada por mentalidade e título. */
export function catalogoJunto(padrao = ACOES_PADRAO, doBanco = []) {
  const chave = (a) => semAcento(a.titulo).trim();
  const mapa = new Map();
  for (const a of padrao) mapa.set(chave(a), a);
  for (const a of Array.isArray(doBanco) ? doBanco : []) if (a?.titulo) mapa.set(chave(a), { ...a, padrao: false });
  const ordem = { executivo: 0, diretor: 1, ceo: 2 };
  return [...mapa.values()].sort((a, b) => (ordem[a.mentalidade] ?? 9) - (ordem[b.mentalidade] ?? 9) || a.titulo.localeCompare(b.titulo, 'pt-BR'));
}

/** Já existe no catálogo? (por título, sem acento nem caixa) */
export const jaNoCatalogo = (catalogo, titulo) => catalogo.some((a) => semAcento(a.titulo).trim() === semAcento(titulo).trim());

/** A linha pra gravar em xperf_acoes a partir do que está no formulário. */
export function acaoParaGravar({ titulo, mentalidade, habito, peso, categoria, criadoPorId }) {
  return {
    titulo: String(titulo || '').trim(),
    mentalidade: mentalidadeDe(mentalidade)?.id || 'executivo',
    habito: habito ? Number(habito) : null,
    peso: Math.min(6, Math.max(1, Number(peso) || 3)),
    categoria: categoria || 'mentoria',
    criado_por_id: criadoPorId || null,
  };
}
