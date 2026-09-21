/**
 * 🗺️ O MAPA MENTAL — "simples e objetivo", palavras do dono.
 *
 * PEDIDO (áudio de 19/09/2026):
 *   "criar um mapa mental ali do lado, ligado ao quadro… onde eu esvazio a
 *    minha mente e dessa mente eu esvazio e transformo em tarefa"
 *
 * O mapa é uma ÁRVORE: um nó raiz e filhos pendurados. Cada nó pode virar
 * demanda — e daí seguir para o quadro pelo caminho que já existe em
 * `src/lib/demandas.js`. Aqui não se fala com banco nem com tela.
 *
 * 🔴 AS DUAS COISAS QUE PODEM DAR ERRADO, E ESTÃO TRAVADAS AQUI
 *
 * 1. CICLO. Arrastar um nó para dentro do próprio filho cria uma volta
 *    fechada — e quem percorrer a árvore roda para sempre, travando a aba.
 *    `podeVirarFilho` recusa antes de acontecer.
 *
 * 2. ÓRFÃO. Apagar um nó sem cuidar dos filhos deixa pedaços da mente
 *    invisíveis: continuam gravados, não aparecem em lugar nenhum. Apagar leva
 *    a galhada inteira, e a tela avisa quantos vão junto.
 */

/** Nó novo, pronto para entrar na árvore. */
export function noNovo({ texto = '', pai = null, x = 0, y = 0 } = {}) {
  return {
    id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    texto: String(texto || '').trim(),
    pai: pai || null,
    x: Number(x) || 0,
    y: Number(y) || 0,
  };
}

/** Os filhos diretos de um nó, na ordem em que estão. */
export function filhosDe(nos, paiId) {
  return (nos || []).filter((n) => n && (n.pai || null) === (paiId || null));
}

/** A raiz: o nó sem pai. Um mapa saudável tem exatamente uma. */
export function raizDe(nos) {
  return (nos || []).find((n) => n && !n.pai) || null;
}

/**
 * Todos os descendentes de um nó — filhos, netos, e por aí.
 *
 * Percorre com uma lista de visitados: se o mapa já estiver com ciclo (gravado
 * por uma versão antiga, ou editado na mão), a função PARA em vez de rodar
 * para sempre. Trava de aba é pior que mapa torto.
 */
export function descendentesDe(nos, id) {
  const vistos = new Set();
  const fila = [id];
  const saida = [];
  while (fila.length) {
    const atual = fila.shift();
    for (const f of filhosDe(nos, atual)) {
      if (vistos.has(f.id)) continue;
      vistos.add(f.id);
      saida.push(f);
      fila.push(f.id);
    }
  }
  return saida;
}

/**
 * 🔒 `no` pode passar a ser filho de `novoPai`?
 *
 * Recusa a volta fechada: um nó não pode virar filho de si mesmo nem de
 * nenhum descendente seu.
 */
export function podeVirarFilho(nos, noId, novoPaiId) {
  if (!noId) return { pode: false, motivo: 'sem_no' };
  if (noId === novoPaiId) return { pode: false, motivo: 'pai_de_si_mesmo' };
  if (!novoPaiId) return { pode: true, motivo: 'ok' };  // virar raiz é permitido
  const existe = (nos || []).some((n) => n?.id === novoPaiId);
  if (!existe) return { pode: false, motivo: 'pai_nao_existe' };
  const meus = descendentesDe(nos, noId).map((n) => n.id);
  if (meus.includes(novoPaiId)) return { pode: false, motivo: 'viraria_ciclo' };
  return { pode: true, motivo: 'ok' };
}

/** Move um nó de pai. Devolve a lista nova; devolve a MESMA quando não pode. */
export function moverNo(nos, noId, novoPaiId) {
  if (!podeVirarFilho(nos, noId, novoPaiId).pode) return nos || [];
  return (nos || []).map((n) => (n?.id === noId ? { ...n, pai: novoPaiId || null } : n));
}

/**
 * Apaga um nó E toda a galhada abaixo dele.
 *
 * Deixar os filhos para trás os tornaria invisíveis: continuariam na lista com
 * um `pai` que não existe mais, sem aparecer em lugar nenhum da tela.
 */
export function apagarNo(nos, noId) {
  const cair = new Set([noId, ...descendentesDe(nos, noId).map((n) => n.id)]);
  return (nos || []).filter((n) => n && !cair.has(n.id));
}

/** Quantos somem junto se este nó for apagado — o número que a tela avisa. */
export function quantosCaemJunto(nos, noId) {
  return descendentesDe(nos, noId).length;
}

/**
 * O nó vira demanda. É a ponte que o dono pediu entre o mapa e o quadro.
 *
 * Nó sem texto não vira nada: seria uma linha em branco na caixa de entrada.
 */
export function demandaDoNo(no, { userId } = {}) {
  const titulo = String(no?.texto || '').trim();
  if (!titulo) return null;
  return {
    user_id: userId ?? null,
    titulo,
    origem: 'mapa',
    origem_ref: no?.id ?? null,
    estado: 'aberta',
    anotada_em: new Date().toISOString(),
  };
}

/** Renomeia. Texto vazio é recusado: nó sem texto não dá para achar de volta. */
export function renomearNo(nos, noId, texto) {
  const limpo = String(texto || '').trim();
  if (!limpo) return nos || [];
  return (nos || []).map((n) => (n?.id === noId ? { ...n, texto: limpo } : n));
}
