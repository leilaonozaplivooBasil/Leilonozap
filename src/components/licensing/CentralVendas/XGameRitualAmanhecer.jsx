import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { AVISO_COLAR, LINK_ABRIR_INSTAGRAM } from '@/lib/xgame';

// 🌅 X-GAME — O RITUAL DO AMANHECER (ordem do dono, 05/09):
//   • Abre como app de espiritualidade: céu de madrugada e SOM DE ÁGUA/MAR
//     ligando SOZINHO (ondas graves respirando + água batendo tipo riacho/
//     chuvinha — tudo sintetizado no navegador, sem arquivo). Quer silêncio?
//     Um toque desliga.
//   • Na visualização, as IMAGENS DO QUADRO DOS SONHOS sobem flutuando na
//     tela enquanto a câmera grava a meditação — o vídeo é a comprovação.
//   • Sem gravar? O sistema EXPLICA que precisa gravar pra comprovar (e
//     deixa seguir sem vídeo só caindo na análise do gestor).
//   • No fim, um convite só: o post do bom dia no Instagram.

// 🎵 A MÚSICA DO AMANHECER agora é YOUTUBE (ordem do dono): prévias prontas
// tocando automático + o espaço pra pessoa colar a MÚSICA DO DIA dela — a
// escolha fica guardada no aparelho e volta sozinha no dia seguinte.
const PREVIAS_MUSICA = [
  { id: 'UfcAVejslrU', nome: '🌊 Weightless (relaxamento)' },
  { id: 'jfKfPfyJRdk', nome: '☕ Lofi pra focar' },
];
const extrairIdYoutube = (texto) => {
  const m = /(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/.exec(String(texto || ''));
  return m ? m[1] : (/^[\w-]{11}$/.test(String(texto || '').trim()) ? String(texto).trim() : null);
};
const CHAVE_MUSICA = 'xgame_musica_do_dia';
const musicaSalva = () => {
  try {
    const j = JSON.parse(localStorage.getItem(CHAVE_MUSICA) || 'null');
    return j?.id && j?.data === new Date().toISOString().slice(0, 10) ? j.id : null;
  } catch { return null; }
};
const salvarMusica = (id) => {
  try { localStorage.setItem(CHAVE_MUSICA, JSON.stringify({ id, data: new Date().toISOString().slice(0, 10) })); } catch { /* sem storage */ }
};

const GRATIDAO_MIN = 20;
const ACAO_MIN = 10;

export default function XGameRitualAmanhecer({ nome, sonhos = [], onFechar, onConcluir }) {
  const [passo, setPasso] = useState(0);
  const [gratidao, setGratidao] = useState('');
  const [acao, setAcao] = useState('');
  const [aviso, setAviso] = useState('');
  const [semVideoLiberado, setSemVideoLiberado] = useState(false);
  // 🎵 a música do amanhecer (YouTube): a salva do dia, ou a 1ª prévia
  const [musicaId, setMusicaId] = useState(() => musicaSalva() || PREVIAS_MUSICA[0].id);
  const [musicaAberta, setMusicaAberta] = useState(false);
  const [linkMusica, setLinkMusica] = useState('');
  // 🎥 a VISUALIZAÇÃO GRAVADA: o vídeo da meditação é a comprovação do ritual
  const inicioRef = useRef(Date.now());
  const [gravando, setGravando] = useState(false);
  const [gravSeg, setGravSeg] = useState(0);
  const [videoBlob, setVideoBlob] = useState(null);
  const recRef = useRef(null);
  const camRef = useRef(null);
  const videoAoVivoRef = useRef(null);
  const timerRef = useRef(null);

  const usarLinkMusica = () => {
    const id = extrairIdYoutube(linkMusica);
    if (!id) { setAviso('Cole um link do YouTube válido (youtube.com/... ou youtu.be/...).'); setTimeout(() => setAviso(''), 5000); return; }
    setMusicaId(id);
    salvarMusica(id);
    setLinkMusica('');
    setMusicaAberta(false);
  };

  const pararGravacao = () => {
    try { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop(); } catch { /* já parou */ }
    camRef.current?.getTracks?.().forEach((t) => t.stop());
    camRef.current = null;
    clearInterval(timerRef.current);
    setGravando(false);
  };
  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480 }, audio: false });
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
        if (s + 1 >= 120) pararGravacao(); // teto de 2 min — visualização, não filme
        return s + 1;
      }), 1000);
    } catch {
      setSemVideoLiberado(true);
      setAviso('Não consegui abrir a câmera — dá pra concluir sem o vídeo, mas o ritual vai pra análise do gestor.');
      setTimeout(() => setAviso(''), 7000);
    }
  };
  useEffect(() => () => { pararGravacao(); }, []);

  const bloquearCola = (e) => { e.preventDefault(); setAviso(AVISO_COLAR); setTimeout(() => setAviso(''), 6000); };

  // o QUADRO DOS SONHOS: as imagens do Hábito 1 (o campo oficial é imagem_url)
  const imagensDosSonhos = sonhos
    .map((s) => s?.imagem_url || s?.imagem || s?.foto || (Array.isArray(s?.imagens) ? s.imagens[0] : null))
    .filter(Boolean)
    .slice(0, 8);
  const sonhoTitulo = sonhos[0]?.titulo || sonhos[0]?.nome || sonhos[0]?.texto || '';

  // sair do passo 2: precisa do vídeo — e se não tiver, o sistema EXPLICA
  const continuarDoSonho = () => {
    if (!videoBlob && !semVideoLiberado) {
      setAviso('🎥 Você precisa GRAVAR a sua visualização pra comprovar o ritual — é rapidinho: aperta "Gravar minha visualização", olha pro seu sonho e respira. Sem o vídeo, a comprovação cai na análise manual do gestor.');
      setSemVideoLiberado(true); // o próximo clique deixa seguir mesmo assim
      return;
    }
    pararGravacao();
    setPasso(3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-b from-[#141432] via-[#5b2a5e] to-[#f59e5b] overflow-hidden">
      {/* as imagens do QUADRO DOS SONHOS flutuando pra cima na visualização */}
      <style>{`@keyframes xgFlutuar { 0% { transform: translateY(20vh) scale(.9); opacity: 0 } 12% { opacity: .9 } 85% { opacity: .85 } 100% { transform: translateY(-115vh) scale(1.05); opacity: 0 } }`}</style>
      {passo === 2 && imagensDosSonhos.length > 0 && (
        <div className="pointer-events-none absolute inset-0">
          {imagensDosSonhos.map((url, i) => (
            <img
              key={`${url}-${i}`}
              src={url}
              alt=""
              className="absolute bottom-0 w-24 h-24 object-cover rounded-2xl shadow-2xl ring-2 ring-white/30"
              style={{
                left: `${(i * 31 + 7) % 78}%`,
                animation: `xgFlutuar ${16 + (i % 4) * 4}s linear infinite`,
                animationDelay: `${i * 2.4}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-36 rounded-t-full bg-gradient-to-t from-amber-300/70 to-transparent blur-2xl" />
      <button type="button" onClick={onFechar} className="absolute top-4 right-4 rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 z-20">
        <X className="w-5 h-5" />
      </button>
      {/* 🎵 A MÚSICA DO AMANHECER — YouTube tocando automático; a pessoa
          escolhe a prévia ou cola a música do dia dela (fica salva) */}
      <div className="absolute top-4 left-4 z-20 space-y-1.5">
        <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20 bg-black/40">
          <iframe
            key={musicaId}
            title="música do amanhecer"
            src={`https://www.youtube-nocookie.com/embed/${musicaId}?autoplay=1&loop=1&playlist=${musicaId}&rel=0&controls=1`}
            allow="autoplay; encrypted-media"
            className="w-56 h-32 block"
          />
        </div>
        <button
          type="button"
          onClick={() => setMusicaAberta(!musicaAberta)}
          className="rounded-full px-3 py-1 text-[11px] font-semibold bg-white/10 text-white/70 hover:text-white"
        >{musicaAberta ? '▾ 🎵 música do dia' : '▸ 🎵 escolher a música do dia'}</button>
        {musicaAberta && (
          <div className="w-56 rounded-2xl bg-black/50 backdrop-blur p-2.5 space-y-1.5">
            {PREVIAS_MUSICA.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setMusicaId(m.id); salvarMusica(m.id); setMusicaAberta(false); }}
                className={`w-full text-left rounded-lg px-2 py-1.5 text-[11px] font-semibold ${musicaId === m.id ? 'bg-white/25 text-white' : 'text-white/70 hover:bg-white/10'}`}
              >{m.nome}</button>
            ))}
            <div className="flex gap-1.5 pt-1 border-t border-white/10">
              <input
                value={linkMusica}
                onChange={(e) => setLinkMusica(e.target.value)}
                placeholder="cole o link do YouTube da SUA música"
                className="flex-1 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-[10px] px-2 py-1.5 focus:outline-none"
              />
              <button type="button" onClick={usarLinkMusica} className="rounded-lg bg-white text-[#5b2a5e] text-[10px] font-bold px-2">tocar</button>
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 w-full max-w-md text-center text-white space-y-6">
        {passo === 0 && (
          <>
            <p className="text-5xl">🌅</p>
            <h2 className="text-2xl font-bold">Bom dia, {nome || 'campeão'}.</h2>
            <p className="text-white/80 text-sm leading-relaxed">
              O dia ainda nem clareou — e você já está aqui.<br />
              <strong>ANTECIPAÇÃO É PODER.</strong>
            </p>
            <p className="text-white/60 text-xs">Respira fundo. São só alguns minutos, com você mesmo.</p>
            <button type="button" onClick={() => setPasso(1)} className="rounded-2xl bg-white text-[#5b2a5e] font-bold px-8 py-3 hover:bg-amber-50">
              Começar o ritual
            </button>
          </>
        )}

        {passo === 1 && (
          <>
            <p className="text-4xl">🙏</p>
            <h2 className="text-xl font-bold">Pelo que você é grato hoje?</h2>
            <textarea
              autoFocus
              value={gratidao}
              onChange={(e) => setGratidao(e.target.value)}
              onPaste={bloquearCola}
              onDrop={bloquearCola}
              placeholder="Escreve com o coração — uma linha já muda o dia."
              className="w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm p-4 min-h-[90px] focus:outline-none focus:border-white/50"
            />
            {aviso && <p className="text-xs font-semibold text-amber-200 bg-white/10 rounded-xl px-3 py-2">{aviso}</p>}
            <button
              type="button"
              disabled={gratidao.trim().length < GRATIDAO_MIN}
              onClick={() => setPasso(2)}
              className="rounded-2xl bg-white text-[#5b2a5e] font-bold px-8 py-3 hover:bg-amber-50 disabled:opacity-40"
            >Continuar</button>
          </>
        )}

        {passo === 2 && (
          <>
            <h2 className="text-xl font-bold">Visualiza o seu sonho.</h2>
            {sonhoTitulo ? (
              <p className="text-white/90 text-sm font-semibold">"{sonhoTitulo}"</p>
            ) : imagensDosSonhos.length === 0 ? (
              <p className="text-white/60 text-sm">Seu Quadro dos Sonhos ainda está vazio — depois do ritual, coloca o primeiro sonho com foto lá no Hábito 1, e amanhã ele flutua aqui na sua visualização.</p>
            ) : null}

            {/* 🎥 a visualização gravada — a comprovação nasce do momento */}
            {gravando ? (
              <div className="space-y-2">
                <video ref={videoAoVivoRef} playsInline muted className="mx-auto w-40 h-40 rounded-full object-cover ring-4 ring-amber-300/60" />
                <p className="text-amber-200 text-xs font-bold animate-pulse">● gravando sua visualização · {gravSeg}s</p>
                <p className="text-white/60 text-[11px]">Olha os sonhos subindo. Respira. Visualiza você chegando lá.</p>
                <button type="button" onClick={pararGravacao} className="rounded-2xl bg-white/15 border border-white/30 text-white text-sm font-bold px-6 py-2 hover:bg-white/25">
                  ⏹ concluir a visualização
                </button>
              </div>
            ) : videoBlob ? (
              <p className="text-emerald-300 text-xs font-bold">🎥 visualização gravada ({gravSeg}s) ✔ <button type="button" onClick={iniciarGravacao} className="ml-2 text-white/60 underline">regravar</button></p>
            ) : (
              <button type="button" onClick={iniciarGravacao} className="rounded-2xl bg-white/15 border border-white/30 text-white text-sm font-bold px-6 py-2.5 hover:bg-white/25">
                🎥 Gravar minha visualização <span className="block text-[10px] font-normal text-white/60">o vídeo é a sua comprovação — só você e o gestor veem</span>
              </button>
            )}

            <p className="text-white/70 text-xs">É por ISSO que você levantou. Qual a UMA coisa que você faz hoje por ele?</p>
            <input
              value={acao}
              onChange={(e) => setAcao(e.target.value)}
              onPaste={bloquearCola}
              placeholder="a ação de hoje..."
              className="w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm px-4 py-3 focus:outline-none focus:border-white/50"
            />
            {aviso && <p className="text-xs font-semibold text-amber-200 bg-white/10 rounded-xl px-3 py-2 text-left">{aviso}</p>}
            <button
              type="button"
              disabled={acao.trim().length < ACAO_MIN}
              onClick={continuarDoSonho}
              className="rounded-2xl bg-white text-[#5b2a5e] font-bold px-8 py-3 hover:bg-amber-50 disabled:opacity-40"
            >Continuar</button>
            {!videoBlob && semVideoLiberado && (
              <p className="text-white/40 text-[10px]">continuar sem o vídeo manda a comprovação pra análise manual</p>
            )}
          </>
        )}

        {passo === 3 && (
          <>
            <p className="text-4xl">📱</p>
            <h2 className="text-xl font-bold">Compartilha teu bom dia?</h2>
            <p className="text-white/70 text-sm">Convite, não obrigação: um story de bom dia inspira o time inteiro — e vale pontos extras no jogo.</p>
            <a
              href={LINK_ABRIR_INSTAGRAM}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white font-bold px-6 py-3 hover:opacity-90"
            >📱 Postar o bom dia</a>
            <div>
              <button
                type="button"
                onClick={() => { pararGravacao(); onConcluir({ gratidao: gratidao.trim(), acao: acao.trim(), videoBlob, gravSeg, tempoTelaS: Math.round((Date.now() - inicioRef.current) / 1000) }); }}
                className="mt-2 rounded-2xl bg-white text-[#5b2a5e] font-bold px-8 py-3 hover:bg-amber-50"
              >Concluir o ritual ✔</button>
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
