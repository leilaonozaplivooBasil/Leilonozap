// 🎧 X-MUSIC — a memória do som de trabalho da Top College / X-EOS.
//
// O NOME (fechado pelo dono na segunda rodada): entre "X-Rádio", "X-Music"
// e "X-Playlist" ficou X-MUSIC. "X-Playlist" é comprido e não cabe na
// pílula sem cortar; "X-Play" fala igual a "X-Pay", que já é o dinheiro do
// jogo — duas coisas centrais com o mesmo som viram confusão em reunião.
// X-MUSIC é curto, não colide com nada e entra na família que já existe:
// X-office, X-Pay, X-GAME, X-MUSIC.
//
// A COLEÇÃO É UMA SÓ: a playlist que a pessoa monta no Ritual do Amanhecer
// e a que ela monta trabalhando são a MESMA — por isso este arquivo usa a
// chave que o ritual já usava (xgame_playlist_amanhecer). O que ela salvou
// às 5h toca no expediente, e vice-versa.

export const CHAVE_PLAYLIST = 'xgame_playlist_amanhecer';
// as duas chaves abaixo continuam com o nome antigo de propósito: são o
// que já está salvo no aparelho de quem usou. Renomear só pra combinar com
// o nome novo faria a pessoa perder a estação escolhida — o nome interno
// não aparece pra ninguém.
export const CHAVE_ESTACAO = 'xradio_estacao';   // o que estava tocando
export const CHAVE_LIGADO = 'xradio_ligado';     // ligado/desligado

export const CHAVE_ESTACOES = 'xmusic_estacoes';   // as trocas que a pessoa fez
export const CHAVE_ACERTOU = 'xmusic_acertou';     // o candidato que TOCOU em cada vaga

// 🎚️ AS ESTAÇÕES SÃO VAGAS COM VÁRIOS CANDIDATOS (ordem do dono: "prefiro
// que o sistema já tenha umas seleções de música instantânea, ele sente o
// gostinho e depois vai colando as dele; puxar do YouTube, deixar tocando e
// oferecendo pra ele salvar na dele — deixar a parada mais automática").
//
// O QUE EU APRENDI NA MARRA, E QUE MANDA NESTE ARQUIVO: conferir se o vídeo
// EXISTE não é conferir se ele TOCA. A conferência por título passou em dois
// vídeos que, no player, abriram "Vídeo indisponível — a gravação dessa
// transmissão ao vivo não está disponível". Quem sabe se toca é o PLAYER, e
// só ele: por isso o X-Music usa a API oficial do YouTube (não um <iframe>
// solto), que dispara onError com o motivo (100 = sumiu, 101/150 = o dono
// proibiu embed, 5 = falhou no HTML5).
//
// POR ISSO CADA VAGA TEM FILA, NÃO UM LINK SÓ: deu erro no primeiro, o
// player pula sozinho pro próximo, sem a pessoa perceber. O que tocou fica
// anotado (CHAVE_ACERTOU) e na próxima vez entra direto nele. É isso que
// deixa "automático" de verdade: nenhum link individual precisa ser eterno,
// porque a fila absorve a morte de qualquer um deles.
//
// Uma playlist de canal (UU…) é a aposta mais durável da fila: ela vive
// enquanto o canal viver, e vai renovando o conteúdo sozinha — a pessoa não
// escuta a mesma faixa todo dia.
export const ESTACOES_PADRAO = [
  {
    slot: 'foco', nome: 'Foco', nota: 'pra trabalhar',
    candidatos: [
      { id: 'UUSJ4gkVC6NrvII8umztf0Ow', lista: true },  // canal Lofi Girl
      { id: 'jfKfPfyJRdk' },                            // lofi hip hop radio
      { id: '4xDzrJKXOOY' },
    ],
  },
  {
    slot: 'calma', nome: 'Calma', nota: 'relaxar e respirar',
    candidatos: [
      { id: 'UfcAVejslrU' },                            // Weightless
      { id: 'UUUjBEwlyDo1cbVCiJDzYcQg', lista: true },
      { id: '1ZYbU82GVz4' },
    ],
  },
  {
    slot: 'estudo', nome: 'Estudo', nota: 'concentração longa',
    candidatos: [
      { id: 'UUQINXHZqCU5i06HzxRkujfg', lista: true },
      { id: '_4kHxtiuML0' },
      { id: 'lTRiuFIWV54' },
    ],
  },
  {
    slot: 'energia', nome: 'Energia', nota: 'correr e treinar',
    candidatos: [
      { id: 'UU0C-w0YjGpqDXGB8IHb662A', lista: true },
      { id: 'gJLIiF15wjQ' },
      { id: 'mgmVOuLgFB0' },
    ],
  },
];

/** Aceita link normal, curto, embed, shorts, live ou o ID puro. */
export const extrairIdYoutube = (texto) => {
  const t = String(texto || '').trim();
  const m = /(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/.exec(t);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(t) ? t : null;
};

/** Playlist do YouTube (list=...) — o rádio toca a lista inteira. */
export const extrairListaYoutube = (texto) => {
  const m = /[?&]list=([\w-]+)/.exec(String(texto || ''));
  return m ? m[1] : null;
};

const ler = (chave, padrao) => {
  try {
    const j = JSON.parse(localStorage.getItem(chave) || 'null');
    return j === null || j === undefined ? padrao : j;
  } catch { return padrao; }
};
const gravar = (chave, valor) => {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem storage */ }
};

export const lerPlaylist = () => {
  const j = ler(CHAVE_PLAYLIST, []);
  return Array.isArray(j) ? j.slice(0, 30) : [];
};
export const gravarPlaylist = (lista) => gravar(CHAVE_PLAYLIST, lista.slice(0, 30));

export const lerEstacao = () => ler(CHAVE_ESTACAO, null);
export const gravarEstacao = (e) => gravar(CHAVE_ESTACAO, e);
export const lerLigado = () => ler(CHAVE_LIGADO, false);
export const gravarLigado = (v) => gravar(CHAVE_LIGADO, !!v);

/** O título real da música/lista, via noembed (tem CORS liberado).
 *
 *  ⚠️ O QUE QUEBRAVA: o noembed lê URL de VÍDEO do YouTube, mas NÃO lê URL
 *  de PLAYLIST — devolve erro. Resultado: toda playlist salva caía no nome
 *  genérico, e duas playlists diferentes ficavam com o MESMO nome na lista
 *  (o dono: "senão eu não sei qual é a música").
 *
 *  A SAÍDA: quando o link colado é o normal do YouTube
 *  (watch?v=VIDEO&list=LISTA), o vídeo vem junto — e o título DELE nomeia a
 *  playlist. É o nome que a pessoa reconhece, porque é a faixa que estava
 *  tocando quando ela copiou o link.
 */
export const buscarTitulo = async (id, ehLista = false, idVideo = null) => {
  const tentar = async (url) => {
    try {
      const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(4000) });
      const j = await r.json();
      if (j?.error) return null;
      const t = String(j?.title || '').trim();
      return t || null;
    } catch { return null; }
  };
  if (!ehLista) {
    const t = await tentar(`https://www.youtube.com/watch?v=${id}`);
    return t ? t.slice(0, 70) : null;
  }
  const doVideo = idVideo ? await tentar(`https://www.youtube.com/watch?v=${idVideo}`) : null;
  return doVideo ? `${doVideo.slice(0, 52)} · playlist` : null;
};

/** A fonte do iframe, seja faixa única (em loop) ou playlist inteira. */
export const fonteDoPlayer = (estacao) => {
  if (!estacao?.id) return null;
  const base = 'https://www.youtube-nocookie.com/embed';
  const comum = 'autoplay=1&rel=0&controls=1&modestbranding=1&playsinline=1';
  return estacao.lista
    ? `${base}/videoseries?list=${estacao.id}&${comum}`
    : `${base}/${estacao.id}?${comum}&loop=1&playlist=${estacao.id}`;
};


/** A FILA DE UMA VAGA: o que a pessoa pôs vence tudo; senão, os candidatos
 *  da casa — começando pelo que JÁ TOCOU aqui neste aparelho. */
export const filaDaVaga = (vaga) => {
  const salvas = ler(CHAVE_ESTACOES, {}) || {};
  const dela = salvas[vaga.slot];
  if (dela?.id) return [{ ...dela, dela: true }];
  const fila = (vaga.candidatos || []).slice();
  const acertou = (ler(CHAVE_ACERTOU, {}) || {})[vaga.slot];
  if (acertou) {
    const i = fila.findIndex((c) => c.id === acertou);
    if (i > 0) fila.unshift(fila.splice(i, 1)[0]);
  }
  return fila;
};

/** As estações como estão HOJE, já com a fila resolvida e o primeiro
 *  candidato na mão. O rótulo é sempre da casa — é o propósito da vaga. */
export const lerEstacoes = () => ESTACOES_PADRAO.map((vaga) => {
  const fila = filaDaVaga(vaga);
  return { ...vaga, fila, ...(fila[0] || {}) };
});

export const gravarEstacaoDoSlot = (slot, dados) => {
  const salvas = ler(CHAVE_ESTACOES, {}) || {};
  gravar(CHAVE_ESTACOES, { ...salvas, [slot]: dados });
};

/** Anota que ESTE candidato tocou de verdade nesta vaga — na próxima vez o
 *  X-Music entra direto nele, sem repetir a fila que já falhou. */
export const anotarAcerto = (slot, id) => {
  if (!slot || !id) return;
  const j = ler(CHAVE_ACERTOU, {}) || {};
  gravar(CHAVE_ACERTOU, { ...j, [slot]: id });
};

/** 🎬 A API OFICIAL DO PLAYER DO YOUTUBE, carregada uma única vez.
 *  É ela que dá o que o <iframe> solto NÃO dá: o evento de ERRO (100 = o
 *  vídeo sumiu, 101/150 = o dono proibiu embutir, 5 = falhou no HTML5) e o
 *  título REAL do que está tocando. Sem isso não dá pra prometer que um
 *  botão toca — dá só pra torcer. */
let promessaApi = null;
export const carregarApiYoutube = () => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (promessaApi) return promessaApi;
  promessaApi = new Promise((resolve) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try { anterior?.(); } catch { /* outro trecho da página */ }
      resolve(window.YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);
  });
  return promessaApi;
};

/** 🔎 A BUSCA. Fala com a nossa rota (api/functions/xmusicBuscar), que é
 *  quem guarda a chave e conversa com o YouTube. O crachá de sessão vai
 *  junto porque cada busca gasta cota paga do dono — rota aberta seria
 *  torneira pra qualquer um esvaziar.
 *
 *  O resultado já vem FILTRADO pelo YouTube em videoEmbeddable: tudo que
 *  aparece aqui toca embutido. É o fim do "Vídeo indisponível". */
export const buscarNoYoutube = async (termo, cabecalhos = {}) => {
  const q = String(termo || '').trim();
  if (!q) return { ok: true, itens: [] };
  try {
    const r = await fetch(`/api/functions/xmusicBuscar?q=${encodeURIComponent(q)}`, {
      headers: cabecalhos,
      signal: AbortSignal.timeout(12000),
    });
    const j = await r.json().catch(() => null);
    if (!j?.ok) return { ok: false, erro: j?.error || 'falhou', itens: [] };
    return { ok: true, itens: Array.isArray(j.itens) ? j.itens : [] };
  } catch { return { ok: false, erro: 'rede', itens: [] }; }
};
