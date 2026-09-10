// 📄 O LAUDO DAS COMPROVAÇÕES — a Fase 1 (10/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// PRA QUE SERVE
// ═══════════════════════════════════════════════════════════════════════════
// Dono: "quando o usuário reclamar de algum erro ou problema, podermos ver na
// hora se foi mal uso do usuário ou se de fato é erro."
//
// Ou seja: o laudo é uma peça de DEFESA de quem reclama, não de acusação. Ele
// só presta se conseguir dizer "não foi ela" quando não foi ela — e se
// souber CALAR quando não tem como saber.
//
// Este arquivo é PURO: monta os dados do laudo. Quem desenha o PDF é a Fase 2;
// quem decide quem pode abrir é a Fase 3. Aqui não há tela, PDF nem Supabase —
// é tudo testável em node, que é o que permite provar as regras abaixo.
//
// ⚠️ O QUE ELE NÃO FAZ, DE PROPÓSITO
// Não conclui culpa, não dá nota e não mexe em ponto nenhum. O motor do
// X-GAME lê `t.feito` (xgame.js); o laudo lê a comprovação ao lado e não
// escreve nada. Ponderar aprovação na performance é outra fase, e está fora.
import { leituraDoRastro } from './rastroDaComprovacao.js';
import { rotuloDataComprovacao, semAcentoFila } from './filaComprovacoes.js';

/**
 * O status de uma comprovação.
 *
 * ⚠️ Regra COPIADA de Comprovacoes.jsx e XGameAdmin.jsx, onde ela já existia
 * duas vezes idêntica. Não dá pra importar de lá (são telas: arrastam React e
 * o cliente do Supabase pra dentro de qualquer teste). Um teste-guarda compara
 * as três cópias texto a texto — se alguém mudar uma, a suíte quebra. É a
 * defesa possível contra a divergência que já custou caro no print (PR #224).
 */
export const statusDaComprovacao = (c) => c?.status || (c?.valido ? 'aprovada_ia' : 'reprovada');

/** Os rótulos que a pessoa lê — os mesmos da fila, pra não inventar vocabulário. */
export const ROTULO_STATUS = {
  em_analise: 'em análise',
  aprovada_ia: 'aprovada pela IA',
  aprovada_manual: 'aprovada pelo gestor',
  aprovada_ritual: 'ritual aprovado',
  reprovada: 'reprovada',
};

const APROVADOS = new Set(['aprovada_ia', 'aprovada_manual', 'aprovada_ritual']);

/** Aprovada, reprovada ou ainda em análise — o eixo que o dono pediu ("negadas e aceitas"). */
export const desfechoDoStatus = (s) => (APROVADOS.has(s) ? 'aprovada' : s === 'em_analise' ? 'em_analise' : 'reprovada');

/**
 * 🔴 ESTE REGISTRO TEM RASTRO TÉCNICO?
 *
 * O rastro (tentativas/falhas/IA fora) começou a ser gravado em 10/09/2026.
 * Comprovação anterior a isso NÃO tem os campos — e ler "sem sinal técnico"
 * nela seria exatamente a mentira confiante que o rastro existe pra evitar,
 * só que ao contrário: silêncio virando atestado de bom uso.
 *
 * `rastroDa` SEMPRE grava `tentativas`. A ausência dele é a marca do "antes".
 */
export function temRastro(comprovacao) {
  return Number.isFinite(Number(comprovacao?.tentativas)) && Number(comprovacao?.tentativas) > 0;
}

/**
 * O motivo escrito, na ordem de quem tem a última palavra: o gestor decide
 * por cima da IA, então o motivo dele vem primeiro quando existe.
 */
export function motivoDaComprovacao(c) {
  return String(c?.motivo_gestor || c?.veredito_ia?.motivo || '').trim();
}

const PARTES_BRASILIA = (d) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
}).formatToParts(d).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});

/**
 * A hora em que a comprovação foi concluída, EM BRASÍLIA, com os segundos.
 *
 * ⚠️ Brasília forçada, nunca o fuso do aparelho — mesmo bug de classe já
 * corrigido em dataISO()/minutosBrasilia() (DIR-129/134). Um laudo aberto de
 * um celular com o fuso trocado mostraria a pessoa entregando numa hora que
 * ela não entregou, e é a HORA que decide o ritual.
 *
 * Com SEGUNDOS de propósito: no caso de 10/09 a diferença entre "perdeu" e
 * "não perdeu" foi 05:34:12 contra o corte das 05:30 — minuto redondo
 * esconderia justamente o que se quer conferir.
 */
export function horaConcluida(quandoISO) {
  if (!quandoISO) return null;
  const d = new Date(quandoISO);
  if (Number.isNaN(d.getTime())) return null;
  const p = PARTES_BRASILIA(d);
  return `${p.hour}:${p.minute}:${p.second}`;
}

/**
 * Uma linha do laudo, a partir de uma tarefa com comprovação.
 *
 * `feito` entra ao lado do status porque são coisas DIFERENTES e o laudo tem
 * que mostrar as duas: o motor conta `feito`; o status é o julgamento da
 * entrega. Houve caso real de `status: 'reprovada'` com `feito: true` — quem
 * lesse só o status concluiria que a pessoa perdeu o dia, e não perdeu.
 */
export function linhaDoLaudo(t = {}) {
  const c = t?.comprovacao || {};
  const status = statusDaComprovacao(c);
  const comRastro = temRastro(c);
  return {
    id: t.id ?? null,
    hora: t.hora || null,
    concluidaAs: horaConcluida(c.quando),
    titulo: String(t.titulo || '').trim(),
    tipo: c.tipo || null,
    status,
    rotulo: ROTULO_STATUS[status] || status,
    desfecho: desfechoDoStatus(status),
    feito: !!t.feito,
    motivo: motivoDaComprovacao(c),
    oQueViu: String(c?.veredito_ia?.o_que_viu || '').trim(),
    comRastro,
    tentativas: comRastro ? Number(c.tentativas) : null,
    tempoTelaS: Number.isFinite(Number(c?.tempo_tela_s)) ? Number(c.tempo_tela_s) : null,
    falhas: Array.isArray(c?.falhas) ? c.falhas : [],
    // Sem rastro não há leitura: um registro antigo não pode ser lido como
    // "normal" só porque não tem o campo que ninguém gravava ainda.
    leitura: comRastro ? leituraDoRastro(c) : { sinal: 'sem_rastro', texto: 'registro anterior ao rastro técnico' },
  };
}

/** Sem hora vai pro fim; com hora, em ordem crescente. Empate mantém a ordem de chegada. */
const emMin = (h) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(h || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
export function ordenarLinhas(linhas = []) {
  return linhas
    .map((l, i) => ({ l, i, m: emMin(l.hora) }))
    .sort((a, b) => (a.m === null) - (b.m === null) || (a.m ?? 0) - (b.m ?? 0) || a.i - b.i)
    .map((x) => x.l);
}

/**
 * 🔴 O VEREDITO DO LAUDO — a única frase que alguém apressado vai ler.
 *
 * Por isso ela é a mais cuidadosa do arquivo, e a ordem NÃO é por gravidade
 * do desfecho, é por quem tem o direito de falar primeiro:
 *
 *   1. falha técnica registrada — a defesa vem antes de tudo;
 *   2. sinal de olhar (muitas tentativas, tela curta) — sem concluir nada;
 *   3. registro sem rastro — dizer "não sei" em vez de dar um atestado falso;
 *   4. normal.
 *
 * Nunca diz "mal uso". Reprovação SOZINHA nunca vira veredito: reprovar é o
 * julgamento da entrega; este veredito é sobre o SISTEMA ter funcionado.
 * Foi confundir os dois que quase transformou uma falha nossa em culpa da
 * Iara, em 10/09.
 */
export function vereditoDoLaudo(linhas = []) {
  const comErro = linhas.filter((l) => l.leitura?.sinal === 'erro_do_sistema');
  const paraOlhar = linhas.filter((l) => l.leitura?.sinal === 'olhar');
  const semRastro = linhas.filter((l) => l.leitura?.sinal === 'sem_rastro');
  const ressalva = semRastro.length && semRastro.length < linhas.length
    ? ` (${semRastro.length} de ${linhas.length} sem rastro técnico)` : '';
  if (comErro.length) {
    return {
      sinal: 'erro_do_sistema',
      texto: `${comErro.length} de ${linhas.length} entrega(s) com falha técnica registrada — reprovação aqui NÃO é mal uso enquanto isto não for conferido${ressalva}.`,
    };
  }
  if (paraOlhar.length) {
    return {
      sinal: 'olhar',
      texto: `${paraOlhar.length} de ${linhas.length} entrega(s) com sinal que vale conferir — não é conclusão, é onde olhar${ressalva}.`,
    };
  }
  if (semRastro.length === linhas.length && linhas.length) {
    return { sinal: 'sem_rastro', texto: 'Registros anteriores ao rastro técnico — este laudo não tem como dizer se houve falha do sistema.' };
  }
  if (!linhas.length) return { sinal: 'sem_rastro', texto: 'Nenhuma comprovação neste dia.' };
  return { sinal: 'normal', texto: `Nenhum sinal técnico nas ${linhas.length} entrega(s) do dia${ressalva}.` };
}

/**
 * O laudo de UMA pessoa em UM dia — o que a Fase 2 imprime.
 * `itens` já vem filtrado por quem chama (a tela tem a lista na mão).
 */
export function laudoDoDia({ itens = [], data = null, pessoaId = null, nome = '' } = {}) {
  const linhas = ordenarLinhas(itens.map(linhaDoLaudo));
  const conta = (d) => linhas.filter((l) => l.desfecho === d).length;
  return {
    pessoaId,
    nome: String(nome || '').trim() || String(pessoaId || ''),
    data,
    rotuloData: data ? rotuloDataComprovacao(data) : '',
    total: linhas.length,
    aprovadas: conta('aprovada'),
    reprovadas: conta('reprovada'),
    emAnalise: conta('em_analise'),
    // Quantas o motor conta como feitas — não é o mesmo que "aprovadas".
    feitas: linhas.filter((l) => l.feito).length,
    veredito: vereditoDoLaudo(linhas),
    linhas,
  };
}

/**
 * Os laudos de um dia inteiro, um por pessoa, na ordem em que as pessoas
 * aparecem na lista (a mesma da fila — agrupar nunca reordena por conta
 * própria, mesma regra de filaComprovacoes.js).
 */
export function laudosDoDia({ itens = [], data = null, nomeDe = (id) => id } = {}) {
  const doDia = data ? itens.filter((t) => String(t?.data || '').slice(0, 10) === data) : itens;
  const ordem = [];
  const porPessoa = new Map();
  doDia.forEach((t) => {
    if (!porPessoa.has(t.user_id)) { porPessoa.set(t.user_id, []); ordem.push(t.user_id); }
    porPessoa.get(t.user_id).push(t);
  });
  return ordem.map((id) => laudoDoDia({ itens: porPessoa.get(id), data, pessoaId: id, nome: nomeDe(id) }));
}

/** O nome do arquivo do PDF — sem acento, sem espaço, com a data na frente pra ordenar sozinho. */
export function nomeDoLaudo({ data, nome }) {
  const limpo = semAcentoFila(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pessoa';
  return `laudo-${String(data || 'sem-data').slice(0, 10)}-${limpo}.pdf`;
}
