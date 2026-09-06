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

export const CHAVE_ESTACOES = 'xmusic_estacoes'; // as trocas que a pessoa fez

// 🎚️ AS ESTAÇÕES SÃO VAGAS, NÃO ENFEITE (ordem do dono: "as opções que a
// gente oferece precisam funcionar de verdade, não pode ser um botão só por
// ser — precisam confiar na plataforma de verdade").
//
// O QUE ESTAVA ERRADO: eu tinha chumbado quatro IDs de vídeo do YouTube de
// memória, sem conseguir abrir nenhum deles daqui de dentro (o ambiente onde
// eu rodo não alcança o YouTube). Vídeo do YouTube sai do ar, vira privado
// ou bloqueia embed — botão que promete "Estudo" e abre uma tela preta é
// pior do que não ter botão, porque quebra a confiança na plataforma inteira.
//
// COMO FICOU: cada vaga tem um PROPÓSITO fixo (Foco, Calma, Estudo, Energia)
// e um conteúdo que pode ser trocado pela pessoa. Antes de aparecer clicável,
// a vaga é CONFERIDA no navegador de quem está usando — que alcança o YouTube
// de verdade — e só é oferecida se responder. Não respondeu, ela se declara
// vazia e pede o link em vez de fingir que toca.
//
// Só ficaram com sugestão as duas de que eu tenho notícia sólida: a rádio
// lofi que está no ar há anos e o Weightless. As outras duas nascem vazias
// de propósito: preencher com link que eu não consigo provar é exatamente o
// "botão só por ser" que o dono não quer.
export const ESTACOES_PADRAO = [
  { slot: 'foco', nome: 'Foco', nota: 'pra trabalhar', id: 'jfKfPfyJRdk', lista: false },
  { slot: 'calma', nome: 'Calma', nota: 'relaxar e respirar', id: 'UfcAVejslrU', lista: false },
  { slot: 'estudo', nome: 'Estudo', nota: 'concentração longa', id: null, lista: false },
  { slot: 'energia', nome: 'Energia', nota: 'correr e treinar', id: null, lista: false },
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


/** As estações como estão HOJE: o propósito é da casa, o conteúdo pode ser
 *  da pessoa. O que ela trocou vence a sugestão; o rótulo nunca muda, senão
 *  a vaga perde o sentido de existir. */
export const lerEstacoes = () => {
  const salvas = ler(CHAVE_ESTACOES, {}) || {};
  return ESTACOES_PADRAO.map((e) => {
    const dela = salvas[e.slot];
    return dela?.id
      ? { ...e, id: dela.id, lista: !!dela.lista, video: dela.video || null, titulo: dela.titulo || null }
      : e;
  });
};

export const gravarEstacaoDoSlot = (slot, dados) => {
  const salvas = ler(CHAVE_ESTACOES, {}) || {};
  gravar(CHAVE_ESTACOES, { ...salvas, [slot]: dados });
};

/** A CONFERÊNCIA. Roda no navegador da pessoa, que alcança o YouTube de
 *  verdade. Devolve o título real quando o vídeo existe e pode ser embutido,
 *  e null quando ele saiu do ar, virou privado ou bloqueou embed — é esse
 *  null que impede a estação de virar um botão que não toca. */
export const conferirEstacao = async (estacao) => {
  if (!estacao?.id) return null;
  return buscarTitulo(estacao.id, !!estacao.lista, estacao.video);
};
