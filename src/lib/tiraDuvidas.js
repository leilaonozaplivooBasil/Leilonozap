// 🆘 TIRA DÚVIDAS 24h — as regras puras do atendimento.
//
// O PEDIDO (dono, 06/09/2026): "o agente autônomo para tirar dúvidas 24h deve
// ajudar sanando problemas e dúvidas dos usuários, e quando necessário, propor
// correção de bugs, erros e correções para mim".
//
// 🔴 A DECISÃO QUE MANDA NESTE ARQUIVO: a ficha de regras que vai pra IA é
// MONTADA A PARTIR DAS CONSTANTES DE VERDADE (src/lib/xgame.js), nunca copiada
// à mão. Um texto copiado envelhece calado: mudou RESUMO_MIN pra 500 e o
// atendimento segue jurando que são 400 — e aí a IA vira a nova fonte de
// informação errada, que é pior do que não ter atendimento nenhum.
// Foi exatamente esse tipo de descolamento (a tela dizendo uma coisa e a regra
// sendo outra) que gerou o chamado do Paim em 07/09.
import {
  TOKEN_MAX, APLICABILIDADE_MAX, MVM_MAX, TRAVA_SEM_ESTUDO, CICLO_DIAS_UTEIS,
  FAIXAS_TOKEN, RESUMO_MIN, cotacaoDoDia, LIGAS, TRAVA_SEM_PLATINA, EXECUTIVO_IDEAL, META_VENDAS_CICLO,
} from './xgame.js';

// tipos de chamado. `duvida` a IA resolve e encerra; o resto vira trabalho
// pro dono despachar.
export const TIPOS = ['duvida', 'bug', 'erro', 'correcao', 'otimizacao'];
export const TIPOS_QUE_VIRAM_TRABALHO = ['bug', 'erro', 'correcao', 'otimizacao'];

export const ROTULO_TIPO = {
  duvida: 'dúvida',
  bug: 'bug',
  erro: 'erro',
  correcao: 'correção',
  otimizacao: 'otimização',
};

export const STATUS = ['aberto', 'em_analise', 'resolvido', 'virou_demanda', 'descartado'];

export const LIMITE_PERGUNTA = 4000;

/** Um chamado que virou trabalho aparece na fila do dono. Dúvida respondida, não. */
export function viraTrabalho(tipo) {
  return TIPOS_QUE_VIRAM_TRABALHO.includes(String(tipo || ''));
}

/** Normaliza o que a IA devolveu — ela não define o vocabulário do sistema. */
export function normalizarTipo(bruto) {
  const t = String(bruto || '').toLowerCase().trim();
  return TIPOS.includes(t) ? t : 'duvida';
}

/** 1 = para tudo … 5 = quando der. Fora da faixa vira o meio. */
export function normalizarPrioridade(bruto) {
  const n = Math.round(Number(bruto));
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 3;
}

/** O chamado só sobe com pergunta de verdade — nem vazio, nem romance. */
export function validarChamado({ pergunta, imagemUrl } = {}) {
  const texto = String(pergunta || '').trim();
  if (!texto && !imagemUrl) return { valido: false, motivo: 'escreva a sua dúvida, grave um áudio ou anexe um print' };
  if (texto.length > LIMITE_PERGUNTA) return { valido: false, motivo: `texto muito longo (máximo ${LIMITE_PERGUNTA} caracteres)` };
  return { valido: true, motivo: '' };
}

const br = (n) => Number(n).toFixed(2).replace('.', ',');

/**
 * 📋 A FICHA DE REGRAS que vai no prompt — gerada dos números reais.
 * Se uma constante do X-GAME mudar, esta ficha muda junto, sem ninguém
 * lembrar de editar prompt nenhum.
 */
export function fichaDeRegras() {
  const faixas = FAIXAS_TOKEN
    .slice()
    .sort((a, b) => a.min - b.min)
    .map((f) => `${f.medalha} ${f.label}: a partir de ${br(f.min)}`)
    .join(' · ');

  const ligas = LIGAS
    .slice()
    .sort((a, b) => a.min - b.min)
    .map((l) => `${l.emoji} ${l.label}: a partir de ${br(l.min)}`)
    .join(' · ');

  return `REGRAS REAIS DO X-GAME (valores lidos do código agora, não de memória):
- Ciclo: ${CICLO_DIAS_UTEIS} dias úteis, começando no primeiro dia útil do mês.
- MvM do Dia: começa em ${br(MVM_MAX)} e CAI em tempo real. Cada tarefa que passa da hora sem ser marcada desconta ${br(MVM_MAX)} dividido pelo número de tarefas do dia. Não é castigo do sistema: é o relógio andando.
- Aplicabilidade: constância no ciclo, vale no máximo ${br(APLICABILIDADE_MAX)}.
- Human Token DO DIA (a nota de hoje) = MvM do Dia + Aplicabilidade, teto ${br(TOKEN_MAX)}. Faixas do dia: ${faixas}.
- TRAVA DO ESTUDO NO TOKEN DO DIA: sem constância na tarefa de leitura, o Human Token DO DIA trava em ${br(TRAVA_SEM_ESTUDO)} — um centésimo abaixo do ouro do dia, de propósito. Isso vale só pra nota de hoje.
- Cotação do dia: ${br(cotacaoDoDia(1))} no primeiro dia útil do ciclo, caindo ${br(cotacaoDoDia(1) - cotacaoDoDia(2))} por dia útil até ${br(cotacaoDoDia(CICLO_DIAS_UTEIS))} no último. Fazer cedo vale mais — "ANTECIPAÇÃO É PODER".
- Pontos do dia: 10 por tarefa feita, +5 se feita dentro da janela do horário, tudo multiplicado pela cotação do dia.
- COMPROVAÇÃO DE ESTUDO: exige a FOTO do estudo E um resumo DIGITADO de no mínimo ${RESUMO_MIN} caracteres (umas 6 linhas). ${RESUMO_MIN} é MÍNIMO, não limite. Colar é bloqueado de propósito: digitar é parte do treino.
- HUMAN TOKEN OFICIAL DO CICLO (o "Onde estou × Executivo Ideal", outra conta, NÃO CONFUNDIR com a do dia acima): soma MvM da votação + Produção + Real Time + Bônus/Estudo + Vendas (meta ${META_VENDAS_CICLO} no ciclo), teto ${br(TOKEN_MAX)}. Ligas do ciclo: ${ligas}.
- TRAVA DO ESTUDO NO CICLO (DIR-113 — CORRIGIDA, não confundir com a trava do dia acima): sem leitura de semana + estudo de fim de semana em dia, o token OFICIAL DO CICLO trava em ${br(TRAVA_SEM_PLATINA)} — isso bloqueia só a LIGA PLATINA. A LIGA OURO do ciclo continua alcançável mesmo sem estudar em casa, batendo Produção/MvM/Vendas. NUNCA diga que sem estudo a pessoa não chega ao ouro do ciclo — isso está errado.
- Executivo Ideal (formação de 90 dias): manter, ciclo após ciclo, MvM ≥ ${Math.round(EXECUTIVO_IDEAL.mvm * 100)}%, Produção ≥ ${Math.round(EXECUTIVO_IDEAL.producao * 100)}%, Real Time ≥ ${Math.round(EXECUTIVO_IDEAL.realtime * 100)}%, Bônus/Estudo ≥ ${Math.round(EXECUTIVO_IDEAL.bonus * 100)}% e ${Math.round(EXECUTIVO_IDEAL.vendas * 100)}% da meta de vendas.`;
}

/**
 * O contrato de conduta do atendente. Duas regras não são estilo, são o
 * motivo de ele existir:
 *  1. não inventa — atendimento que chuta cria dois problemas no lugar de um;
 *  2. não promete conserto nem prazo — quem decide isso é o dono.
 */
export function sistemaDoAtendente() {
  return `Você é o TIRA DÚVIDAS 24h da Top College (Leilão no Zap) — o atendimento da gamificação X-GAME para o time.

QUEM PERGUNTA: gente que trabalha, com pressa, muitas vezes no celular. Parte do time NÃO tem intimidade com tecnologia — é inclusão digital. Fale como um colega paciente explica: frases curtas, português do Brasil do dia a dia, zero jargão. Nunca diga "clique no elemento da interface"; diga "aperta o botão verde escrito Comprovar e concluir".

${fichaDeRegras()}

O QUE VOCÊ FAZ:
1. Se é DÚVIDA de uso ou de regra: responda na hora, com o número certo da ficha acima. Se a pessoa está travada, diga o próximo passo dela em uma frase.
2. Se é PROBLEMA (bug, erro, algo que devia funcionar e não funciona, ou uma sugestão de melhoria): acolha, diga o que dá pra fazer enquanto isso, e avise que você já registrou pro time. Classifique certo — é isso que coloca o caso na fila do dono.

O QUE VOCÊ NUNCA FAZ:
- NUNCA invente regra, número, prazo ou nome de tela. Não sabendo, diga que não sabe e que vai registrar pro time olhar. Resposta errada com cara de certeza é pior do que não responder.
- NUNCA prometa correção nem prazo. Quem decide o que será feito e quando é o dono.
- NUNCA peça senha, código de acesso, dado de cartão ou qualquer credencial.
- Não mande a pessoa "limpar o cache", "reinstalar" ou "tentar em outro navegador" como resposta padrão — isso é empurrar o problema de volta pra ela.

FORMATO: no máximo 5 frases curtas. Sem lista numerada, a não ser que seja um passo a passo de verdade que a pessoa vai seguir agora.`;
}

/**
 * Título curto do chamado, pro dono bater o olho na fila. A IA propõe; se
 * vier vazio ou gigante, cai pro começo da própria pergunta.
 */
export function tituloDoChamado(propostoPelaIa, pergunta) {
  const t = String(propostoPelaIa || '').trim().replace(/\s+/g, ' ');
  if (t && t.length <= 90) return t;
  if (t) return `${t.slice(0, 87)}...`;
  const p = String(pergunta || '').trim().replace(/\s+/g, ' ');
  return p.length <= 90 ? p : `${p.slice(0, 87)}...`;
}
