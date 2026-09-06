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

// as estações da casa — pontos de partida por MOMENTO, não por gênero
export const ESTACOES = [
  { id: 'jfKfPfyJRdk', nome: 'Foco', nota: 'lofi pra trabalhar' },
  { id: 'UfcAVejslrU', nome: 'Calma', nota: 'relaxar e respirar' },
  { id: '5qap5aO4i9A', nome: 'Estudo', nota: 'concentração longa' },
  { id: 'MVPTGNGiI-4', nome: 'Energia', nota: 'pra correr e treinar' },
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

/** O título real da música/lista, via noembed (tem CORS liberado). */
export const buscarTitulo = async (id, ehLista = false) => {
  try {
    const url = ehLista
      ? `https://www.youtube.com/playlist?list=${id}`
      : `https://www.youtube.com/watch?v=${id}`;
    const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(4000) });
    const j = await r.json();
    return String(j?.title || '').slice(0, 70) || null;
  } catch { return null; }
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
