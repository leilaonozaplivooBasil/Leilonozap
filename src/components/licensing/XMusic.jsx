import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Radio, Play, Pause, Star, X, ChevronDown, Plus } from 'lucide-react';
import {
  ESTACOES, extrairIdYoutube, extrairListaYoutube, fonteDoPlayer,
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
  const [estacao, setEstacao] = useState(() => lerEstacao() || ESTACOES[0]);
  const [playlist, setPlaylist] = useState(lerPlaylist);
  const [link, setLink] = useState('');
  const [aviso, setAviso] = useState('');
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
  const ehDaCasa = ESTACOES.some((m) => m.id === estacao?.id);

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

  const tocarLink = useCallback(async () => {
    const lista = extrairListaYoutube(link);
    const id = lista || extrairIdYoutube(link);
    if (!id) {
      setAviso('Cole um link do YouTube — música ou playlist.');
      setTimeout(() => setAviso(''), 5000);
      return;
    }
    const nome = (await buscarTitulo(id, !!lista)) || (lista ? 'Minha playlist' : 'Minha música');
    trocar({ id, nome, lista: !!lista, nota: lista ? 'sua playlist' : 'sua música' });
    setLink('');
  }, [link, trocar]);

  const favoritar = useCallback(async () => {
    if (!estacao?.id) return;
    const nome = estacao.nome || (await buscarTitulo(estacao.id, !!estacao.lista)) || 'Minha estação';
    const nova = [...playlist.filter((m) => m.id !== estacao.id), { ...estacao, nome }];
    setPlaylist(nova);
    gravarPlaylist(nova);
  }, [estacao, playlist]);

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

          {/* as estações da casa */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-1.5">estações da casa</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ESTACOES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => trocar(m)}
                  className={`text-left rounded-lg px-2.5 py-1.5 transition-colors ${estacao?.id === m.id ? 'bg-white/15' : 'bg-white/[0.06] hover:bg-white/10'}`}
                >
                  <span className="block text-[11px] font-bold text-white">{m.nome}</span>
                  <span className="block text-[9px] text-white/45">{m.nota}</span>
                </button>
              ))}
            </div>
          </div>

          {/* a coleção dele — a MESMA do Ritual do Amanhecer */}
          {playlist.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-1.5">a sua playlist</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {playlist.map((m) => (
                  <div key={m.id} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => trocar(m)}
                      className={`flex-1 text-left truncate rounded-lg px-2.5 py-1.5 text-[11px] ${estacao?.id === m.id ? 'bg-white/15 text-white font-semibold' : 'bg-white/[0.05] text-white/75 hover:bg-white/10'}`}
                    >{m.nome}</button>
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
              placeholder="cole um link ou playlist do YouTube"
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
