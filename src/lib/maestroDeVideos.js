/**
 * maestroDeVideos — QUEM TOCA AGORA, e quando passa a vez. Regra pura, sem tela.
 *
 * 🎬 O PEDIDO (08/10/2026): "quando começar o vídeo de um, o outro fica em imagem.
 * Precisa tudo ficar sincronizado" — e o som só quando o cliente toca no ícone.
 *
 * O que existia: cada card girava sozinho, todos os vídeos nossos começavam JUNTOS
 * (30 a 48 MB de uma vez) e o vídeo do YouTube nem tocava. Aqui há UM maestro por
 * tela: só um card toca por vez, os outros ficam na foto, e a vez passa quando o
 * vídeo termina, quando estoura o tempo, quando falha ou quando o card sai da tela.
 *
 * Tudo é um redutor puro: a tela só despacha eventos ("este card ficou visível",
 * "este vídeo terminou") e lê o resultado. Assim a regra roda no Node, sem navegador.
 *
 * ESTADO
 *   cartoes   { [id]: { visivel, falhou } }
 *   ordem     ids na ordem em que aparecem na tela (a vez anda nessa ordem, em roda)
 *   ativo     o id que toca agora, ou null
 *   rodada    sobe a cada vez que a vez é dada — inclusive para o MESMO card, que
 *             então recomeça do início (só há um card com vídeo na tela)
 *   tocando   o vídeo ativo já começou de verdade (para o cronômetro do tempo máximo)
 *   pausado   aba em segundo plano: ninguém toca
 *   som       a pessoa tocou no ícone de som nesta visita (vale para os próximos vídeos)
 */

/** Cada vídeo toca, no máximo, este tempo. Vitrine não pode virar cinema. */
export const TEMPO_MAXIMO_MS = 15000;
/** Vídeo que não começa em tanto tempo é dado como falho e a vez passa. */
export const ESPERA_PARA_COMECAR_MS = 9000;

export const estadoInicial = () => ({
  cartoes: {}, ordem: [], ativo: null, rodada: 0, tocando: false, pausado: false, som: false,
});

/** Cards que podem receber a vez: visíveis e sem falha. Na ordem da tela. */
export function elegiveis(estado) {
  return (estado.ordem || []).filter((id) => {
    const c = estado.cartoes[id];
    return c && c.visivel && !c.falhou;
  });
}

/**
 * O próximo da roda depois de `depoisDe`. Se só há um elegível, é ele mesmo.
 *
 * 🔴 O QUE O TESTE DA TELA PEGOU (08/10/2026): quando o card da VEZ deixa de ser elegível — o
 * vídeo falhou, ou o card saiu da tela — ele não está mais na lista, e `indexOf` devolvia -1:
 * a vez voltava ao PRIMEIRO da lista. Com três cards, se o do meio falhava, o primeiro tocava
 * duas vezes seguidas e o terceiro ficava sem a vez. Por isso o sucessor é procurado na ORDEM
 * COMPLETA da tela, andando a partir de quem perdeu a vez, e só então filtrado pelos elegíveis.
 */
export function proximoDaRoda(lista, depoisDe, ordem = []) {
  if (!lista.length) return null;
  const i = lista.indexOf(depoisDe);
  if (i !== -1) return lista[(i + 1) % lista.length];
  const j = ordem.indexOf(depoisDe);
  if (j !== -1) {
    for (let k = 1; k <= ordem.length; k += 1) {
      const candidato = ordem[(j + k) % ordem.length];
      if (lista.includes(candidato)) return candidato;
    }
  }
  return lista[0];
}

/** Garante a coerência: o ativo precisa ser elegível; senão a vez passa. */
function normalizar(estado, { passou = false } = {}) {
  const lista = elegiveis(estado);
  if (!lista.length) {
    return estado.ativo === null ? estado : { ...estado, ativo: null, tocando: false };
  }
  if (estado.ativo && lista.includes(estado.ativo) && !passou) return estado;
  const proximo = proximoDaRoda(lista, estado.ativo, estado.ordem);
  return { ...estado, ativo: proximo, rodada: estado.rodada + 1, tocando: false };
}

/**
 * @param {object} estado
 * @param {{tipo: string, id?: string, ids?: string[], visivel?: boolean, ligado?: boolean}} acao
 */
export function maestroReducer(estado, acao) {
  switch (acao.tipo) {
    case 'ordenar': {
      const ids = Array.isArray(acao.ids) ? acao.ids : [];
      return normalizar({ ...estado, ordem: ids });
    }
    case 'registrar': {
      if (estado.cartoes[acao.id]) return estado;
      return { ...estado, cartoes: { ...estado.cartoes, [acao.id]: { visivel: false, falhou: false } } };
    }
    case 'sair': {
      if (!estado.cartoes[acao.id]) return estado;
      const { [acao.id]: _fora, ...resto } = estado.cartoes;
      return normalizar({ ...estado, cartoes: resto, ordem: estado.ordem.filter((x) => x !== acao.id) });
    }
    case 'visivel': {
      const c = estado.cartoes[acao.id];
      if (!c || c.visivel === !!acao.visivel) return estado;
      return normalizar({ ...estado, cartoes: { ...estado.cartoes, [acao.id]: { ...c, visivel: !!acao.visivel } } });
    }
    case 'falhou': {
      const c = estado.cartoes[acao.id];
      if (!c || c.falhou) return estado;
      const novo = { ...estado, cartoes: { ...estado.cartoes, [acao.id]: { ...c, falhou: true } } };
      // se quem falhou era o ativo, a vez passa na hora
      return normalizar(novo, { passou: estado.ativo === acao.id });
    }
    case 'tocando':
      return estado.ativo === acao.id && !estado.tocando ? { ...estado, tocando: true } : estado;
    case 'terminou':
      // só vale para quem está com a vez (um vídeo que terminou atrasado não rouba a vez)
      return estado.ativo === acao.id ? normalizar({ ...estado }, { passou: true }) : estado;
    case 'assumir': {
      // a pessoa tocou no vídeo de um card: ele passa a tocar agora
      const c = estado.cartoes[acao.id];
      if (!c) return estado;
      const cartoes = { ...estado.cartoes, [acao.id]: { ...c, visivel: true, falhou: false } };
      return { ...estado, cartoes, ativo: acao.id, rodada: estado.rodada + 1, tocando: false };
    }
    case 'pausar':
      return estado.pausado ? estado : { ...estado, pausado: true };
    case 'retomar':
      return estado.pausado ? { ...estado, pausado: false } : estado;
    case 'som':
      return estado.som === !!acao.ligado ? estado : { ...estado, som: !!acao.ligado };
    default:
      return estado;
  }
}

/** Esta tela deve economizar? (economia de dados ou movimento reduzido). */
export function ambienteEconomico({ conexao, prefereMenosMovimento } = {}) {
  if (prefereMenosMovimento) return true;
  if (conexao?.saveData) return true;
  return ['slow-2g', '2g'].includes(String(conexao?.effectiveType || ''));
}
