// 🏛️ X-PERFORMANCE — o planejamento executivo da diretoria.
//
// DE ONDE VEIO (ditado pelo dono em 06/09/2026): "mentalidade do executivo,
// mentalidade do diretor e do CEO... toda segunda-feira a gente tem uma
// reunião, eu quero visualizar isso dentro do sistema, onde tem tópicos que a
// gente precisa sempre de documentos... com muito planejamento, um sistema
// igual Trello... isso vira produção dentro do planejamento de acordo com cada
// membro da diretoria... cada diretor e executivo tem um fixo e eles têm os
// entregáveis para serem sócios."
//
// ── AS TRÊS DECISÕES QUE SUSTENTAM ESTE ARQUIVO ──────────────────────────────
//
// 1. A MENTALIDADE NÃO É CONTEÚDO NOVO — É UMA LENTE SOBRE OS 8 HÁBITOS.
//    Executivo aprende a FAZER (hábitos 1 a 5, terminando na Apresentação de
//    Sucesso, que é onde ele fecha). Diretor e CEO veem tudo, mas respondem
//    pelos hábitos 5 a 8 — acompanhar, verificar, duplicar. Sem isso a gente
//    teria dois métodos concorrentes dentro da mesma faculdade.
//
// 2. NÃO EXISTE MOEDA NOVA. O X-GAME já tem Human Token, ligas e X-Pay. O
//    entregável da mentoria entra como categoria `mentoria`, que a tabela
//    metodo_tarefas JÁ prevê. Dois placares brigando é o mesmo que nenhum.
//
// 3. FIXO E SOCIEDADE SÃO DUAS CONTAS SEPARADAS, E NUNCA SE MISTURAM.
//    O fixo é do MÊS: paga o combinado. A sociedade é ACUMULADA: paga o que
//    ficou construído. Somar os dois faria a pessoa achar que bateu a meta do
//    mês e ficou mais perto de sócia — e não ficou. São barras diferentes, com
//    nomes diferentes, de propósito.

/** As três trilhas. `foco` são os números dos Hábitos pelos quais ela responde. */
export const TRILHAS = [
  {
    id: 'executivo',
    cargo: 'executivo',
    nome: 'Mentalidade do Executivo',
    lema: 'Fazer acontecer',
    foco: [1, 2, 3, 4, 5],
    entrega: 'o resultado da própria mão',
  },
  {
    id: 'diretor',
    cargo: 'diretor',
    nome: 'Mentalidade do Diretor',
    lema: 'Multiplicar e medir',
    foco: [5, 6, 7, 8],
    entrega: 'um time performando sem depender de empurrão',
  },
  {
    id: 'ceo',
    cargo: 'ceo',
    nome: 'Mentalidade do CEO',
    lema: 'Construir o sistema',
    foco: [5, 6, 7, 8],
    entrega: 'uma operação que roda sem você na sala',
  },
];

/** Trainee ainda não tem trilha própria: entra na do Executivo. */
export function trilhaDoCargo(cargo) {
  const achou = TRILHAS.find((t) => t.cargo === String(cargo || '').toLowerCase());
  return achou || TRILHAS[0];
}

export function habitosDaTrilha(id) {
  return (TRILHAS.find((t) => t.id === id) || TRILHAS[0]).foco;
}

// ── O QUADRO ────────────────────────────────────────────────────────────────
// As quatro colunas, na ordem em que o trabalho anda.
export const COLUNAS = [
  { id: 'combinado', nome: 'Combinado', ajuda: 'saiu da reunião, ainda não começou' },
  { id: 'fazendo', nome: 'Fazendo', ajuda: 'alguém está tocando agora' },
  { id: 'revisao', nome: 'Em revisão', ajuda: 'entregou; falta alguém validar' },
  { id: 'entregue', nome: 'Entregue', ajuda: 'validado — só aqui vira ponto' },
];

export const ORDEM_COLUNAS = COLUNAS.map((c) => c.id);

/**
 * 🔒 A REGRA QUE DÁ VALOR AO QUADRO: nada chega em "Entregue" sem passar por
 * "Em revisão". Entregue sem validação é o mesmo que não entregue — e como
 * "Entregue" é o que vira ponto no caminho da sociedade, deixar pular seria
 * deixar a pessoa se autopromover a sócia arrastando um card.
 * Voltar atrás é sempre permitido: trabalho empaca, e esconder isso não ajuda.
 */
export function podeMover(de, para) {
  const i = ORDEM_COLUNAS.indexOf(de);
  const j = ORDEM_COLUNAS.indexOf(para);
  if (i < 0 || j < 0) return false;
  if (j <= i) return true;            // voltar ou ficar: sempre pode
  return j === i + 1;                 // avançar: só de um em um
}

/**
 * 🔒 DIR-74 — NINGUÉM VALIDA O PRÓPRIO ENTREGÁVEL.
 *
 * A trava da DIR-72 obriga o card a PARAR na revisão; ela não obriga ninguém a
 * OLHAR. Sem esta segunda regra, a coluna do meio é um pedágio sem guarda: o
 * dono do card passa por ela sozinho e se promove a sócio arrastando duas
 * vezes em vez de uma.
 */
export function podeValidar(item, quemId) {
  return !!item && !!quemId && String(item.dono_id) !== String(quemId);
}

/**
 * Move sem mutar a lista. Devolve a MESMA lista quando o movimento é proibido.
 *
 * DIR-74 — o carimbo da validação é posto AQUI, e não na tela, porque a tela
 * grava no banco e atualiza o estado local por caminhos diferentes: deixar cada
 * um carimbar do seu jeito é como o placar da tela e o do banco divergem.
 * Voltar de "Entregue" APAGA o carimbo — validação de um estado que a peça não
 * ocupa mais é mentira guardada.
 */
export function moverEntregavel(lista, id, para, { validadoPorId = null, validadoEm = null } = {}) {
  const arr = Array.isArray(lista) ? lista : [];
  const alvo = arr.find((e) => e.id === id);
  if (!alvo || !podeMover(alvo.coluna, para)) return arr;
  if (para === 'entregue' && !podeValidar(alvo, validadoPorId)) return arr;
  const carimbo = para === 'entregue'
    ? { validado_por_id: validadoPorId, validado_em: validadoEm }
    : { validado_por_id: null, validado_em: null };
  return arr.map((e) => (e.id === id ? { ...e, coluna: para, ...carimbo } : e));
}

// ── PONTOS E O CAMINHO PRA SOCIEDADE ────────────────────────────────────────
/** Peso do entregável: de 1 (rotina) a 5 (muda o jogo). */
export const PESO_MAX = 5;
/** Quantos pontos acumulados abrem a conversa de sociedade. Régua do dono. */
export const META_SOCIEDADE = 100;

/**
 * Entregável que conta ponto: está em "Entregue" E tem carimbo de quem validou,
 * e esse alguém não é o dono. DIR-74 — sem a segunda metade, o carimbo seria
 * decorativo e a revisão, um pedágio sem guarda.
 */
export function contaPonto(e) {
  return !!e && e.coluna === 'entregue' && !!e.validado_por_id && podeValidar(e, e.validado_por_id);
}

/** Só entregável VALIDADO POR OUTRA PESSOA conta. Em revisão vale zero. */
export function pontosDaPessoa(entregaveis, pessoaId) {
  return (Array.isArray(entregaveis) ? entregaveis : [])
    .filter((e) => contaPonto(e) && e.dono_id === pessoaId)
    .reduce((s, e) => s + Math.min(PESO_MAX, Math.max(0, Number(e.peso) || 0)), 0);
}

// ── 🚪 OS TRÊS PORTÕES DA SOCIEDADE (DIR-74) ────────────────────────────────
// A régua de 100 pontos sozinha era catraca de mão única: quem entregou muito
// num semestre e nada no seguinte seguia parecendo perto de sócio. Barra premia
// ACERVO; sociedade se decide por RITMO. Por isso três portões que valem juntos,
// e não uma nota só — o número que faltava não era maior, era outro.
//
// Os três valores são RÉGUA DO DONO, não lei da natureza: estão aqui em cima,
// nomeados, pra ele trocar sem procurar no meio do código.
export const SEMANAS_JANELA = 12;   // o passado que a consistência olha
export const SEMANAS_MINIMAS = 8;   // quantas delas precisam ter entrega
export const HABITO_DUPLICACAO = 8; // "Duplicação dos 8 Hábitos"

/**
 * Em quantas das últimas `SEMANAS_JANELA` semanas a pessoa teve pelo menos um
 * entregável validado. Conta SEMANAS, não entregáveis: dez cards numa semana e
 * nada nas outras onze é um pico, não é ritmo — e a diferença entre os dois é
 * exatamente o que este portão existe pra ver.
 */
export function semanasComEntrega({ entregaveis = [], pessoaId, hojeISO, janela = SEMANAS_JANELA } = {}) {
  const fim = segundaDaSemana(hojeISO);
  if (!fim) return { semanas: 0, janela };
  const limite = new Date(`${fim}T12:00:00`);
  limite.setDate(limite.getDate() - 7 * (janela - 1));
  const primeira = segundaDaSemana(limite.toISOString().slice(0, 10));
  const distintas = new Set(
    (Array.isArray(entregaveis) ? entregaveis : [])
      .filter((e) => contaPonto(e) && e.dono_id === pessoaId && e.validado_em)
      .map((e) => segundaDaSemana(String(e.validado_em).slice(0, 10)))
      .filter((seg) => seg && seg >= primeira && seg <= fim),
  );
  return { semanas: distintas.size, janela };
}

/**
 * Os três portões, com o número de cada um na mão pra tela mostrar. A conversa
 * de sociedade abre quando os TRÊS estão acesos — não quando a média fecha.
 * Média deixaria a duplicação ser compensada por volume, e é justamente ela que
 * separa sócio de funcionário caro.
 */
export function portoesDaSociedade({ entregaveis = [], pessoaId, hojeISO, meta = META_SOCIEDADE, minimo = SEMANAS_MINIMAS } = {}) {
  const meus = (Array.isArray(entregaveis) ? entregaveis : []).filter((e) => e.dono_id === pessoaId);
  const pontos = pontosDaPessoa(entregaveis, pessoaId);
  const { semanas, janela } = semanasComEntrega({ entregaveis, pessoaId, hojeISO });
  const duplicou = meus.filter((e) => contaPonto(e) && Number(e.habito) === HABITO_DUPLICACAO).length;
  const portoes = [
    {
      id: 'peso', titulo: 'Peso entregue', valor: pontos, alvo: meta,
      aberto: pontos >= meta, unidade: 'pontos',
      ajuda: 'o tamanho do que ficou construído — só entregável validado por outra pessoa',
    },
    {
      id: 'consistencia', titulo: 'Consistência', valor: semanas, alvo: minimo,
      aberto: semanas >= minimo, unidade: `das últimas ${janela} semanas`,
      ajuda: 'ritmo, não pico: dez cards numa semana e nada nas outras onze não abre este',
    },
    {
      id: 'duplicacao', titulo: 'Duplicação', valor: duplicou, alvo: 1,
      aberto: duplicou >= 1, unidade: `entrega do Hábito ${HABITO_DUPLICACAO}`,
      ajuda: 'formou gente. Sócio que não duplicou não é sócio, é funcionário caro',
    },
  ];
  return { portoes, abertos: portoes.filter((p) => p.aberto).length, total: portoes.length, liberado: portoes.every((p) => p.aberto) };
}

export function progressoSociedade(pontos, meta = META_SOCIEDADE) {
  const p = Math.max(0, Number(pontos) || 0);
  const m = Math.max(1, Number(meta) || 1);
  return { pontos: p, meta: m, pct: Math.min(100, Math.round((p / m) * 100)), atingiu: p >= m };
}

// ── A REUNIÃO DE SEGUNDA ────────────────────────────────────────────────────
/**
 * A pauta é FIXA e se repete toda semana. É isso que transforma anotação em
 * série histórica: como o bloco tem sempre o mesmo nome, dá pra pôr o gargalo
 * desta semana ao lado do da semana passada. Documento solto não faz isso.
 */
export const PAUTA_PADRAO = [
  { id: 'numeros', titulo: 'Os números da semana', ajuda: 'o que aconteceu, sem adjetivo' },
  { id: 'gargalo', titulo: 'O gargalo', ajuda: 'o que travou, e onde exatamente' },
  { id: 'decisoes', titulo: 'Decisões', ajuda: 'o que fica decidido a partir de hoje' },
  { id: 'compromissos', titulo: 'Compromissos', ajuda: 'quem entrega o quê, até quando — vira card no quadro' },
];

/** A segunda da semana de `hoje`. Se hoje é segunda, é hoje. */
export function segundaDaSemana(hojeISO) {
  const d = new Date(`${String(hojeISO).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const desloc = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - desloc);
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return iso(d);
}

/** A PRÓXIMA segunda a partir de hoje (hoje, se hoje for segunda). */
export function proximaSegunda(hojeISO) {
  const d = new Date(`${String(hojeISO).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const faltam = (8 - d.getDay()) % 7; // domingo=0 → 1; segunda=1 → 0
  d.setDate(d.getDate() + faltam);
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return iso(d);
}

/**
 * O encontro da semana, pronto pra tela: a pauta com o que já foi escrito, e o
 * aviso de bloco vazio — porque reunião com bloco em branco é reunião que não
 * foi documentada, e isso tem que aparecer.
 */
export function encontroDaSemana(encontros, hojeISO) {
  const dia = segundaDaSemana(hojeISO);
  const salvo = (Array.isArray(encontros) ? encontros : []).find((e) => String(e.data).slice(0, 10) === dia);
  const blocos = PAUTA_PADRAO.map((b) => ({
    ...b,
    texto: (salvo?.blocos && salvo.blocos[b.id]) || '',
    vazio: !((salvo?.blocos && salvo.blocos[b.id]) || '').trim(),
  }));
  return {
    data: dia,
    existe: !!salvo,
    id: salvo?.id || null,
    blocos,
    preenchidos: blocos.filter((b) => !b.vazio).length,
    total: blocos.length,
  };
}

/**
 * O placar da pessoa na tela: as DUAS contas, lado a lado e separadas.
 * `fixo` vem pronto do X-Game (X-Pay do dia/mês) — este arquivo não recalcula
 * dinheiro; ele só junta com o acumulado da sociedade pra tela mostrar as duas.
 */
// `hojeISO` entra por parâmetro, e não do relógio de dentro: função que lê a
// hora sozinha vira teste que passa de manhã e falha de madrugada. Já aconteceu
// duas vezes nesta casa (a linha do tempo da DIR-49 e o resumo da semana).
export function resumoDaPessoa({ entregaveis = [], pessoaId, fixoMes = null, meta = META_SOCIEDADE, hojeISO } = {}) {
  const meus = (Array.isArray(entregaveis) ? entregaveis : []).filter((e) => e.dono_id === pessoaId);
  const hoje = String(hojeISO || '').slice(0, 10);
  return {
    fixo: fixoMes,
    sociedade: progressoSociedade(pontosDaPessoa(entregaveis, pessoaId), meta),
    portoes: portoesDaSociedade({ entregaveis, pessoaId, hojeISO, meta }),
    porColuna: ORDEM_COLUNAS.reduce((acc, c) => ({ ...acc, [c]: meus.filter((e) => e.coluna === c).length }), {}),
    atrasados: hoje
      ? meus.filter((e) => e.coluna !== 'entregue' && e.prazo && String(e.prazo).slice(0, 10) < hoje).length
      : 0,
  };
}
