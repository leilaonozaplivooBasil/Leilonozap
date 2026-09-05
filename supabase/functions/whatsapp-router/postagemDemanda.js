// postagemDemanda — o FORMATO do post de demanda no Slack, e só ele.
//
// 05/09/2026 — pedido do dono, com foto do formato alvo:
//   "Ao postar precisa criar a postagem da seguinte maneira (…) Inserir a foto da demanda
//    como novo Tópico se o usuário do grupo enviou a imagem, se não enviou a imagem somente
//    texto, use a logo da Top Tech como imagem do Novo Tópico."
//
// O QUE ISTO É — e por que é .js e não .ts
// Arquivo de REGRA, sem rede, sem Deno, sem Slack: recebe dados, devolve texto. É a mesma
// separação de sempre (a regra fica onde dá pra testar; a rota só transporta). Está em .js
// puro de propósito: o Deno importa .js sem cerimônia, e o `node --test` EXECUTA a função de
// verdade — os outros testes do router leem o index.ts como TEXTO e só conferem se a frase
// existe no arquivo, o que já deixou passar regressão nesta casa (teste que passava porque a
// palavra estava num comentário meu, não no código).
//
// O FORMATO ALVO (transcrito da foto e confirmado pelo dono em 05/09):
//   [imagem de capa: a que o usuário mandou; sem ela, a logo da Top Tech]
//   *TÍTULO EM CAIXA ALTA — Empresa*
//   *Pedido:* quem pediu          *Data:* dd/mm/aaaa
//   *Solicitação:* o que muda, com os valores exatos em `código`
//   *Classificação de Risco:* 🔴 ALTO
//   *Motivo:* por que esse risco
//   1. ponto de atenção   2. …   3. …
//   *Status:* Aguardando autorização para execução
//   Imagem 1 — legenda (82 kB)

/** A régua de risco já existente em heloim_solicitacoes (check baixo|medio|alto). */
export const RISCO = {
  alto:  { emoji: '🔴', rotulo: 'ALTO' },
  medio: { emoji: '🟡', rotulo: 'MÉDIO' },
  baixo: { emoji: '🟢', rotulo: 'BAIXO' },
};

/** Texto seguro: nunca devolve "null"/"undefined" impresso no post. */
function texto(v) {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  return String(v).replace(/\s+$/g, '').replace(/^\s+/g, '');
}

/**
 * dd/mm/aaaa a partir de ISO, Date ou nada (nada = hoje).
 * 'YYYY-MM-DD' é dia puro: montado como UTC pra o fuso não puxar pro dia anterior — a
 * mesma guarda de dataBR() na planilha do Financeiro, pela mesma razão.
 */
export function dataBR(valor) {
  let d;
  try {
    // SÓ ausência de argumento vira "hoje". `null` explícito significa "o campo existia e
    // estava vazio" — imprimir hoje ali seria mentir a data num documento de auditoria, que
    // é exatamente o tipo de silêncio que gerou o lance "há 57 anos".
    if (valor === undefined) d = new Date();
    else if (valor === null || valor === '') return '';
    else if (valor instanceof Date) d = valor;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) d = new Date(`${valor}T12:00:00Z`);
    else d = new Date(valor);
  } catch { return ''; }
  const ms = d.getTime();
  // piso de sanidade: `new Date(null)` vira a Época do Unix e imprimiria 31/12/1969 —
  // foi exatamente o bug do lance "há 57 anos".
  if (!Number.isFinite(ms) || ms < Date.UTC(2000, 0, 1)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Os pontos de atenção viram lista numerada. Aceita array ou texto com quebras/;. */
export function listaDePontos(pontos) {
  let itens = [];
  if (Array.isArray(pontos)) itens = pontos;
  else if (typeof pontos === 'string') {
    // número solto NÃO vira ponto de atenção: "42" numa lista de riscos não diz nada.
    const t = texto(pontos);
    if (t) itens = t.split(/\n+|(?<!\d);(?!\d)/);
  }
  return itens.map(texto).filter(Boolean)
    // se o texto já vem numerado ("1. algo"), não numera de novo
    .map((p) => p.replace(/^\s*\d+[.)]\s*/, ''));
}

/** "Imagem 1 — legenda (82 kB)". Sem legenda, só "Imagem 1". */
export function legendasDeAnexos(anexos) {
  if (!Array.isArray(anexos)) return [];
  return anexos.map((a, i) => {
    const legenda = texto(a && a.legenda);
    const kb = Number(a && a.bytes) > 0 ? ` (${Math.round(Number(a.bytes) / 1024)} kB)` : '';
    return `Imagem ${i + 1}${legenda ? ` — ${legenda}` : ''}${kb}`;
  });
}

/**
 * Monta o corpo do post, em mrkdwn do Slack.
 *
 * @param {object} d
 * @param {string} d.titulo            Título do tópico (vai em CAIXA ALTA e negrito)
 * @param {string} d.pedido            Quem pediu
 * @param {string|Date} [d.data]       Data do pedido; vazio = hoje
 * @param {string} d.solicitacao       O que muda
 * @param {'alto'|'medio'|'baixo'} d.risco
 * @param {string} [d.motivo]          Por que esse risco
 * @param {string[]|string} [d.pontos] Pontos de atenção
 * @param {string} [d.status]          Padrão: "Aguardando autorização para execução"
 * @param {Array<{legenda?:string,bytes?:number}>} [d.anexos]
 * @returns {string}
 */
/**
 * Caixa alta só ATÉ o travessão. Na foto o título é
 * "ALTERAÇÃO DE LINK DE REFERÊNCIA — Top Tech Digital": o assunto grita, o nome próprio
 * fica como foi escrito. Subir tudo viraria "TOP TECH DIGITAL", que não é a marca.
 */
export function tituloDoTopico(titulo) {
  const t = texto(titulo);
  if (!t) return '';
  const i = t.search(/\s+[—–-]\s+/);
  if (i < 0) return t.toUpperCase();
  const sep = t.slice(i).match(/^\s+[—–-]\s+/)[0];
  return t.slice(0, i).toUpperCase() + sep + t.slice(i + sep.length);
}

export function montarPostagem(d = {}) {
  const risco = RISCO[String(d.risco || '').toLowerCase()] || RISCO.medio;
  const linhas = [];

  const titulo = texto(d.titulo);
  if (titulo) linhas.push(`*${tituloDoTopico(titulo)}*`, '');

  const pedido = texto(d.pedido);
  if (pedido) linhas.push(`*Pedido:* ${pedido}`);
  linhas.push(`*Data:* ${dataBR(d.data)}`, '');

  const solicitacao = texto(d.solicitacao);
  if (solicitacao) linhas.push('*Solicitação:*', solicitacao, '');

  linhas.push(`*Classificação de Risco:* ${risco.emoji} ${risco.rotulo}`);
  const motivo = texto(d.motivo);
  if (motivo) linhas.push(`*Motivo:* ${motivo}`);

  const pontos = listaDePontos(d.pontos);
  if (pontos.length) {
    linhas.push('');
    pontos.forEach((p, i) => linhas.push(`${i + 1}. ${p}`));
  }

  linhas.push('', `*Status:* ${texto(d.status) || 'Aguardando autorização para execução'}`);

  const legendas = legendasDeAnexos(d.anexos);
  if (legendas.length) {
    linhas.push('');
    legendas.forEach((l) => linhas.push(l));
  }

  return linhas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * A capa do tópico. Regra do dono, literal: a imagem que o usuário mandou; se não mandou,
 * a logo da Top Tech.
 *
 * ⚠️ Sem logo configurada devolve `{ capa: null, motivo: 'sem_logo' }` — e quem chama posta
 * SEM capa em vez de falhar. Post sem imagem é imperfeito; post que não sai é problema.
 */
export function escolherCapa({ imagemDoUsuario, logoUrl } = {}) {
  const doUsuario = texto(imagemDoUsuario);
  if (doUsuario) return { capa: doUsuario, origem: 'usuario' };
  const logo = texto(logoUrl);
  if (logo) return { capa: logo, origem: 'logo' };
  return { capa: null, origem: 'nenhuma', motivo: 'sem_logo' };
}

/** O rascunho que vai pro GRUPO antes de publicar — mesmo corpo, com a pergunta no fim. */
export function montarRascunho(d = {}, passo = 'conteudo') {
  const corpo = montarPostagem(d);
  const pergunta = passo === 'postar'
    ? '✅ Conteúdo confirmado.\n\n*Posso postar no Slack?* Responda *pode postar* ou *não*.'
    : '👆 Esta é a demanda como entendi.\n\n*Está certa?* Responda *está certo* ou diga o que corrigir.';
  return `${corpo}\n\n———\n${pergunta}`;
}
