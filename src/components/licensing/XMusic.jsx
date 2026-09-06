import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Radio, Play, Pause, Star, X, ChevronDown, Plus, Pencil, ListMusic } from 'lucide-react';
import {
  lerEstacoes, gravarEstacaoDoSlot, conferirEstacao,
  extrairIdYoutube, extrairListaYoutube, fonteDoPlayer,
  lerPlaylist, gravarPlaylist, lerEstacao, gravarEstacao, lerLigado, gravarLigado, buscarTitulo,
} from '@/lib/xmusic';
import { vibrar, VIBRA_TOQUE, VIBRA_ABRIR } from '@/lib/xgame';
import useOcultarAoRolar from '@/hooks/useOcultarAoRolar';

// 🎧 X-MUSIC — o som de trabalho da Top College / X-EOS.
//
// Nasceu de um pedido do dono: "gostei tanto da música das 5h que quero a
// mesma estrutura em toda a área da Top College — um rádio de trabalho que
// vai salvando as playlists, pra correr, estudar, trabalhar".
//
// A DECISÃO DE ARQUITETURA QUE FAZ ELE FUNCIONAR: o player é montado UMA
// VEZ, aqui, num canto fixo da tela — e nunca desmonta enquanto a pessoa
// navega entre os Hábitos. Era isso que faltava: no Ritual, a música morria
// junto com a tela do ritual. Aqui ela atravessa a navegação inteira.
// O <iframe> é memoizado à parte porque QUALQUER re-render que o toque
// interrompe a música — foi a lição do cronômetro do ritual.
//
// 🔴 E O ERRO QUE MATAVA O SOM (corrigido): o iframe estava DENTRO do
// bloco do painel. Fechar o painel desmontava o iframe — ou seja, a música
// só existia com o painel aberto na tela. Agora o painel NUNCA sai do DOM:
// fechado ele vira altura zero, sem opacidade e sem clique. Note que não é
// `display:none` nem `hidden` de propósito — esses o navegador trata como
// "sumiu" e pausa a mídia. Fechado, o painel mantém o TAMANHO REAL e só
// sai do campo de visão — pro navegador ele segue montado e tocando.
//
// TELA APAGADA: o player embutido do YouTube é bloqueado de tocar em
// segundo plano nos navegadores de celular (política do próprio YouTube —
// só o app com Premium faz isso). No computador, trocar de aba mantém
// tocando. Para tocar de tela apagada seria preciso áudio próprio (MP3) —
// a MediaSession abaixo já está no lugar pra quando essas faixas existirem:
// ela é o que põe título e controles na tela de bloqueio.

const Iframe = React.memo(function Iframe({ src }) {
  if (!src) return null;
  return (
    <iframe
      title="X-Music"
      src={src}
      allow="autoplay; encrypted-media"
      className="w-full h-[168px] block rounded-xl"
    />
  );
});

export default function XMusic() {
  const [aberto, setAberto] = useState(false);
  const [ligado, setLigado] = useState(lerLigado);
  const [estacoes, setEstacoes] = useState(lerEstacoes);
  const [conferencia, setConferencia] = useState({}); // slot → titulo real | false (não toca)
  const [vagaAlvo, setVagaAlvo] = useState(null);     // vaga esperando um link
  const [estacao, setEstacao] = useState(() => lerEstacao() || lerEstacoes().find((e) => e.id) || null);
  const [playlist, setPlaylist] = useState(lerPlaylist);
  const [link, setLink] = useState('');
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState(null);   // id da linha em edição
  const [nomeEdit, setNomeEdit] = useState('');
  const painelRef = useRef(null);

  // 👋 SOME ENQUANTO ROLA, igual à Leila (ordem do dono: "quando eu mexo a
  // página ela desaparece deixando tudo limpo, isso precisa funcionar na
  // X-Music"). É o MESMO hook que a Leila usa — não uma imitação parecida:
  // se um dia esse comportamento mudar, muda para as duas juntas.
  // Com o painel aberto o sumiço é pausado: a pessoa está mexendo nele.
  // E some só a APARÊNCIA — opacidade e clique. O player continua montado e
  // tocando; se isto desmontasse qualquer coisa, a música cortaria a cada
  // rolagem de dedo, que é justamente o erro que a gente acabou de matar.
  const rolando = useOcultarAoRolar(aberto);

  const src = useMemo(() => (ligado ? fonteDoPlayer(estacao) : null), [ligado, estacao]);
  const naPlaylist = playlist.some((m) => m.id === estacao?.id);
  const ehDaCasa = estacoes.some((m) => m.id && m.id === estacao?.id);

  useEffect(() => { gravarLigado(ligado); }, [ligado]);
  useEffect(() => { if (estacao) gravarEstacao(estacao); }, [estacao]);

  // a tela de bloqueio / a central de mídia do sistema mostra o que toca
  useEffect(() => {
    if (!('mediaSession' in navigator) || typeof window.MediaMetadata !== 'function') return;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: estacao?.nome || 'X-Music',
      artist: 'X-MUSIC · Top College',
      album: 'X-EOS',
    });
    navigator.mediaSession.playbackState = ligado ? 'playing' : 'paused';
  }, [estacao, ligado]);

  // clicou fora: o painel fecha (a música continua — é rádio, não modal)
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (painelRef.current && !painelRef.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  const trocar = useCallback((nova) => { vibrar(VIBRA_TOQUE); setEstacao(nova); setLigado(true); }, []);

  // 🔎 A CONFERÊNCIA DAS VAGAS. Roda quando o painel abre, no navegador da
  // pessoa — que alcança o YouTube de verdade, coisa que o ambiente onde eu
  // escrevo isto não alcança. Vaga que responde vira botão e mostra o título
  // REAL do que vai tocar; vaga que não responde (vídeo fora do ar, privado
  // ou com embed bloqueado) se declara e pede o link, em vez de abrir uma
  // tela preta. É o que separa "opção de verdade" de "botão só por ser".
  useEffect(() => {
    if (!aberto) return undefined;
    let vivo = true;
    (async () => {
      for (const e of estacoes) {
        if (!e.id || conferencia[e.slot] !== undefined) continue;
        const titulo = await conferirEstacao(e);
        if (!vivo) return;
        setConferencia((c) => ({ ...c, [e.slot]: titulo || false }));
      }
    })();
    return () => { vivo = false; };
  }, [aberto, estacoes, conferencia]);

  const tocarLink = useCallback(async () => {
    const lista = extrairListaYoutube(link);
    const idVideo = extrairIdYoutube(link);
    const id = lista || idVideo;
    if (!id) {
      setAviso('Cole um link do YouTube — música ou playlist.');
      setTimeout(() => setAviso(''), 5000);
      return;
    }
    // o vídeo do link fica GUARDADO na estação: é com ele que se descobre o
    // nome de uma playlist (o noembed não lê URL de playlist).
    const nome = (await buscarTitulo(id, !!lista, idVideo)) || (lista ? 'Minha playlist' : 'Minha música');
    // se uma VAGA estava pedindo link, ele vai pra ela e fica salvo ali —
    // a vaga deixa de estar vazia pra sempre, naquele aparelho.
    if (vagaAlvo) {
      const dados = { id, lista: !!lista, video: idVideo, titulo: nome };
      gravarEstacaoDoSlot(vagaAlvo, dados);
      const novas = estacoes.map((e) => (e.slot === vagaAlvo ? { ...e, ...dados } : e));
      setEstacoes(novas);
      setConferencia((c) => ({ ...c, [vagaAlvo]: nome }));
      const vaga = novas.find((e) => e.slot === vagaAlvo);
      setVagaAlvo(null);
      setLink('');
      trocar(vaga);
      return;
    }
    trocar({ id, nome, lista: !!lista, video: idVideo, nota: lista ? 'sua playlist' : 'sua música' });
    setLink('');
  }, [link, trocar, vagaAlvo, estacoes]);

  const favoritar = useCallback(async () => {
    if (!estacao?.id) return;
    const nome = estacao.nome || (await buscarTitulo(estacao.id, !!estacao.lista, estacao.video)) || 'Minha estação';
    const nova = [...playlist.filter((m) => m.id !== estacao.id), { ...estacao, nome }];
    setPlaylist(nova);
    gravarPlaylist(nova);
  }, [estacao, playlist]);

  // ✏️ RENOMEAR — a rede de segurança do nome. Por melhor que o título
  // automático fique, quem sabe como chamar a música é o dono dela: "salvar
  // o nome da playlist embaixo de onde está escrito A SUA PLAYLIST,
  // exatamente como os dois primeiros, senão eu não sei qual é". Clicou no
  // lápis, o nome vira campo; Enter ou sair do campo salva, Esc desiste.
  const renomear = useCallback((id, nome) => {
    const limpo = String(nome || '').trim().slice(0, 70);
    if (!limpo) return;
    const nova = playlist.map((m) => (m.id === id ? { ...m, nome: limpo } : m));
    setPlaylist(nova);
    gravarPlaylist(nova);
    // se é justamente o que está tocando, a pílula muda de nome junto
    setEstacao((e) => (e?.id === id ? { ...e, nome: limpo } : e));
  }, [playlist]);

  const remover = useCallback((id) => {
    const nova = playlist.filter((m) => m.id !== id);
    setPlaylist(nova);
    gravarPlaylist(nova);
  }, [playlist]);

  return (
    // 📏 bottom-14, não bottom-4: o selo "Preview oficial" mora em
    // `fixed bottom-2 left-2` e estava por cima da pílula — o dono não
    // conseguia ler o que tocava. Agora a pílula senta acima dele.
    <div
      ref={painelRef}
      aria-hidden={rolando}
      className={`fixed bottom-14 left-4 z-40 print:hidden transition-all duration-300 ${rolando ? 'opacity-0 translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0'}`}
    >
      <div
        aria-hidden={!aberto}
        className={aberto ? 'mb-2' : 'absolute bottom-0 -left-[9999px] opacity-0 pointer-events-none'}
      >
        <div className="xeos-cru w-[min(88vw,20rem)] rounded-2xl border border-white/12 shadow-2xl p-3 space-y-3"
          style={{ background: 'rgba(10,16,32,0.97)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold tracking-[0.2em] text-white/70">X-MUSIC</p>
            <button type="button" onClick={() => setAberto(false)} className="text-white/40 hover:text-white">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {ligado && <Iframe src={src} />}

          {/* as vagas da casa — cada uma se confere antes de virar botão */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-1.5">estações da casa</p>
            <div className="grid grid-cols-2 gap-1.5">
              {estacoes.map((m) => {
                const conf = m.id ? conferencia[m.slot] : false;
                const conferindo = Boolean(m.id) && conf === undefined;
                const toca = Boolean(m.id) && conf !== false && conf !== undefined;
                const pedindo = vagaAlvo === m.slot;
                // segunda linha, na ordem da verdade: o que está tocando de
                // fato > conferindo > não respondeu > vazia.
                const legenda = toca ? (conf || m.nota)
                  : conferindo ? 'conferindo…'
                  : m.id ? 'fora do ar · ponha a sua'
                  : 'vazia · ponha a sua';
                return (
                  <button
                    key={m.slot}
                    type="button"
                    onClick={() => {
                      if (toca) { trocar(m); return; }
                      // não toca? não finge que toca: abre a vaga pro link
                      vibrar(VIBRA_TOQUE);
                      setVagaAlvo(pedindo ? null : m.slot);
                    }}
                    title={legenda}
                    className={`text-left rounded-lg px-2.5 py-1.5 transition-colors ${
                      estacao?.id === m.id && toca ? 'bg-white/15'
                        : pedindo ? 'bg-amber-400/20 ring-1 ring-amber-300/40'
                        : toca ? 'bg-white/[0.06] hover:bg-white/10'
                        : 'bg-white/[0.03] hover:bg-white/[0.08]'}`}
                  >
                    <span className={`block text-[11px] font-bold ${toca ? 'text-white' : 'text-white/55'}`}>{m.nome}</span>
                    <span className={`block text-[9px] truncate ${toca ? 'text-white/45' : 'text-amber-200/70'}`}>
                      {pedindo ? 'cole o link aqui embaixo' : legenda}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* a coleção dele — a MESMA do Ritual do Amanhecer */}
          {playlist.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-1.5">a sua playlist</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {playlist.map((m) => (
                  <div key={m.id} className="flex items-center gap-1.5">
                    {editando === m.id ? (
                      <input
                        autoFocus
                        value={nomeEdit}
                        onChange={(e) => setNomeEdit(e.target.value)}
                        onBlur={() => { renomear(m.id, nomeEdit); setEditando(null); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { renomear(m.id, nomeEdit); setEditando(null); }
                          if (e.key === 'Escape') setEditando(null);
                        }}
                        className="xeos-cru flex-1 min-w-0 rounded-lg bg-white/12 border border-white/35 text-white text-[11px] font-semibold px-2.5 py-1.5 focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => trocar(m)}
                        title={m.nome}
                        className={`flex-1 min-w-0 flex items-center gap-1.5 text-left rounded-lg px-2.5 py-1.5 text-[11px] ${estacao?.id === m.id ? 'bg-white/15 text-white font-semibold' : 'bg-white/[0.05] text-white/75 hover:bg-white/10'}`}
                      >
                        {/* o ícone de lista diz na hora se aquilo é uma playlist
                            inteira ou uma música só — sem precisar abrir */}
                        {m.lista && <ListMusic className="w-3 h-3 shrink-0 text-white/45" />}
                        <span className="truncate">{m.nome}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setEditando(m.id); setNomeEdit(m.nome || ''); }}
                      title="dar um nome que você reconheça"
                      className="shrink-0 text-white/30 hover:text-white/70"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => remover(m.id)} title="tirar da playlist" className="shrink-0 text-white/30 hover:text-white/70">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* salvar o que está tocando */}
          {ligado && !naPlaylist && !ehDaCasa && (
            <button
              type="button"
              onClick={favoritar}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-400/15 text-amber-200 text-[11px] font-bold py-2 hover:bg-amber-400/25"
            ><Star className="w-3.5 h-3.5" fill="currentColor" /> salvar na minha playlist</button>
          )}

          {/* colar link novo */}
          <div className="flex gap-1.5">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') tocarLink(); }}
              placeholder={vagaAlvo ? `link do YouTube pra ${estacoes.find((e) => e.slot === vagaAlvo)?.nome}` : 'cole um link ou playlist do YouTube'}
              className="xeos-cru flex-1 min-w-0 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/35 text-[11px] px-2.5 py-2 focus:outline-none focus:border-white/40"
            />
            <button type="button" onClick={tocarLink} className="xeos-cru shrink-0 rounded-lg bg-white text-[#0A1020] text-[11px] font-bold px-3">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {aviso && <p className="text-[10px] font-semibold text-amber-300">{aviso}</p>}

          <p className="text-[9px] leading-snug text-white/30">
            A música continua tocando enquanto você anda pelos Hábitos. No celular, com a tela
            apagada, o YouTube pausa — é regra do próprio YouTube pra player embutido.
          </p>
        </div>
      </div>

      {/* a pílula: liga/desliga e abre o painel */}
      <div className="xeos-cru inline-flex items-center gap-1 rounded-full border border-white/12 shadow-2xl pl-1 pr-1"
        style={{ background: 'rgba(10,16,32,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <button
          type="button"
          onClick={() => { vibrar(VIBRA_TOQUE); setLigado((v) => !v); }}
          title={ligado ? 'pausar o X-Music' : 'ligar o X-Music'}
          className={`m-1 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${ligado ? 'bg-nz-verde text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
        >
          {ligado ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4" fill="currentColor" />}
        </button>
        <button
          type="button"
          onClick={() => {
            vibrar(VIBRA_ABRIR);
            // 🎧 mesmo princípio do Ritual das 5h: lá a música já entra
            // quando a tela abre, ninguém precisa procurar o play. Aqui,
            // abrir o painel com tudo parado já liga na última estação. E
            // tem que ser DENTRO do clique: sem esse toque da pessoa o
            // navegador bloqueia som que começa sozinho.
            setAberto((v) => {
              if (!v && !ligado) setLigado(true);
              return !v;
            });
          }}
          className="flex items-center gap-2 pr-3 py-1.5 text-left"
        >
          <Radio className={`w-4 h-4 shrink-0 ${ligado ? 'text-nz-verde' : 'text-white/50'}`} />
          <span className="min-w-0">
            <span className="block text-[10px] font-extrabold tracking-[0.16em] text-white/50 leading-none">X-MUSIC</span>
            <span className="block max-w-[9rem] truncate text-[11px] font-bold text-white leading-tight">
              {ligado ? (estacao?.nome || 'tocando') : 'desligado'}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
