// 🏷️ "ISTO VEIO DO ADM" — o selo da tarefa que não nasceu com a pessoa.
//
// 🔴 POR QUE ISTO EXISTE (22/09/2026)
// Pedido do Ávilla: "quando colocar demanda na jornada, deve aparecer que é
// demanda vinda do adm".
//
// COMO ESTAVA: mandar demanda pro colaborador já funcionava — a demanda vira
// tarefa do dia e/ou card do quadro (ver api/functions/minhasDemandas.js). E o
// dado de origem já estava gravado desde sempre: `origem = 'xperf'` e
// `criado_por_id` na linha de metodo_tarefas.
//
// Só que a JORNADA não mostrava nada disso. A tarefa mandada pelo adm descia no
// meio das que a própria pessoa escreveu, com a mesma cara. Quem abria o dia não
// tinha como saber o que era ordem de cima e o que era escolha própria — e é
// exatamente essa diferença que faz alguém priorizar a reunião de terça.
//
// Não precisou de coluna nova no banco: o nome de quem mandou sai do
// `criado_por_id` pelo mapa `nomePorUsuarioId` que a tela já recebe.

/** Origens que significam "veio de fora, não fui eu que escrevi". */
export const ORIGENS_DE_FORA = ['xperf', 'encontro'];

/** Esta tarefa (ou card) veio de uma demanda mandada por outra pessoa? */
export function veioDeFora(item) {
  if (!item) return false;
  if (item.demanda_id) return true;
  return ORIGENS_DE_FORA.includes(String(item.origem || ''));
}

/**
 * O selo pronto pra tela, ou null quando não há o que marcar.
 *
 * @param item             a linha de metodo_tarefas / metodo_quadro
 * @param nomePorUsuarioId {id: 'Nome'} — o mapa que a tela já tem em mãos
 * @param meuId            quem está olhando: demanda que a própria pessoa
 *                         mandou pra si mesma não é "vinda do adm", é dela
 */
export function seloDaDemanda(item, nomePorUsuarioId = {}, meuId = null) {
  if (!veioDeFora(item)) return null;
  const autorId = item.criado_por_id || null;
  if (autorId && meuId && autorId === meuId) return null;

  const nome = autorId ? (nomePorUsuarioId?.[autorId] || null) : null;
  // primeiro nome só: "📥 do adm · Luiz Santanna" estoura a linha no celular
  const curto = nome ? String(nome).trim().split(/\s+/)[0] : null;
  return {
    rotulo: curto ? `📥 do adm · ${curto}` : '📥 veio do adm',
    // o título do atributo `title` — aqui cabe o nome inteiro
    dica: nome
      ? `Demanda mandada por ${nome}. Não foi você que colocou no seu dia.`
      : 'Demanda mandada pelo adm. Não foi você que colocou no seu dia.',
    autorId,
  };
}
