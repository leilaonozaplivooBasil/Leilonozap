import React, { useEffect, useRef, useState } from 'react';
import { X, Sunrise, HeartHandshake, Instagram, Video, Square, Check, Star, ChevronDown, ChevronRight, SwitchCamera } from 'lucide-react';
import useDitado from '@/hooks/useDitado';
import BotaoDitado from '@/components/common/BotaoDitado';
import { juntarTexto } from '@/lib/ditado';
import { gratidaoEntregue, faltaDaGratidao, gratidaoAudioMinSegHoje, metaMotivosGratidaoHoje, AVISO_COLAR, LINK_ABRIR_INSTAGRAM, VISUALIZACAO_TETO_SEG, faltaDaVisualizacao, textoDoCronometroVisualizacao } from '@/lib/xgame';
// 🎧 o Ritual e o X-Music compartilham o MESMO motor de música: mesma
// leitura de link, mesma fonte de player e a MESMA playlist no aparelho.
// O que a pessoa salva às 5h toca no expediente, e o que ela salva
// trabalhando volta no amanhecer.
import { extrairIdYoutube, extrairListaYoutube, fonteDoPlayer } from '@/lib/xmusic';

// 🌅 X-GAME — O RITUAL DO AMANHECER (ordem do dono, 05/09):
//   • Abre como app de espiritualidade: céu de madrugada e SOM DE ÁGUA/MAR
//     ligando SOZINHO (ondas graves respirando + água batendo tipo riacho/
//     chuvinha — tudo sintetizado no navegador, sem arquivo). Quer silêncio?
//     Um toque desliga.
//   • Na visualização, as IMAGENS DO QUADRO DOS SONHOS sobem flutuando na
//     tela enquanto a câmera grava a meditação — o vídeo é a comprovação.
//   • Sem gravar? O sistema EXPLICA que o vídeo é o que dá o selo BRILHANTE
//     (DIR-89: mesmo sem ele o ritual conclui igual, sozinho — sem gestor).
//   • No fim, um convite só: o post do bom dia no Instagram.

// 🎵 A MÚSICA DO AMANHECER agora é YOUTUBE (ordem do dono): prévias prontas
// tocando automático + o espaço pra pessoa colar a MÚSICA DO DIA dela — a
// escolha fica guardada no aparelho e volta sozinha no dia seguinte.
const PREVIAS_MUSICA = [
  { id: 'UfcAVejslrU', nome: 'Weightless · relaxamento' },
  { id: 'jfKfPfyJRdk', nome: 'Lofi pra focar' },
];
const CHAVE_MUSICA = 'xgame_musica_do_dia';
const musicaSalva = () => {
  try {
    const j = JSON.parse(localStorage.getItem(CHAVE_MUSICA) || 'null');
    return j?.id && j?.data === new Date().toISOString().slice(0, 10) ? j : null;
  } catch { return null; }
};
const salvarMusica = (id, lista = false) => {
  try { localStorage.setItem(CHAVE_MUSICA, JSON.stringify({ id, lista, data: new Date().toISOString().slice(0, 10) })); } catch { /* sem storage */ }
};

// ⭐ A PLAYLIST DO AMANHECER da pessoa (fica no aparelho): cada link que ela
// joga pode ser favoritado — "salva isso pra amanhã" — e a coleção cresce.
const CHAVE_PLAYLIST = 'xgame_playlist_amanhecer';
const lerPlaylist = () => {
  try { const j = JSON.parse(localStorage.getItem(CHAVE_PLAYLIST) || '[]'); return Array.isArray(j) ? j.slice(0, 20) : []; } catch { return []; }
};
const gravarPlaylist = (lista) => {
  try { localStorage.setItem(CHAVE_PLAYLIST, JSON.stringify(lista.slice(0, 20))); } catch { /* sem storage */ }
};
// título da música via noembed (tem CORS liberado); falhou = nome genérico
const buscarTitulo = async (id, ehLista = false) => {
  try {
    const alvo = ehLista
      ? `https://www.youtube.com/playlist?list=${id}`
      : `https://www.youtube.com/watch?v=${id}`;
    const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(alvo)}`, { signal: AbortSignal.timeout(4000) });
    const j = await r.json();
    return String(j?.title || '').slice(0, 60) || null;
  } catch { return null; }
};

// o player isolado e memoizado: o cronômetro da gravação re-renderiza o
// ritual a cada segundo, e o iframe NÃO PODE nem piscar — música fluida.
const PlayerYoutube = React.memo(function PlayerYoutube({ id, lista }) {
  return (
    <iframe
      title="música do amanhecer"
      src={fonteDoPlayer({ id, lista })}
      allow="autoplay; encrypted-media"
      className="w-56 h-32 block"
    />
  );
});

/** O HALO: o ícone do passo num círculo de vidro com brilho — no lugar do
 *  emoji gigante, que virava um quadradinho feio na tela cheia. */
function Halo({ children }) {
  return (
    <span className="mx-auto flex w-24 h-24 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/25 backdrop-blur-sm"
      style={{ boxShadow: '0 0 60px rgba(255,214,170,0.35), inset 0 2px 14px rgba(255,255,255,0.22)' }}
    >{children}</span>
  );
}

/** O botão principal do ritual: sólido, com lábio 3D, afundando ao clicar. */
function BotaoRitual({ onClick, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="xeos-cru rounded-2xl bg-white text-[#5b2a5e] text-[15px] font-extrabold tracking-wide px-10 py-4 hover:bg-amber-50 disabled:opacity-30 transition-transform active:translate-y-[3px]"
      style={{ boxShadow: '0 5px 0 0 rgba(0,0,0,0.28)' }}
    >{children}</button>
  );
}

const ACAO_MIN = 10;

// 🎙️ FALAR EM VEZ DE DIGITAR (DIR-101, 09/09/2026)
//
// Ordem do dono: levar o "enviar áudio" do Guia do Usuário pros módulos do
// X-GAME, começando por aqui. Faz sentido justo neste: são 6h da manhã, a
// pessoa está meio dormindo, no celular. Digitar gratidão com sentimento nessa
// hora é o atrito que a voz tira.
//
// ⚠️ E A REGRA DE COLAR, QUE ESTA TELA BLOQUEIA DE PROPÓSITO?
// Continua de pé, e o áudio NÃO fura ela. A regra existe contra copiar as
// palavras dos OUTROS — falar a própria gratidão é autoria, e ninguém cola uma
// fala. Digitar era o proxy que a regra usava porque era a única entrada que
// existia. Decisão do dono em 09/09: áudio conta como "as suas palavras".
//
// As três defesas que sustentam isso: o texto ditado cai no CAMPO pra pessoa
// ler e corrigir (nada sai sem ela ver), os mínimos NÃO caem (20 e 10
// caracteres continuam valendo), e a origem fica marcada no registro.

export default function XGameRitualAmanhecer({ nome, sonhos = [], diaCorridoCiclo = 1, onFechar, onConcluir }) {
  // 🙏 DIR-121 — a régua de HOJE, crescendo dia a dia (ver xgame.js).
  const metaMotivosHoje = metaMotivosGratidaoHoje(diaCorridoCiclo);
  const minSegHoje = gratidaoAudioMinSegHoje(diaCorridoCiclo);
  const [passo, setPasso] = useState(0);
  const [gratidao, setGratidao] = useState('');
  const [acao, setAcao] = useState('');
  // 🎙️ o áudio de cada campo, pra virar acervo (o dono pediu pra guardar).
  // `null` = a pessoa digitou; com blob = ela falou.
  const [audioGratidao, setAudioGratidao] = useState(null);
  const [audioGratidaoSeg, setAudioGratidaoSeg] = useState(0);
  const [audioGratidaoUrl, setAudioGratidaoUrl] = useState(null);
  // 🎙️ a transcrição da gratidão NÃO aparece na tela: ela existe só pro
  // registro, pro Diário de Bolso e pra busca. Quem falou não revisa nada.
  const [transcricaoGratidao, setTranscricaoGratidao] = useState('');
  const [audioAcao, setAudioAcao] = useState(null);
  const ditadoGratidao = useDitado({
    // sai NA HORA que solta o botão, sem esperar o Whisper: aqui o áudio é a
    // entrega, e fazer a pessoa esperar pra liberar o "Continuar" seria o
    // mesmo atrito de antes com outra roupa.
    onAudio: (blob, seg) => { setAudioGratidao(blob); setAudioGratidaoSeg(seg); },
    onTexto: (t) => setTranscricaoGratidao(t),
  });
  const ditadoAcao = useDitado({
    onTexto: (t, blob) => { setAcao((atual) => juntarTexto(atual, t)); setAudioAcao(blob); },
  });
  const [aviso, setAviso] = useState('');
  const [semVideoLiberado, setSemVideoLiberado] = useState(false);
  // 🎵 a música do amanhecer: a do dia salva → 1ª da playlist dela → prévia
  const [playlist, setPlaylist] = useState(lerPlaylist);
  // 🎧 a coleção é a MESMA do X-Music (mesma chave no aparelho), e lá dá pra
  // salvar PLAYLIST inteira — por isso aqui carrega o item completo, não só
  // o id: uma playlist tocada como se fosse faixa única não abre.
  const escolhaInicial = () => musicaSalva() || lerPlaylist()[0] || PREVIAS_MUSICA[0];
  const [musicaId, setMusicaId] = useState(() => escolhaInicial().id);
  const [musicaLista, setMusicaLista] = useState(() => !!escolhaInicial().lista);
  const [musicaAberta, setMusicaAberta] = useState(false);
  const [linkMusica, setLinkMusica] = useState('');
  const trocarMusica = (m) => {
    setMusicaId(m.id);
    setMusicaLista(!!m.lista);
    salvarMusica(m.id, !!m.lista);
  };
  const naPlaylist = playlist.some((m) => m.id === musicaId);
  const ehPrevia = PREVIAS_MUSICA.some((m) => m.id === musicaId);
  const favoritarAtual = async () => {
    const nome = (await buscarTitulo(musicaId, musicaLista)) || `Minha música ${playlist.length + 1}`;
    const nova = [...playlist.filter((m) => m.id !== musicaId), { id: musicaId, nome, lista: musicaLista }];
    setPlaylist(nova);
    gravarPlaylist(nova);
  };
  const removerDaPlaylist = (id) => {
    const nova = playlist.filter((m) => m.id !== id);
    setPlaylist(nova);
    gravarPlaylist(nova);
  };
  // 🎥 a VISUALIZAÇÃO GRAVADA: o vídeo da meditação é a comprovação do ritual
  const inicioRef = useRef(Date.now());
  const [gravando, setGravando] = useState(false);
  const [gravSeg, setGravSeg] = useState(0);
  const [videoBlob, setVideoBlob] = useState(null);
  // 🖼️ 09/09/2026 — dono, ao vivo: "não pode ser no carro, na academia, no
  // escritório — tem que ser em casa." Um frame do vídeo, capturado ENQUANTO
  // a câmera ainda está ligada (antes de parar a trilha), pra IA de visão
  // julgar o ambiente — a MESMA IA e o mesmo caminho que já julga as outras
  // comprovações (xgameValidarPrint), com uma regra nova pro tipo 'ritual'.
  const [frameBlob, setFrameBlob] = useState(null);
  const recRef = useRef(null);
  const camRef = useRef(null);
  const videoAoVivoRef = useRef(null);
  const timerRef = useRef(null);
  const [ladoCamera, setLadoCamera] = useState('user'); // DIR-93 — de qual lado a câmera está

  const usarLinkMusica = () => {
    const lista = extrairListaYoutube(linkMusica);
    const id = lista || extrairIdYoutube(linkMusica);
    if (!id) { setAviso('Cole um link do YouTube válido (música ou playlist).'); setTimeout(() => setAviso(''), 5000); return; }
    trocarMusica({ id, lista: !!lista });
    setLinkMusica('');
    setMusicaAberta(false);
  };

  // captura UM frame do <video> ao vivo — precisa rodar ANTES de parar a
  // trilha da câmera, senão o vídeo já não tem imagem nenhuma pra desenhar
  const capturarFrame = () => {
    try {
      const v = videoAoVivoRef.current;
      if (!v || !v.videoWidth) return;
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      canvas.getContext('2d').drawImage(v, 0, 0);
      canvas.toBlob((b) => { if (b) setFrameBlob(b); }, 'image/jpeg', 0.85);
    } catch { /* sem frame — a comprovação segue, só sem o cruzamento de ambiente */ }
  };

  const pararGravacao = () => {
    capturarFrame();
    try { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop(); } catch { /* já parou */ }
    camRef.current?.getTracks?.().forEach((t) => t.stop());
    camRef.current = null;
    clearInterval(timerRef.current);
    setGravando(false);
  };
  // 🔄 DIR-93 — ordem do dono: "toda comprovação tenha a possibilidade de
  // virar a câmera". `lado` vem parametrizado pra `virarCamera` poder pedir
  // o outro lado sem duplicar a lógica de ligar o MediaRecorder.
  const iniciarGravacaoCom = async (lado) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: lado }, width: 480 }, audio: false });
      camRef.current = stream;
      const pedacos = [];
      const rec = new MediaRecorder(stream, MediaRecorder.isTypeSupported('video/webm') ? { mimeType: 'video/webm' } : undefined);
      rec.ondataavailable = (e) => { if (e.data?.size) pedacos.push(e.data); };
      rec.onstop = () => setVideoBlob(new Blob(pedacos, { type: rec.mimeType || 'video/webm' }));
      recRef.current = rec;
      rec.start(1000);
      setVideoBlob(null); setGravSeg(0); setGravando(true); setAviso('');
      setTimeout(() => { if (videoAoVivoRef.current) { videoAoVivoRef.current.srcObject = stream; videoAoVivoRef.current.play().catch(() => {}); } }, 50);
      timerRef.current = setInterval(() => setGravSeg((s) => {
        if (s + 1 >= VISUALIZACAO_TETO_SEG) pararGravacao(); // rede de segurança — não é o alvo
        return s + 1;
      }), 1000);
    } catch {
      setSemVideoLiberado(true);
      setAviso('Não consegui abrir a câmera — dá pra concluir sem o vídeo, só não ganha o selo BRILHANTE.');
      setTimeout(() => setAviso(''), 7000);
    }
  };
  const iniciarGravacao = () => iniciarGravacaoCom(ladoCamera);
  // 🔄 trocar de câmera NO MEIO da gravação reinicia ela: o MediaRecorder
  // não troca de trilha de vídeo em andamento, e o vídeo é curto (teto de
  // 2 min) — regravar do zero com o lado certo é mais simples e mais seguro
  // do que tentar costurar dois streams num blob só.
  const virarCamera = () => {
    const novoLado = ladoCamera === 'user' ? 'environment' : 'user';
    setLadoCamera(novoLado);
    pararGravacao();
    setTimeout(() => iniciarGravacaoCom(novoLado), 60);
  };
  useEffect(() => () => { pararGravacao(); }, []);

  const bloquearCola = (e) => { e.preventDefault(); setAviso(AVISO_COLAR); setTimeout(() => setAviso(''), 6000); };

  // ouvir o que acabou de gravar, ali mesmo — sem ida ao servidor
  useEffect(() => {
    if (!audioGratidao) { setAudioGratidaoUrl(null); return undefined; }
    const url = URL.createObjectURL(audioGratidao);
    setAudioGratidaoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioGratidao]);

  const entrega = gratidaoEntregue({ texto: gratidao, audioSeg: audioGratidaoSeg, minSeg: minSegHoje });

  // o QUADRO DOS SONHOS: as imagens do Hábito 1 (o campo oficial é imagem_url)
  // — em ordem ALEATÓRIA que muda a cada dia (semente = a data de hoje): a
  // pessoa nunca sabe qual sonho vem preencher a tela, mas a ordem não muda
  // no meio da meditação
  const imagensDosSonhos = React.useMemo(() => {
    const todas = sonhos
      .map((s) => s?.imagem_url || s?.imagem || s?.foto || (Array.isArray(s?.imagens) ? s.imagens[0] : null))
      .filter(Boolean);
    const hoje = new Date().toISOString().slice(0, 10);
    let seed = 0;
    for (let i = 0; i < hoje.length; i += 1) seed = ((seed * 31) + hoje.charCodeAt(i)) >>> 0;
    const rnd = () => { seed = ((seed * 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = todas.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [todas[i], todas[j]] = [todas[j], todas[i]];
    }
    return todas.slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sonhos.length]);
  // um sonho de cada vez: a troca acontece a cada 40s (o anterior ainda está
  // saindo quando o próximo entra — travessia de 50s, sobreposição suave)
  const [sonhoIdx, setSonhoIdx] = useState(0);
  useEffect(() => {
    if (passo !== 2 || imagensDosSonhos.length === 0) return undefined;
    const t = setInterval(() => setSonhoIdx((i) => i + 1), 40000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo, imagensDosSonhos.length]);
  const sonhoTitulo = sonhos[0]?.titulo || sonhos[0]?.nome || sonhos[0]?.texto || '';

  // sair do passo 2: precisa do vídeo — e se não tiver, o sistema EXPLICA
  const continuarDoSonho = () => {
    if (!videoBlob && !semVideoLiberado) {
      setAviso('Você precisa GRAVAR a sua visualização pra comprovar o ritual — é rapidinho: aperta "Gravar minha visualização", olha pro seu sonho e respira. Sem o vídeo, a comprovação cai na análise manual do gestor.');
      setSemVideoLiberado(true); // o próximo clique deixa seguir mesmo assim
      return;
    }
    pararGravacao();
    setPasso(3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-b from-[#141432] via-[#5b2a5e] to-[#f59e5b] overflow-hidden">
      {/* o QUADRO DOS SONHOS na visualização: UM sonho de cada vez, ENORME
          (quase preenchendo a tela, no celular e no desktop), subindo devagar
          como numa meditação — um saindo, o próximo entrando, em ordem que
          muda todo dia */}
      <style>{`@keyframes xgSubir { 0% { transform: translateY(40vh) scale(.94); opacity: 0 } 10% { opacity: .96 } 86% { opacity: .96 } 100% { transform: translateY(-135vh) scale(1.03); opacity: 0 } }`}</style>
      {passo === 2 && imagensDosSonhos.length > 0 && (
        <div className="pointer-events-none absolute inset-0">
          {[sonhoIdx - 1, sonhoIdx].filter((n) => n >= 0).map((n) => (
            <img
              key={n}
              src={imagensDosSonhos[n % imagensDosSonhos.length]}
              alt=""
              className="absolute bottom-0 w-[min(86vw,64vh)] aspect-[3/4] object-cover rounded-[2rem] shadow-2xl ring-2 ring-white/30"
              style={{
                ...(n % 2 === 0 ? { left: '4%' } : { right: '4%' }),
                animation: 'xgSubir 50s linear forwards',
                willChange: 'transform, opacity',
              }}
            />
          ))}
        </div>
      )}

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-36 rounded-t-full bg-gradient-to-t from-amber-300/70 to-transparent blur-2xl" />
      <button type="button" onClick={onFechar} className="xeos-cru absolute top-4 right-4 rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 z-20">
        <X className="w-5 h-5" />
      </button>
      {/* 🎵 A MÚSICA DO AMANHECER — YouTube tocando automático; a pessoa
          escolhe a prévia ou cola a música do dia dela (fica salva) */}
      <div className="absolute top-4 left-4 z-20 space-y-1.5">
        <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20 bg-black/40">
          <PlayerYoutube id={musicaId} lista={musicaLista} />
        </div>
        {/* ⭐ tocou um link novo? um toque salva na playlist — pra amanhã */}
        {!naPlaylist && !ehPrevia && (
          <button type="button" onClick={favoritarAtual} className="block w-56 rounded-full px-3 py-1 text-[11px] font-bold bg-amber-400/90 text-[#3b1d3e] hover:bg-amber-300">
            <Star className="w-3 h-3" fill="currentColor" /> salvar na minha playlist pra amanhã
          </button>
        )}
        <button
          type="button"
          onClick={() => setMusicaAberta(!musicaAberta)}
          className="xeos-cru rounded-full px-3 py-1 text-[11px] font-semibold bg-white/10 text-white/70 hover:text-white"
        >{musicaAberta ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} sua playlist do amanhecer</button>
        {musicaAberta && (
          <div className="w-56 rounded-2xl bg-black/50 backdrop-blur p-2.5 space-y-1.5 max-h-64 overflow-y-auto">
            {playlist.length > 0 && (
              <>
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest"> a sua playlist</p>
                {playlist.map((m) => (
                  <div key={m.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => trocarMusica(m)}
                      className={`flex-1 min-w-0 text-left rounded-lg px-2 py-1.5 text-[11px] font-semibold truncate ${musicaId === m.id ? 'bg-white/25 text-white' : 'text-white/70 hover:bg-white/10'}`}
                    >{m.nome}</button>
                    <button type="button" onClick={() => removerDaPlaylist(m.id)} title="tirar da playlist" className="shrink-0 text-white/30 hover:text-white text-xs px-1">✕</button>
                  </div>
                ))}
              </>
            )}
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest pt-1">da casa</p>
            {PREVIAS_MUSICA.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => trocarMusica(m)}
                className={`w-full text-left rounded-lg px-2 py-1.5 text-[11px] font-semibold ${musicaId === m.id ? 'bg-white/25 text-white' : 'text-white/70 hover:bg-white/10'}`}
              >{m.nome}</button>
            ))}
            <div className="flex gap-1.5 pt-1 border-t border-white/10">
              <input
                value={linkMusica}
                onChange={(e) => setLinkMusica(e.target.value)}
                placeholder="cole um link do YouTube e toque"
                className="xeos-cru flex-1 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-[10px] px-2 py-1.5 focus:outline-none"
              />
              <button type="button" onClick={usarLinkMusica} className="xeos-cru rounded-lg bg-white text-[#5b2a5e] text-[10px] font-bold px-2">tocar</button>
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 w-full max-w-md text-center text-white space-y-6">
        {passo === 0 && (
          <>
            <Halo><Sunrise className="w-14 h-14 text-white" strokeWidth={1.5} /></Halo>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Bom dia, {nome || 'campeão'}.</h2>
            <p className="text-white/80 text-[15px] leading-relaxed max-w-sm mx-auto">
              O dia ainda nem clareou — e você já está aqui.
            </p>
            <p className="text-[11px] font-extrabold tracking-[0.28em] text-amber-200">ANTECIPAÇÃO É PODER</p>
            <p className="text-white/55 text-[13px]">Respira fundo. São só alguns minutos, com você mesmo.</p>
            <BotaoRitual onClick={() => setPasso(1)}>Começar o ritual</BotaoRitual>
          </>
        )}

        {passo === 1 && (
          <>
            <Halo><HeartHandshake className="w-12 h-12 text-white" strokeWidth={1.5} /></Halo>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Pelo que você é grato hoje?</h2>
            {/* 🙏 DIR-121 — dono: "é importante orientar ele pegar o livro da
                gratidão, escrever, e falar em voz alta ali." Escrever é no
                CADERNO de papel, fora do app — o app só grava a FALA (e é
                ela que vale, DIR-101.1). A instrução vem antes do botão,
                pra ninguém abrir a tela sem o caderno na mão. */}
            <p className="text-[13px] text-white/70 -mt-2">📓 Pega o teu caderno da gratidão. Escreve ali, e depois fala em voz alta, com calma.</p>
            {/* 🎙️ DIR-101.1 — FALAR VEM PRIMEIRO, e vale sozinho.
                Às 6h da manhã, no celular, meio dormindo, falar é o caminho
                natural. Gravou, parou: acabou. Não lê, não corrige, não
                confere. A transcrição corre por baixo, calada, só pro
                registro. Quem prefere escrever continua podendo — o campo
                está logo abaixo, com o mesmo peso de sempre. */}
            {ditadoGratidao.disponivel && !audioGratidaoUrl && (
              <div className="space-y-1.5">
                <BotaoDitado
                  ditado={ditadoGratidao}
                  rotulo="Gravar minha gratidão"
                  rotuloGravando="Pronto, terminei"
                  className="xeos-cru w-full justify-center !py-4 !text-[15px] !font-extrabold border-2 border-white/30 bg-white/10 text-white hover:bg-white/20"
                />
                {/* 🙏 DIR-121 — dono: "pelo menos uns vinte motivos... vamos
                    crescendo isso gradativamente... até chegar em cinquenta
                    dentro do mês." A régua de HOJE (metaMotivosHoje) sobe 1
                    motivo por dia corrido do ciclo — nunca mostrada como
                    número solto de segundos, sempre junto do "motivos". */}
                <p className="text-[11px] text-white/45">
                  {ditadoGratidao.gravando
                    ? 'fala com o coração — toque de novo quando terminar'
                    : `fale pelo menos ${metaMotivosHoje} motivos hoje (uns ${minSegHoje}s, sem pressa)`}
                </p>
              </div>
            )}

            {/* o que acabou de ser gravado: ouve na hora, e regrava se quiser */}
            {audioGratidaoUrl && (
              <div className="xeos-cru rounded-2xl border border-emerald-300/40 bg-emerald-400/10 p-3 space-y-2" data-teste="gratidao-gravada">
                <p className="text-xs font-bold text-emerald-200 flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" strokeWidth={3} /> gratidão gravada ({audioGratidaoSeg}s)
                </p>
                <audio src={audioGratidaoUrl} controls className="w-full h-9" />
                <button
                  type="button"
                  onClick={() => { setAudioGratidao(null); setAudioGratidaoSeg(0); setTranscricaoGratidao(''); }}
                  className="text-[11px] text-white/55 underline hover:text-white/80"
                >regravar</button>
              </div>
            )}

            <textarea
              value={gratidao}
              onChange={(e) => setGratidao(e.target.value)}
              onPaste={bloquearCola}
              onDrop={bloquearCola}
              placeholder={audioGratidaoUrl
                ? 'quer acrescentar algo escrito? (opcional)'
                : 'ou escreve com o coração — uma linha já muda o dia.'}
              className="xeos-cru w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm p-4 min-h-[90px] focus:outline-none focus:border-white/50"
            />
            {(aviso || ditadoGratidao.erro) && <p className="xeos-cru text-xs font-semibold text-amber-200 bg-white/10 rounded-xl px-3 py-2">{aviso || ditadoGratidao.erro}</p>}
            <div className="space-y-1.5">
              <button
                type="button"
                disabled={!entrega.ok}
                onClick={() => setPasso(2)}
                data-teste="gratidao-continuar"
                className="xeos-cru rounded-2xl bg-white text-[#5b2a5e] font-extrabold tracking-wide px-9 py-3.5 hover:bg-amber-50 disabled:opacity-30 transition-transform active:translate-y-[3px]"
                style={{ boxShadow: '0 5px 0 0 rgba(0,0,0,0.28)' }}
              >Continuar</button>
              {/* botão apagado tem que DIZER o que falta, na unidade certa:
                  "faltam 12 caracteres" pra quem acabou de falar é grego */}
              {!entrega.ok && (
                <p className="text-[11px] text-white/45">{faltaDaGratidao({ texto: gratidao, audioSeg: audioGratidaoSeg, minSeg: minSegHoje })}</p>
              )}
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Visualiza o seu sonho.</h2>
            {sonhoTitulo ? (
              <p className="text-white/90 text-sm font-semibold">"{sonhoTitulo}"</p>
            ) : imagensDosSonhos.length === 0 ? (
              <p className="text-white/60 text-sm">Seu Quadro dos Sonhos ainda está vazio — depois do ritual, coloca o primeiro sonho com foto lá no Hábito 1, e amanhã ele flutua aqui na sua visualização.</p>
            ) : null}
            {/* 🏠 09/09/2026 — dono: "não pode ser no carro, na academia, no
                escritório — tem que ser em casa, com tranquilidade." Avisa
                ANTES de gravar, não depois de reprovar. */}
            {!gravando && !videoBlob && (
              <p className="text-amber-200/80 text-[11px]">🏠 tem que ser em casa, com tranquilidade — carro, academia e escritório não valem.</p>
            )}

            {/* 🎥 a visualização gravada — a comprovação nasce do momento */}
            {gravando ? (
              <div className="space-y-2">
                <video ref={videoAoVivoRef} playsInline muted className="mx-auto w-40 h-40 rounded-full object-cover ring-4 ring-amber-300/60" />
                {/* 🕐 DIR-93 — ordem do dono: "precisa de pelo menos 01 minuto
                    obrigatório e isso precisa ficar claro pra pessoa, e
                    deixar livre até a pessoa quiser". O piso (60s) é a única
                    trava; o teto (VISUALIZACAO_TETO_SEG, 15min) é só uma
                    rede de segurança que quase nunca vai ser alcançada. */}
                <p className="flex items-center justify-center gap-2 text-amber-200 text-xs font-extrabold tracking-wide" data-teste="cronometro-visualizacao">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {textoDoCronometroVisualizacao(gravSeg)}
                </p>
                <p className="text-white/60 text-[11px]">Olha os sonhos subindo. Respira. Visualiza você chegando lá.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={pararGravacao}
                    disabled={faltaDaVisualizacao(gravSeg) > 0}
                    data-teste="concluir-visualizacao"
                    title={faltaDaVisualizacao(gravSeg) > 0 ? `grava mais ${faltaDaVisualizacao(gravSeg)}s pra liberar` : ''}
                    className="xeos-cru inline-flex items-center gap-2 rounded-2xl bg-white/15 border border-white/30 text-white text-sm font-bold px-6 py-2.5 hover:bg-white/25 disabled:opacity-40 disabled:hover:bg-white/15"
                  >
                    <Square className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
                    {faltaDaVisualizacao(gravSeg) > 0 ? `libera em ${faltaDaVisualizacao(gravSeg)}s` : 'concluir a visualização'}
                  </button>
                  <button type="button" onClick={virarCamera} title="virar câmera" data-teste="virar-camera-ritual" className="xeos-cru rounded-2xl bg-white/15 border border-white/30 text-white p-2.5 hover:bg-white/25">
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : videoBlob ? (
              <p className="inline-flex items-center gap-2 text-emerald-300 text-xs font-bold">
                <Check className="w-4 h-4" strokeWidth={3} /> visualização gravada ({gravSeg}s)
                <button type="button" onClick={iniciarGravacao} className="ml-1 text-white/55 underline font-normal">regravar</button>
              </p>
            ) : (
              <button type="button" onClick={iniciarGravacao} className="xeos-cru rounded-2xl bg-white/15 border border-white/30 text-white text-sm font-bold px-6 py-2.5 hover:bg-white/25">
                <span className="inline-flex items-center gap-2"><Video className="w-4 h-4" strokeWidth={2} /> Gravar minha visualização</span>
                <span className="block mt-1 text-[10px] font-normal text-white/55">o vídeo é a sua comprovação — só você e o gestor veem</span>
              </button>
            )}

            {/* o card da AÇÃO só aparece DEPOIS da gravação concluída — uma
                coisa de cada vez, sem chuva de mensagem na meditação */}
            {(videoBlob || semVideoLiberado) && !gravando && (
              <>
                <p className="text-white/70 text-xs">É por ISSO que você levantou. Qual a UMA coisa que você faz hoje por ele?</p>
                <input
                  autoFocus
                  value={acao}
                  onChange={(e) => setAcao(e.target.value)}
                  onPaste={bloquearCola}
                  placeholder="a ação de hoje..."
                  className="xeos-cru w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm px-4 py-3 focus:outline-none focus:border-white/50"
                />
                <div className="flex justify-center">
                  <BotaoDitado
                    ditado={ditadoAcao}
                    rotulo="falar"
                    rotuloGravando="parar"
                    className="xeos-cru border border-white/25 bg-white/10 text-white hover:bg-white/20"
                  />
                </div>
              </>
            )}
            {(aviso || ditadoAcao.erro) && <p className="xeos-cru text-xs font-semibold text-amber-200 bg-white/10 rounded-xl px-3 py-2 text-left">{aviso || ditadoAcao.erro}</p>}
            {(videoBlob || semVideoLiberado) && !gravando && (
              <>
                <button
                  type="button"
                  disabled={acao.trim().length < ACAO_MIN}
                  onClick={continuarDoSonho}
                  className="xeos-cru rounded-2xl bg-white text-[#5b2a5e] font-bold px-8 py-3 hover:bg-amber-50 disabled:opacity-40"
                >Continuar</button>
                {!videoBlob && (
                  <p className="text-white/40 text-[10px]">continuar sem o vídeo manda a comprovação pra análise manual</p>
                )}
              </>
            )}
          </>
        )}

        {passo === 3 && (
          <>
            <Halo><Instagram className="w-12 h-12 text-white" strokeWidth={1.6} /></Halo>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Compartilha teu bom dia?</h2>
            <p className="text-white/70 text-sm">Convite, não obrigação: um story de bom dia inspira o time inteiro — e vale pontos extras no jogo.</p>
            <a
              href={LINK_ABRIR_INSTAGRAM}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white font-bold px-6 py-3 hover:opacity-90"
            ><span className="inline-flex items-center gap-2"><Instagram className="w-4 h-4" strokeWidth={2.2} /> Postar o bom dia</span></a>
            <div>
              <button
                type="button"
                onClick={() => { pararGravacao(); onConcluir({ gratidao: gratidao.trim(), acao: acao.trim(), videoBlob, frameBlob, gravSeg, audioGratidao, audioGratidaoSeg, metaMotivosHoje, transcricaoGratidao, audioAcao, tempoTelaS: Math.round((Date.now() - inicioRef.current) / 1000) }); }}
                className="xeos-cru mt-2 rounded-2xl bg-white text-[#5b2a5e] font-extrabold tracking-wide px-9 py-3.5 hover:bg-amber-50 transition-transform active:translate-y-[3px]"
                style={{ boxShadow: '0 5px 0 0 rgba(0,0,0,0.28)' }}
              ><span className="inline-flex items-center gap-2">Concluir o ritual <Check className="w-4 h-4" strokeWidth={3} /></span></button>
            </div>
            <p className="text-white/50 text-[11px]">o ritual é a sua comprovação — horário, palavras e vídeo, carimbados</p>
          </>
        )}

        <div className="flex items-center justify-center gap-1.5 pt-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= passo ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
