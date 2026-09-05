// roteamentoSlack — de qual GRUPO do WhatsApp veio, para qual CANAL do Slack vai.
//
// 05/09/2026 — é a solicitação #3 registrada pelo próprio dono no grupo TOP TECH DIGITAL,
// que estava "aguardando autorização" desde as 07:30 do mesmo dia:
//   "Criar e configurar integração do bot com o Slack para os grupos Top Tech, Top Tech
//    Digital e Logística. Objetivo: organização das notificações/registros por grupo."
//   "Pontos de atenção: precisa confirmar nome/ID exato de cada canal no Slack antes de
//    configurar, pra não postar no lugar errado."
//
// Até aqui TUDO caía num canal só (SLACK_CANAL_PADRAO). Com um grupo era invisível; com
// três, vira mistura — e o ponto de atenção que ele mesmo escreveu ("não postar no lugar
// errado") é justamente o que este arquivo tem que garantir.
//
// ⚠️ A COMPARAÇÃO É POR DÍGITOS, e isso não é preciosismo: o Z-API entrega o id do grupo
// como "120363402599586067-group", enquanto export e print mostram o MESMO grupo como
// "120363402599586067@g.us". Em 27/08 essa diferença já deixou a Heloim muda num grupo
// inteiro, sem log nenhum, porque a comparação era de string exata. Os dígitos são iguais
// nos dois formatos — comparar por eles acaba com essa categoria de silêncio.
//
// 🛟 NUNCA ENGOLE UM POST. Grupo fora do mapa cai no canal padrão. A alternativa seria não
// publicar, e demanda que some é pior que demanda no canal errado — o canal errado alguém
// vê e reclama; o silêncio ninguém percebe.

/** Só os dígitos — é o que os dois formatos de id de grupo têm em comum. */
export function digitos(v) {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  return String(v).replace(/\D+/g, '');
}

/**
 * Lê o secret MAPA_GRUPO_CANAL.
 *
 * Formato: `<id do grupo>=<canal>` separados por vírgula ou quebra de linha. O canal pode
 * ser o ID (C0…) ou o nome com ou sem "#" — quem publica resolve nome→ID.
 *
 *   120363402599586067-group=C0BHCMYJJGJ,120363111111111111@g.us=#logistica-tech
 *
 * Entrada torta (sem "=", sem dígitos, canal vazio) é IGNORADA em silêncio de propósito:
 * um par mal colado não pode derrubar o mapa inteiro e deixar todos os grupos sem destino.
 *
 * @param {unknown} texto
 * @returns {Map<string,string>} dígitos do grupo → canal
 */
export function lerMapaGrupoCanal(texto) {
  const mapa = new Map();
  if (typeof texto !== 'string') return mapa;
  for (const par of texto.split(/[,\n;]+/)) {
    const i = par.indexOf('=');
    if (i < 0) continue;
    const grupo = digitos(par.slice(0, i));
    const canal = par.slice(i + 1).trim().replace(/^#/, '');
    if (!grupo || !canal) continue;
    if (!mapa.has(grupo)) mapa.set(grupo, canal); // primeira ocorrência vence
  }
  return mapa;
}

/**
 * O canal de destino de um grupo.
 *
 * @param {unknown} grupoId  id do grupo como o Z-API entrega (ou @g.us, ou só os dígitos)
 * @param {Map<string,string>} mapa
 * @param {string} canalPadrao
 * @returns {{canal: string, origem: 'mapa'|'padrao'}}
 */
export function canalDoGrupo(grupoId, mapa, canalPadrao) {
  const padrao = typeof canalPadrao === 'string' ? canalPadrao.trim().replace(/^#/, '') : '';
  const chave = digitos(grupoId);
  if (chave && mapa instanceof Map) {
    const achado = mapa.get(chave);
    if (achado) return { canal: achado, origem: 'mapa' };
  }
  return { canal: padrao, origem: 'padrao' };
}
