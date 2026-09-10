// 🌅 O RITUAL DO AMANHECER EM TRÊS BLOCOS — 10/09/2026
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ISTO EXISTE
// ═══════════════════════════════════════════════════════════════════════════
// Luiz Sant'anna, no áudio de 10/09: "a galera está sentindo um desafio no
// ritual... vamos dividir em três... e se ele fez alguma coisa errada, a
// plataforma precisa sinalizar."
//
// 🔴 O que o banco mostrava quando este arquivo nasceu:
//
//     40 pessoas com a tarefa do ritual em 10/09 ......... 40
//     tentaram ............................................ 5
//     aprovadas ........................................... 1
//
//     08/09 (janela até 07:15) ... 8 tentativas, 0 reprovadas
//     09/09 (janela até 05:15) ... 5 tentativas, 3 reprovadas
//     10/09 (janela até 05:30) ... 5 tentativas, 4 reprovadas
//
// E o detalhe que explica tudo: a Iara perdeu por 4min12s. A Elenice, no dia
// anterior, por 2min25s. O Ribeiro gastou 7min40s de tela e foi reprovado no
// FIM, pelo ambiente. Os 23 rituais da história inteira têm ZERO vídeo salvo.
//
// A causa não é preguiça: é que o ritual era TUDO OU NADA. Cinco a oito
// minutos de trabalho, e o veredito só no fim — com três formas diferentes de
// perder tudo (o relógio virou, o ambiente não convenceu, o vídeo não subiu).
//
// 🟢 A cura é o que o Luiz pediu: TRÊS BLOCOS, cada um gravando sozinho.
// Perder um bloco deixa de significar perder a manhã.
//
// ═══════════════════════════════════════════════════════════════════════════
// AS DUAS RÉGUAS DE TEMPO — E POR QUE SÃO DUAS
// ═══════════════════════════════════════════════════════════════════════════
// O dono perguntou se cronômetro por pessoa era a melhor forma. Sozinho, NÃO
// seria: se o relógio só começa quando a pessoa abre, quem abre às 9h da manhã
// ganha os mesmos 30 minutos, e o "Amanhecer" morre — some justamente o que o
// ritual existe pra treinar.
//
// Por isso são DUAS réguas, e cada uma responde por uma coisa:
//
//   1. JANELA DE ABERTURA (04:40–05:30, de RITUAL_INICIO_MIN/FIM_MIN, sem
//      mudança): protege o "acordar cedo". Passou de 05:30, não abre.
//   2. CRONÔMETRO DE CONCLUSÃO (30 min a partir da abertura): protege quem
//      abriu na hora certa e demorou. É esta que salva a Iara.
//
// Uma sem a outra quebra: só janela pune quem acordou e foi lento; só
// cronômetro apaga o amanhecer.

/** Os três blocos, na ordem em que acontecem. */
export const BLOCOS = Object.freeze(['acordei', 'gratidao', 'visualizacao']);

/** Quanto tempo a pessoa tem pra CONCLUIR, depois de abrir. */
export const RITUAL_MINUTOS_PARA_CONCLUIR = 30;
const MS_DO_PRAZO = RITUAL_MINUTOS_PARA_CONCLUIR * 60 * 1000;

/** Rótulo curto de cada bloco — o mesmo texto na barra e nas pendências. */
export const ROTULO_DO_BLOCO = Object.freeze({
  acordei: 'Acordei',
  gratidao: 'Gratidão',
  visualizacao: 'Visualização',
});

const ms = (quando) => {
  if (!quando) return null;
  const t = new Date(quando).getTime();
  return Number.isFinite(t) ? t : null;
};

/**
 * O instante em que o prazo estoura, em ms — ou `null` se ainda não abriu.
 *
 * 🔴 Sem o `null`, um ritual nunca aberto teria prazo `0 + 30min` (1970) e
 * nasceria expirado. Quem não começou não está atrasado.
 */
export function prazoDoRitual(abertoEm) {
  const inicio = ms(abertoEm);
  return inicio === null ? null : inicio + MS_DO_PRAZO;
}

/** Segundos que ainda restam (nunca negativo), ou `null` se não abriu. */
export function segundosRestantes({ abertoEm, agora = Date.now() } = {}) {
  const prazo = prazoDoRitual(abertoEm);
  if (prazo === null) return null;
  return Math.max(0, Math.round((prazo - agora) / 1000));
}

/** O prazo estourou? Ritual não aberto NUNCA está expirado. */
export function ritualExpirado({ abertoEm, agora = Date.now() } = {}) {
  const prazo = prazoDoRitual(abertoEm);
  return prazo !== null && agora > prazo;
}

/** "faltam 12min" / "faltam 47s" / "acabou o tempo" — sempre na unidade que a pessoa entende. */
export function textoDoPrazo(seg) {
  if (seg === null || seg === undefined) return '';
  const s = Math.max(0, Math.round(seg));
  if (s === 0) return 'acabou o tempo';
  if (s < 60) return `faltam ${s}s`;
  return `faltam ${Math.ceil(s / 60)}min`;
}

const blocosDaComprovacao = (comprovacao) => {
  const b = comprovacao?.blocos;
  return b && typeof b === 'object' ? b : {};
};

/** Os blocos JÁ GRAVADOS, na ordem canônica. */
export function blocosFeitos(comprovacao) {
  const b = blocosDaComprovacao(comprovacao);
  return BLOCOS.filter((nome) => !!b[nome]);
}

/** O próximo bloco a fazer, ou `null` quando os três já estão em casa. */
export function proximoBloco(comprovacao) {
  const b = blocosDaComprovacao(comprovacao);
  return BLOCOS.find((nome) => !b[nome]) || null;
}

/** Os três blocos entregues? */
export function ritualCompleto(comprovacao) {
  return proximoBloco(comprovacao) === null;
}

/**
 * Este bloco foi recusado pela IA?
 *
 * 🔴 DIR-125 (decisão do dono, 09/09) vale SÓ pra visualização: "vai reprovar
 * automático... só em casos impossíveis, mas não precisa" — dúvida sobre o
 * AMBIENTE (é a casa dela?) conta como reprovação, pra nenhuma comprovação
 * ficar presa esperando um humano decidir.
 *
 * No print do bom dia é o contrário: dúvida ali é falta de contexto visual
 * (sem data na tela, foto de baixa qualidade), e o fluxo normal de print desta
 * casa PERGUNTA antes de reprovar. Tratar as duas dúvidas igual reprovaria
 * gente por má sorte de câmera logo no primeiro bloco, às 5h da manhã — que é
 * exatamente o atrito que este arquivo existe pra desmontar.
 */
export function blocoReprovado(nome, veredito) {
  const v = veredito?.veredito;
  if (v === 'reprovada') return true;
  return v === 'duvida' && nome === 'visualizacao';
}

/**
 * O que ficou faltando, DITO COM TODAS AS LETRAS.
 *
 * 🔴 O pedido do Luiz — "se ele fez alguma coisa errada, a plataforma precisa
 * sinalizar" — não é atendido por um toast que some em 4 segundos. Nenhuma
 * das 7 pessoas reprovadas em 09 e 10/09 consegue reler por que foi. Esta
 * lista é o que a tela mostra parada, e o que o registro guarda.
 */
export function pendenciasDoRitual(comprovacao) {
  const b = blocosDaComprovacao(comprovacao);
  const faltando = BLOCOS.filter((nome) => !b[nome]).map((nome) => ({
    bloco: nome,
    o_que: `${ROTULO_DO_BLOCO[nome]} não foi entregue`,
  }));
  // o vídeo é a única coisa que dá o selo BRILHANTE, e por isso é dita
  // separado: o bloco pode estar entregue e o vídeo, não.
  if (b.visualizacao && !b.visualizacao.video_path) {
    faltando.push({ bloco: 'visualizacao', o_que: 'A visualização foi entregue, mas sem o vídeo — é o vídeo que dá o selo BRILHANTE' });
  }
  // reprovação da IA em qualquer bloco também é pendência: ela é o "fez
  // alguma coisa errada" do áudio, e precisa aparecer junto do resto.
  for (const nome of BLOCOS) {
    const v = b[nome]?.veredito_ia;
    if (blocoReprovado(nome, v)) faltando.push({ bloco: nome, o_que: `${ROTULO_DO_BLOCO[nome]}: ${v.motivo || 'reprovado pela IA'}` });
  }
  return faltando;
}

/**
 * O selo, em quatro degraus.
 *
 * ⚠️ `brilhante` continua exigindo o VÍDEO — a régua do dono (DIR-89) não
 * mudou. O que nasce aqui é `parcial`: antes ele não existia porque não havia
 * meio-termo, e um ritual incompleto virava zero. Com bloco gravando sozinho,
 * meio-termo passou a ser um estado real e precisa de nome.
 */
export function seloDoRitual(comprovacao) {
  const b = blocosDaComprovacao(comprovacao);
  const feitos = blocosFeitos(comprovacao).length;
  if (feitos === 0) return 'nenhum';
  if (feitos < BLOCOS.length) return 'parcial';
  const reprovado = BLOCOS.some((n) => blocoReprovado(n, b[n]?.veredito_ia));
  if (reprovado) return 'parcial';
  return b.visualizacao?.video_path ? 'brilhante' : 'completo';
}

/** O status que vai pro registro, a partir do selo. */
export function statusDoRitual(comprovacao) {
  const selo = seloDoRitual(comprovacao);
  if (selo === 'brilhante' || selo === 'completo') return 'aprovada_ritual';
  if (selo === 'parcial') return 'ritual_parcial';
  return 'reprovada';
}

/**
 * A comprovação com um bloco a mais — sem apagar o que já estava lá.
 *
 * 🔴 Merge, nunca substituição: o bloco 3 chegando não pode levar embora os
 * blocos 1 e 2, que é justamente o que o dono pediu pra garantir ("se o
 * telefone morrer no bloco 3, os blocos 1 e 2 já estão em casa").
 */
export function comBloco(comprovacao, nome, dados = {}) {
  if (!BLOCOS.includes(nome)) return comprovacao || {};
  const base = comprovacao && typeof comprovacao === 'object' ? comprovacao : {};
  return {
    ...base,
    tipo: 'ritual',
    blocos: { ...blocosDaComprovacao(base), [nome]: { ...dados, quando: dados.quando || new Date().toISOString() } },
  };
}

/**
 * Um ritual de HOJE que já tem bloco gravado — pra reabrir onde parou.
 *
 * A comparação é pelo DIA em Brasília, não por "menos de 24h": às 5h da
 * manhã, "ontem" e "hoje" ficam a poucas horas de distância e uma janela
 * deslizante deixaria o ritual de ontem ressuscitar no de hoje.
 *
 * 🔴 E o dia lido é `aberto_dia`, gravado por quem abriu, NÃO um pedaço de
 * `aberto_em`. `aberto_em` é ISO em UTC: fatiar os 10 primeiros caracteres dá
 * a data de LONDRES, e o app inteiro conta o dia em Brasília (dataISO). Hoje
 * as duas batem porque a janela é de madrugada, mas basta a janela andar pra
 * noite e o ritual de ontem passaria a ressuscitar no de hoje.
 */
export function ritualRetomavel(comprovacao, hojeStr) {
  if (!comprovacao || comprovacao.tipo !== 'ritual') return false;
  if (!blocosFeitos(comprovacao).length) return false;
  if (ritualCompleto(comprovacao)) return false;
  const dia = String(comprovacao.aberto_dia || '');
  return !!dia && !!hojeStr && dia === String(hojeStr);
}
