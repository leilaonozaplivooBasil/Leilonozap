// 👔 O ELENCO DA JORNADA — DIR-78
//
// Os "bonequinhos" que o dono pediu, no nosso modelo de negócio: nada de coruja,
// nada de personagem de terceiro. Cinco papéis que existem de verdade no método,
// pra que o desenho ENSINE enquanto decora.
//
// Esta lib é só a REGRA (quem aparece, onde, em que pose). O desenho mora em
// ElencoBoneco.jsx e o movimento em elenco.css — separados de propósito: assim a
// regra é testável sem navegador, e o traço pode mudar sem quebrar teste nenhum.

/** Os cinco do elenco. As cores saem dos tokens da casa (src/index.css):
 *  verde #1B7A48, fogo #F35B12, ouro #F5C451, tinta #0D1310. */
export const ELENCO = {
  executivo: {
    nome: 'O Executivo',
    pele: '#E8B58A', cabelo: '#2B2118',
    terno: '#1F3A5F', ternoEsc: '#152840', camisa: '#F4F7FA', gravata: '#1B7A48',
  },
  mentor: {
    nome: 'O Mentor',
    pele: '#D9A473', cabelo: '#8C9199',
    terno: '#3B3F4A', ternoEsc: '#282B33', camisa: '#F4F7FA', gravata: '#A9781C',
    barba: true, oculos: true,
  },
  diretora: {
    nome: 'A Diretora',
    pele: '#8A5A3B', cabelo: '#1C1310',
    terno: '#6D2E5B', ternoEsc: '#4E1F41', camisa: '#F7F0F5', gravata: '#F35B12',
    cabeloLongo: true,
  },
  cliente: {
    nome: 'O Cliente',
    pele: '#F0C9A3', cabelo: '#B5651D',
    terno: '#0F766E', ternoEsc: '#0B5450', camisa: '#F2FBFA', gravata: '#FFA000',
  },
  duplicado: {
    nome: 'O Duplicado',
    pele: '#6B4226', cabelo: '#120C08',
    terno: '#1B7A48', ternoEsc: '#0F5230', camisa: '#F1F7F3', gravata: '#0D1310',
  },
};

/** O cinza da parada travada. Não é um sexto personagem: é o MESMO boneco
 *  apagado — por isso mora fora do ELENCO. */
export const APAGADO = {
  pele: '#C9CFD6', cabelo: '#8A9099',
  terno: '#9AA3AD', ternoEsc: '#7C858F', camisa: '#EEF1F4', gravata: '#8A9099',
};

export const POSES = ['parado', 'acena', 'aponta', 'alto', 'dorme'];

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// quem combina com a tarefa. A ordem importa: a primeira que casar vence.
const PAPEIS = [
  [/reuniao|apresenta|encontro|cliente|convite|contato|ligar|ligacao|whatsapp|mensagem/, 'cliente'],
  [/time|equipe|lideranca|duplica|treinar time|formar/, 'duplicado'],
  [/gestao|planejament|financeiro|caixa|meta|resultado|relatorio|verifica/, 'diretora'],
  [/mentoria|aula|treinament|curso|estudo|leitura|licao/, 'mentor'],
];

/** Qual dos cinco combina com o título da tarefa. Sem casar com nada, é o
 *  Executivo — que é o dono do dia e o padrão certo, não um "sobrou esse". */
export function personagemDaTarefa(titulo) {
  const t = semAcento(titulo);
  for (const [re, chave] of PAPEIS) if (re.test(t)) return chave;
  return 'executivo';
}

/** De quantas em quantas paradas aparece alguém. Uma figura POR parada lota o
 *  mapa e o mapa deixa de ser mapa — o Duolingo também espaça. */
export const PASSO_DO_ELENCO = 3;

/**
 * Quem aparece nesta parada, e como.
 *
 * A regra em uma frase: **a parada do momento SEMPRE tem alguém acenando**
 * (é o convite pro clique); as outras recebem figura de três em três.
 *
 * @returns {{chave:string, pose:string, apagado:boolean}|null} null = ninguém aqui.
 */
export function elencoDaParada({ indice, titulo, feito = false, atual = false, perdido = false }) {
  if (atual) return { chave: personagemDaTarefa(titulo), pose: 'acena', apagado: false };
  if (!Number.isInteger(indice) || indice < 0) return null;
  if (indice % PASSO_DO_ELENCO !== 0) return null;
  // travada ou perdida cochila: cinza, sem girar e sem rir. É o desenho
  // contando o estado — se ela ficasse animada igual às outras, viraria enfeite.
  if (!feito) return { chave: personagemDaTarefa(titulo), pose: 'dorme', apagado: true };
  return { chave: personagemDaTarefa(titulo), pose: 'parado', apagado: false };
}

/** As cores prontas pra desenhar, já resolvendo o cinza da travada. */
export function coresDo(chave, apagado = false) {
  const base = ELENCO[chave] || ELENCO.executivo;
  if (!apagado) return base;
  // mantém o formato do cabelo/barba/óculos (é a identidade), troca só a cor
  return { ...base, ...APAGADO };
}
