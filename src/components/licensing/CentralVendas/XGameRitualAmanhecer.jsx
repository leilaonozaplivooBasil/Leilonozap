import React, { useEffect, useRef, useState } from 'react';
import { X, Volume2, VolumeX, Sunrise, HeartHandshake, Video, Square, Check, Star, ChevronDown, ChevronRight, SwitchCamera, Camera, Loader2, AlertTriangle, Pencil, Mic, Music2 } from 'lucide-react';
import useDitado from '@/hooks/useDitado';
import BotaoDitado from '@/components/common/BotaoDitado';
import DicaDaEtapa from './DicaDaEtapa';
import FundoJanelaDoMar from './FundoJanelaDoMar';
import { juntarTexto } from '@/lib/ditado';
import { restricoesDaCamera, opcoesDoGravador, avisoDoVideoGrande } from '@/lib/gravadorDeVideo';
import { gratidaoEntregue, progressoDaGratidao, VISUALIZACAO_MIN_SEG, gratidaoAudioMinSegHoje, metaMotivosGratidaoHoje, AVISO_COLAR, LINK_ABRIR_INSTAGRAM, VISUALIZACAO_TETO_SEG, faltaDaVisualizacao, textoDoCronometroVisualizacao, validarPrint, hashDoArquivo, dataISO } from '@/lib/xgame';
// 🧱 as regras dos três blocos moram FORA da tela (lib pura, testada em node).
// Duas vezes nesta casa uma regra nasceu dentro de um .jsx e o teste não
// conseguiu importar — não tem terceira.
import { som, somDesligado, silenciarSom } from '@/lib/somDaInterface';
import { BLOCOS, ROTULO_DO_BLOCO, segundosRestantes, ritualExpirado, textoDoPrazo, blocosFeitos, proximoBloco, pendenciasDoRitual, seloDoRitual, blocosQuePedemAtencao, RITUAL_MINUTOS_PARA_CONCLUIR } from '@/lib/ritualEmBlocos';
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
    // 🔴 13/09/2026 — UTC não é Brasília das 21h às 23h59 (DIR-129/134).
    return j?.id && j?.data === dataISO() ? j : null;
  } catch { return null; }
};
const salvarMusica = (id, lista = false) => {
  try { localStorage.setItem(CHAVE_MUSICA, JSON.stringify({ id, lista, data: dataISO() })); } catch { /* sem storage */ }
};

// ⭐ A PLAYLIST DO AMANHECER da pessoa (fica no aparelho): cada link que ela
// joga pode ser favoritado — "salva isso pra amanhã" — e a coleção cresce.
const CHAVE_PLAYLIST = 'xgame_playlist_amanhecer';
/** A pessoa deixou o player aberto ou encolhido? Preferência DO APARELHO. */
const CHAVE_MUSICA_ABERTA = 'xgame_musica_aberta';
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
      className="w-full h-28 block"
    />
  );
});

/** O HALO: o ícone do passo num círculo de vidro com brilho — no lugar do
 *  emoji gigante, que virava um quadradinho feio na tela cheia. */
function Halo({ children }) {
  return (
    <span className="mx-auto flex w-24 h-24 items-center justify-center rounded-full bg-[#FFC46B]/12 ring-1 ring-[#FFC46B]/35 backdrop-blur-sm"
      style={{ boxShadow: '0 0 70px rgba(255,196,107,0.40), inset 0 2px 14px rgba(255,240,215,0.22)' }}
    >{children}</span>
  );
}

/** O botão principal do ritual: sólido, com lábio 3D, afundando ao clicar. */
// `marca` vira `data-teste`: sem ela, todo botão desta tela é invisível pra
// banca do navegador — e um botão que a prova não acha é um botão sem prova.
function BotaoRitual({ onClick, children, disabled, marca }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...(marca ? { 'data-teste': marca } : {})}
      className="xeos-cru rounded-2xl bg-[#FFC46B] text-[#0A1B2E] text-[15px] sm:text-[16px] font-extrabold tracking-wide px-10 py-4 hover:bg-[#FFD9A0] disabled:opacity-30 transition-transform active:translate-y-[3px]"
      style={{ boxShadow: '0 5px 0 0 #A7703A, 0 14px 34px rgba(255,170,80,.28)' }}
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

// 🧱 OS PASSOS, COM NOME. O ritual passou de 4 telas soltas pra 3 BLOCOS que
// gravam sozinhos (Luiz, 10/09: "vamos dividir em três"), e número solto num
// `passo === 2` espalhado pelo arquivo é como se troca a ordem sem perceber.
const P = Object.freeze({ ABERTURA: 0, ACORDEI: 1, GRATIDAO: 2, VISUALIZACAO: 3, FECHAMENTO: 4 });

// 🌅 O DIA NASCE ENQUANTO ELA FAZ. Cada bloco entregue esquenta a luz da
// janela: abre na hora azul, fecha com o sol alto. Não é enfeite — é a mesma
// coisa que ela está fazendo na vida dela naquela meia hora, acontecendo na
// tela. (dono, 22/09: "quero que ela sinta que está no mar nessa lâmina")
const LUZ_DO_PASSO = Object.freeze({ [P.ABERTURA]: 0, [P.ACORDEI]: 0.46, [P.GRATIDAO]: 0.55, [P.VISUALIZACAO]: 0.8, [P.FECHAMENTO]: 1 });
const PASSO_DO_BLOCO = Object.freeze({ acordei: P.ACORDEI, gratidao: P.GRATIDAO, visualizacao: P.VISUALIZACAO });

/** A barra 1 · 2 · 3 — onde eu estou, e o que já está em casa. */
function BarraDosBlocos({ feitos, atual }) {
  return (
    <div className="flex items-center justify-center gap-2" data-teste="barra-dos-blocos">
      {BLOCOS.map((nome, i) => {
        const pronto = feitos.includes(nome);
        const aqui = atual === nome;
        return (
          <span key={nome} className="flex items-center gap-2">
            <span
              data-teste={`bloco-${nome}${pronto ? '-pronto' : ''}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${
                pronto ? 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/40'
                  : aqui ? 'bg-white/20 text-white ring-1 ring-white/40' : 'text-white/35'}`}
            >
              {pronto ? <Check className="w-3 h-3" strokeWidth={3} /> : <span className="font-black">{i + 1}</span>}
              {ROTULO_DO_BLOCO[nome]}
            </span>
            {i < BLOCOS.length - 1 && <span className={pronto ? 'text-emerald-300/50' : 'text-white/20'}>·</span>}
          </span>
        );
      })}
    </div>
  );
}

export default function XGameRitualAmanhecer({ nome, sonhos = [], diaCorridoCiclo = 1, comprovacaoAtual = null, onBloco, onFechar, onConcluir, onExplicar, onRefazer, onPedirAjuda, fotoDeFundo = null }) {
  // 🙏 DIR-121 — a régua de HOJE, crescendo dia a dia (ver xgame.js).
  const metaMotivosHoje = metaMotivosGratidaoHoje(diaCorridoCiclo);
  const minSegHoje = gratidaoAudioMinSegHoje(diaCorridoCiclo);
  // 🧱 O ESTADO DOS BLOCOS vem do que JÁ ESTÁ GRAVADO, não de zero.
  // É a promessa do dono: "se o telefone morrer no bloco 3, os blocos 1 e 2
  // já estão em casa" — reabrir cai no bloco que falta, não no começo.
  const [comprovacao, setComprovacao] = useState(comprovacaoAtual);
  const feitos = blocosFeitos(comprovacao);
  const faltando = proximoBloco(comprovacao);
  // 🔇 quem faz o ritual às 4:40 pode estar do lado de quem dorme. A
  // preferência é DO APARELHO (localStorage), não da conta: a mesma pessoa
  // pode querer som no computador e silêncio no celular da cabeceira.
  const [mudo, setMudo] = useState(() => somDesligado());
  const [passo, setPasso] = useState(() => (feitos.length ? (PASSO_DO_BLOCO[faltando] ?? P.FECHAMENTO) : P.ABERTURA));
  const [salvando, setSalvando] = useState('');
  // ⏱️ o cronômetro de 30 minutos — começa quando o primeiro bloco é aberto,
  // não no relógio da parede (ver ritualEmBlocos.js: as DUAS réguas).
  const [abertoEm, setAbertoEm] = useState(() => comprovacaoAtual?.aberto_em || null);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!abertoEm) return undefined;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [abertoEm]);
  const segRestantes = segundosRestantes({ abertoEm, agora });
  const expirou = ritualExpirado({ abertoEm, agora });
  // ✍️ qual das duas opções da gratidão a pessoa escolheu (nenhuma, no começo)
  const [modoEscrita, setModoEscrita] = useState(false);
  // 📸 BLOCO 1 — o print do bom dia
  const [print, setPrint] = useState(null);      // File
  const [printUrlLocal, setPrintUrlLocal] = useState(null);
  // 🤖 se a imagem nasceu da lente agora, a IA não pode reprovar por "pode
  // ser de outro dia" nem por escuridão de 4h40 — ver xgameValidarPrint.
  const [fotoAoVivo, setFotoAoVivo] = useState(false);
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
  // ═══════════════════════════════════════════════════════════════════════
  // 🗣️ EXPLICAR OU REFAZER (16/09/2026)
  // ═══════════════════════════════════════════════════════════════════════
  // Ordem do dono: "sempre que reprovar ou for parcial, deve vir NA HORA um
  // texto pedindo pra contextualizar; se seguir em dúvida, avisa e pede pra
  // refazer, garantindo que a pessoa consiga refazer a etapa da dúvida".
  //
  // O veredito da IA chega DEPOIS da gravação do bloco (é de propósito:
  // ninguém espera às 5h). Quando ele chega, este painel aparece sozinho —
  // em qualquer passo, não só no fechamento.
  const [explicando, setExplicando] = useState('');
  const [textoExplicacao, setTextoExplicacao] = useState('');
  const [enviandoExplicacao, setEnviandoExplicacao] = useState(false);
  const [semVideoLiberado, setSemVideoLiberado] = useState(false);
  // 🎵 a música do amanhecer: a do dia salva → 1ª da playlist dela → prévia
  const [playlist, setPlaylist] = useState(lerPlaylist);
  // 🎧 a coleção é a MESMA do X-Music (mesma chave no aparelho), e lá dá pra
  // salvar PLAYLIST inteira — por isso aqui carrega o item completo, não só
  // o id: uma playlist tocada como se fosse faixa única não abre.
  const escolhaInicial = () => musicaSalva() || lerPlaylist()[0] || PREVIAS_MUSICA[0];
  const [musicaId, setMusicaId] = useState(() => escolhaInicial().id);
  const [musicaLista, setMusicaLista] = useState(() => !!escolhaInicial().lista);
  // 🎵 22/09 — a música virou uma PÍLULA que expande (ordem do dono: "que ela
  // tenha a opção de expandir e diminuir igual o X-Music, só que um pouco
  // menor"). Quem gosta de ver o player deixa aberto: a escolha fica no
  // aparelho, igual o silêncio e a playlist.
  const [musicaAberta, setMusicaAberta] = useState(() => {
    try { return localStorage.getItem(CHAVE_MUSICA_ABERTA) === '1'; } catch { return false; }
  });
  const alternarMusicaAberta = () => {
    setMusicaAberta((v) => {
      const novo = !v;
      try { localStorage.setItem(CHAVE_MUSICA_ABERTA, novo ? '1' : '0'); } catch { /* sem storage */ }
      return novo;
    });
  };
  const [linkMusica, setLinkMusica] = useState('');
  const trocarMusica = (m) => {
    setMusicaId(m.id);
    setMusicaLista(!!m.lista);
    salvarMusica(m.id, !!m.lista);
  };
  const naPlaylist = playlist.some((m) => m.id === musicaId);
  const ehPrevia = PREVIAS_MUSICA.some((m) => m.id === musicaId);
  // o nome que aparece na pílula quando o player está encolhido: sem ele, a
  // pessoa não sabe o que está tocando sem abrir
  const nomeDaMusicaDeHoje = [...playlist, ...PREVIAS_MUSICA].find((m) => m.id === musicaId)?.nome || 'sua música do dia';
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
  // 📷 22/09 — A CÂMERA DO DESPERTAR, na própria lâmina.
  // O dono: "precisa ter também a câmera aqui pra bater a foto, é muito
  // melhor isso, está dando trabalho manter todas as outras." Ela é
  // SEPARADA da câmera do vídeo da visualização de propósito: aquela liga
  // MediaRecorder, cronômetro e teto de segurança; esta só mostra o que a
  // lente vê e congela um quadro. Misturar as duas era herdar o gravador
  // inteiro numa tela que não grava nada.
  const [camFotoAberta, setCamFotoAberta] = useState(false);
  const [ladoCameraFoto, setLadoCameraFoto] = useState('user');
  const videoFotoRef = useRef(null);
  const streamFotoRef = useRef(null);

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
      const stream = await navigator.mediaDevices.getUserMedia(restricoesDaCamera(lado));
      camRef.current = stream;
      const pedacos = [];
      // 🎥 11/09 — o teto vive em gravadorDeVideo.js, com o porquê escrito lá.
      // O `catch` de baixo é de tipo diferente do catch geral: se ESTE
      // navegador recusar o dicionário de opções, o certo é gravar sem teto —
      // ficar sem vídeo por causa de uma opção seria trocar um problema raro
      // por um pior.
      const opcoes = opcoesDoGravador((t) => MediaRecorder.isTypeSupported(t));
      let rec;
      try { rec = new MediaRecorder(stream, opcoes); }
      catch { rec = new MediaRecorder(stream); }
      rec.ondataavailable = (e) => { if (e.data?.size) pedacos.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(pedacos, { type: rec.mimeType || 'video/webm' });
        setVideoBlob(blob);
        // 🔴 e se AINDA assim passar do teto, a pessoa fica sabendo AGORA —
        // antes de apertar concluir e antes de tentar de novo no escuro.
        const grande = avisoDoVideoGrande(blob.size);
        if (grande) setAviso(grande);
      };
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
    // 🔴 13/09/2026 — UTC não é Brasília das 21h às 23h59 (DIR-129/134).
    const hoje = dataISO();
    let seed = 0;
    for (let i = 0; i < hoje.length; i += 1) seed = ((seed * 31) + hoje.charCodeAt(i)) >>> 0;
    const rnd = () => { seed = ((seed * 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = todas.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [todas[i], todas[j]] = [todas[j], todas[i]];
    }
    return todas.slice(0, 12);
     
  }, [sonhos.length]);
  // um sonho de cada vez: a troca acontece a cada 40s (o anterior ainda está
  // saindo quando o próximo entra — travessia de 50s, sobreposição suave)
  const [sonhoIdx, setSonhoIdx] = useState(0);
  useEffect(() => {
    if (passo !== P.VISUALIZACAO || imagensDosSonhos.length === 0) return undefined;
    const t = setInterval(() => setSonhoIdx((i) => i + 1), 40000);
    return () => clearInterval(t);
     
  }, [passo, imagensDosSonhos.length]);
  const sonhoTitulo = sonhos[0]?.titulo || sonhos[0]?.nome || sonhos[0]?.texto || '';

  // ═════════════════════════════════════════════════════════════════════
  // 🧱 SALVAR BLOCO — o coração da mudança de 10/09.
  // ═════════════════════════════════════════════════════════════════════
  // Antes, o ritual inteiro era UMA gravação no fim: cinco a oito minutos de
  // trabalho e um veredito só, com três formas de perder tudo (o relógio
  // virou, o ambiente não convenceu, o vídeo não subiu). Em 09 e 10/09, sete
  // de dez tentativas terminaram em zero.
  //
  // Agora cada bloco vai pro banco quando termina. Falhou o de cima? O de
  // baixo continua em casa. `onBloco` devolve a comprovação já gravada — é
  // ela que manda no que a tela mostra, não um espelho local que pode mentir.
  const salvarBloco = async (bloco, dados) => {
    if (salvando) return false;
    setSalvando(bloco);
    try {
      const nova = await onBloco?.(bloco, dados, { abertoEm });
      if (nova) setComprovacao(nova);
      setSalvando('');
      return !!nova;
    } catch {
      setSalvando('');
      // 🔴 falhar em silêncio aqui seria repetir o 413 de hoje de manhã, em
      // que cinco pessoas regravaram achando que o erro era delas.
      setAviso('Não consegui guardar este bloco agora. Tenta de novo — o que você já entregou está salvo.');
      setTimeout(() => setAviso(''), 8000);
      return false;
    }
  };

  // 📸 o print escolhido: validado NO APARELHO antes de qualquer rede —
  // é imagem de verdade? tem tamanho de print? já foi usada antes (hash)?
  // Isso é instantâneo e não depende de IA nenhuma.
  const escolherPrint = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = ''; // deixa reescolher o MESMO arquivo depois de um erro
    if (!f) return;
    const v = validarPrint(f);
    if (!v.valido) { setAviso(v.motivo); setTimeout(() => setAviso(''), 7000); return; }
    setPrint(f);
    setFotoAoVivo(false);
    setAviso('');
  };
  // 📷 a câmera ao vivo da lâmina do despertar.
  //
  // 🔴 POR QUE ELA VIRA O CAMINHO PRINCIPAL: a galeria devolve arquivo
  // antigo. Metade das reprovações do bloco "acordei" é print de outro dia
  // — e a pessoa nem sempre está mentindo: ela abre a galeria às 4h40 e
  // toca no primeiro "bom dia" que aparece. Foto tirada AGORA não tem esse
  // problema: ela nasce na hora, com a luz da hora.
  const pedirStreamFoto = async (lado) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: lado } }, audio: false });
    streamFotoRef.current = stream;
    // o <video> só existe depois do render — por isso o respiro
    setTimeout(() => { if (videoFotoRef.current) { videoFotoRef.current.srcObject = stream; videoFotoRef.current.play().catch(() => {}); } }, 50);
    return stream;
  };
  const fecharCameraFoto = () => {
    streamFotoRef.current?.getTracks?.().forEach((t) => t.stop());
    streamFotoRef.current = null;
    setCamFotoAberta(false);
  };
  const abrirCameraFoto = async () => {
    try {
      await pedirStreamFoto(ladoCameraFoto);
      setCamFotoAberta(true);
      setAviso('');
    } catch {
      // sem permissão ou sem câmera: quem não consegue abrir a lente NÃO
      // pode ficar sem caminho nenhum às 4h40 — a galeria continua ali.
      setAviso('Não consegui abrir a câmera. Dá pra mandar um print que você já tirou, no link abaixo.');
      setTimeout(() => setAviso(''), 8000);
    }
  };
  const virarCameraFoto = async () => {
    const novoLado = ladoCameraFoto === 'user' ? 'environment' : 'user';
    // 📵 no celular a câmera é recurso exclusivo: parar a atual ANTES de
    // pedir a outra, senão o navegador trava a promessa ou devolve a mesma.
    streamFotoRef.current?.getTracks?.().forEach((t) => t.stop());
    try { await pedirStreamFoto(novoLado); setLadoCameraFoto(novoLado); }
    catch { try { await pedirStreamFoto(ladoCameraFoto); } catch { fecharCameraFoto(); } }
  };
  const baterFoto = () => {
    const v = videoFotoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (blob) { setPrint(new File([blob], `despertar_${Date.now()}.jpg`, { type: 'image/jpeg' })); setFotoAoVivo(true); }
      fecharCameraFoto();
    }, 'image/jpeg', 0.92);
  };
  // desmontou a tela = a lente desliga. Sem isto, a luzinha da câmera fica
  // acesa depois que a pessoa fecha o ritual.
  useEffect(() => () => { streamFotoRef.current?.getTracks?.().forEach((t) => t.stop()); }, []);

  useEffect(() => {
    if (!print) { setPrintUrlLocal(null); return undefined; }
    const url = URL.createObjectURL(print);
    setPrintUrlLocal(url);
    return () => URL.revokeObjectURL(url);
  }, [print]);

  // 🔴 O FRAME DA VISUALIZAÇÃO NUNCA VIRA ARQUIVO (ver frameEmBase64.js): ele
  // vai inline pra IA e morre com a chamada. Pra reavaliar com a explicação,
  // reaproveitamos o frame que AINDA ESTÁ NA MEMÓRIA desta tela — nada novo é
  // guardado, e a intimidade do cofre não muda. Se a pessoa fechou e voltou, o
  // frame se perdeu: aí a saída honesta é refazer, não inventar uma imagem.
  const enviarExplicacao = async (bloco) => {
    const texto = textoExplicacao.trim();
    if (!texto || enviandoExplicacao) return;
    setEnviandoExplicacao(true);
    try {
      const nova = await onExplicar?.(bloco, texto, { frameBlob });
      if (nova) setComprovacao(nova);
      setExplicando(''); setTextoExplicacao('');
    } catch {
      setAviso('Não consegui enviar sua explicação agora. Tenta de novo — nada do que você entregou se perdeu.');
      setTimeout(() => setAviso(''), 8000);
    }
    setEnviandoExplicacao(false);
  };

  // Refazer DEVOLVE a pessoa pro bloco: tira o bloco do registro (é o que faz
  // `proximoBloco` apontar pra ele de novo), limpa o que estava na tela e
  // muda o passo. O cronômetro NÃO barra: quem está refazendo por pedido
  // nosso não pode perder por um prazo que correu enquanto a IA pensava.
  const refazerBloco = async (bloco) => {
    const nova = await onRefazer?.(bloco);
    if (nova) setComprovacao(nova);
    if (bloco === 'acordei') { setPrint(null); setFotoAoVivo(false); fecharCameraFoto(); }
    if (bloco === 'gratidao') { setAudioGratidao(null); setAudioGratidaoSeg(0); setGratidao(''); }
    if (bloco === 'visualizacao') { setVideoBlob(null); setFrameBlob(null); setGravSeg(0); setAcao(''); setAudioAcao(null); }
    setExplicando(''); setTextoExplicacao('');
    setPasso(PASSO_DO_BLOCO[bloco]);
  };

  // 🆘 pedir ajuda humana não devolve a pessoa pro bloco nem tira a
  // comprovação de casa — só registra o pedido. A tela continua mostrando o
  // resto do ritual do jeito que está.
  const pedirAjuda = async (bloco) => {
    const nova = await onPedirAjuda?.(bloco);
    if (nova) setComprovacao(nova);
  };

  const salvarAcordei = async () => {
    if (!print) return;
    // 📵 cinto e suspensório: no celular a câmera é recurso EXCLUSIVO. Se a
    // lente da foto sobrevivesse até a lâmina da visualização, o
    // `getUserMedia` do vídeo seria recusado e a pessoa levaria um "não
    // consegui abrir a câmera" sem ter feito nada errado. Hoje nenhum
    // caminho deixa a lente aberta aqui — mas o custo desta linha é zero e
    // o custo do engano é o ritual inteiro travado às 4h40.
    fecharCameraFoto();
    const hash = await hashDoArquivo(print).catch(() => '');
    const ok = await salvarBloco('acordei', { file: print, hash, aoVivo: fotoAoVivo });
    // 🔊 o som marca ETAPA VENCIDA, não clique. Clique que não salvou fica
    // mudo de propósito: um "ok" sonoro em cima de uma recusa mente pra pessoa.
    if (ok) { som('passo'); setPasso(P.GRATIDAO); }
  };

  const salvarGratidao = async () => {
    const ok = await salvarBloco('gratidao', {
      texto: gratidao.trim(), audioGratidao, audioGratidaoSeg, transcricaoGratidao, metaMotivosHoje,
    });
    if (ok) { som('passo'); setPasso(P.VISUALIZACAO); }
  };

  // 🧾 o que ficou pendente e qual selo o ritual está valendo AGORA — as duas
  // coisas saem da comprovação GRAVADA, não do estado da tela: é o que está
  // no banco que a gestão vai ler depois.
  const pendencias = pendenciasDoRitual(comprovacao);
  const selo = seloDoRitual(comprovacao);
  const faltaVideo = !comprovacao?.blocos?.visualizacao?.video_path;

  const salvarVisualizacao = async () => {
    const ok = await salvarBloco('visualizacao', { videoBlob, frameBlob, gravSeg, acao: acao.trim(), audioAcao });
    if (ok) { som('passo'); setPasso(P.FECHAMENTO); }
  };

  // sair do passo 2: precisa do vídeo — e se não tiver, o sistema EXPLICA
  const continuarDoSonho = () => {
    if (!videoBlob && !semVideoLiberado) {
      setAviso('Você precisa GRAVAR a sua visualização pra comprovar o ritual — é rapidinho: aperta "Gravar minha visualização", olha pro seu sonho e respira. Sem o vídeo, a comprovação cai na análise manual do gestor.');
      setSemVideoLiberado(true); // o próximo clique deixa seguir mesmo assim
      return;
    }
    pararGravacao();
    salvarVisualizacao();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070E18] overflow-hidden">
      <FundoJanelaDoMar luz={LUZ_DO_PASSO[passo] ?? 0} foto={fotoDeFundo} raios={passo === P.ACORDEI} />
      {/* o QUADRO DOS SONHOS na visualização: UM sonho de cada vez, ENORME
          (quase preenchendo a tela, no celular e no desktop), subindo devagar
          como numa meditação — um saindo, o próximo entrando, em ordem que
          muda todo dia */}
      <style>{`@keyframes xgSubir { 0% { transform: translateY(40vh) scale(.94); opacity: 0 } 10% { opacity: .96 } 86% { opacity: .96 } 100% { transform: translateY(-135vh) scale(1.03); opacity: 0 } }`}</style>
      {passo === P.VISUALIZACAO && imagensDosSonhos.length > 0 && (
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

      {/* 🔴 22/09 — o antigo "sol" de brilho âmbar no pé da tela saiu: quem
          faz o nascer do sol agora é o FundoJanelaDoMar, e os dois juntos
          empastelavam a luz do horizonte. */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1">
        <button
          type="button"
          data-teste="interruptor-de-som"
          aria-pressed={!mudo}
          title={mudo ? 'som desligado neste aparelho' : 'som ligado'}
          onClick={() => { const novo = !mudo; setMudo(novo); silenciarSom(novo); if (!novo) som('passo'); }}
          className="xeos-cru rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10"
        >
          {mudo ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <button type="button" onClick={onFechar} className="xeos-cru rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>
      {/* 🎵 A MÚSICA DO AMANHECER — YouTube tocando automático; a pessoa
          escolhe a prévia ou cola a música do dia dela (fica salva) */}
      {/* 🎵 22/09 — ANTES: o player do YouTube (224×128px) ficava SEMPRE
          aberto no canto, e era a primeira coisa que o olho via ao abrir o
          ritual — brigando com o "Bom dia" que é o assunto da tela. AGORA é
          uma pílula fina; um toque abre o player e a playlist.

          🔴 O PAINEL NUNCA SAI DO DOM. Desmontar o iframe MATA a música no
          meio do ritual — encolher esconde por CSS (o mesmo jeito que o
          X-Music global já faz). */}
      <div className="absolute top-3 left-3 z-20 w-[13.5rem] max-w-[52vw]">
        <button
          type="button"
          onClick={alternarMusicaAberta}
          data-teste="musica-do-amanhecer"
          aria-expanded={musicaAberta}
          className="xeos-cru w-full flex items-center gap-2 rounded-full pl-1.5 pr-2 py-1.5 bg-[#08192A]/70 backdrop-blur-sm ring-1 ring-[#FFC46B]/25 text-left hover:ring-[#FFC46B]/50"
        >
          <span className="grid place-items-center w-6 h-6 shrink-0 rounded-full bg-[#FFC46B]/20 text-[#FFD9A0]">
            <Music2 className="w-3.5 h-3.5" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[8px] font-black uppercase tracking-[.16em] text-[#FFC46B]/75 leading-none">a música de hoje</span>
            <span className="block truncate text-[11px] font-bold text-[#FFF8F0] leading-tight">{nomeDaMusicaDeHoje}</span>
          </span>
          {musicaAberta
            ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[#E6D5C3]" />
            : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#E6D5C3]" />}
        </button>

        <div className={musicaAberta ? 'mt-1.5 space-y-1.5' : 'absolute bottom-0 -left-[9999px] opacity-0 pointer-events-none'} aria-hidden={!musicaAberta}>
          <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-[#FFC46B]/20 bg-black/40">
            <PlayerYoutube id={musicaId} lista={musicaLista} />
          </div>
          {/* ⭐ tocou um link novo? um toque salva na playlist — pra amanhã */}
          {!naPlaylist && !ehPrevia && (
            <button type="button" onClick={favoritarAtual} className="block w-full rounded-full px-3 py-1 text-[11px] font-bold bg-[#FFC46B] text-[#0A1B2E] hover:bg-[#FFD9A0]">
              <Star className="w-3 h-3" fill="currentColor" /> salvar na minha playlist pra amanhã
            </button>
          )}
          <div className="w-full rounded-2xl bg-[#08192A]/75 backdrop-blur-sm ring-1 ring-[#FFC46B]/15 p-2.5 space-y-1.5 max-h-56 overflow-y-auto">
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
              <button type="button" onClick={usarLinkMusica} className="xeos-cru rounded-lg bg-[#FFC46B] text-[#0A1B2E] text-[10px] font-bold px-2">tocar</button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md text-center text-white space-y-6">
        {/* ═══════════════════════════════════════════════════════════════
            🗣️ O QUE A IA PEDIU — NA HORA, EM QUALQUER PASSO (16/09/2026)
            ═══════════════════════════════════════════════════════════════
            O veredito chega depois da gravação do bloco, então este painel
            nasce sozinho quando ele chega — não espera o fechamento. Antes,
            a pessoa só descobria que algo não passou no fim (ou nem lá).

            Dúvida → a pessoa CONTEXTUALIZA e a IA reavalia com a explicação.
            Reprovado, ou dúvida que sobreviveu à explicação → REFAZER só
            aquela etapa, com o resto do ritual intacto. */}
        {blocosQuePedemAtencao(comprovacao).map((r) => {
          // 🎨 21/09/2026 — dono: "está colocando em cima e a pessoa fica
          // parecendo que é erro... tem que botar uma explicação, leia com
          // atenção, e aí vinha o erro escrito com um fundo do texto". Cada
          // estado ganha um tom PRÓPRIO (não só vermelho/âmbar genérico), e o
          // texto que a IA escreveu de verdade ganha uma caixa clara e em
          // negrito por cima do painel translúcido — é ELE que a pessoa
          // precisa ler, não só o título.
          const tom = r.ajudaPedida
            ? { fundo: 'bg-sky-500/20', anel: 'ring-sky-300/60', titulo: 'text-sky-50', selo: 'bg-sky-400/30 text-sky-50' }
            : r.podePedirAjuda
              ? { fundo: 'bg-violet-500/20', anel: 'ring-violet-300/60', titulo: 'text-violet-50', selo: 'bg-violet-400/30 text-violet-50' }
              : r.passo === 'refazer'
                ? { fundo: 'bg-red-500/20', anel: 'ring-red-300/60', titulo: 'text-red-50', selo: 'bg-red-500/35 text-red-50' }
                : { fundo: 'bg-amber-400/20', anel: 'ring-amber-300/60', titulo: 'text-amber-50', selo: 'bg-amber-400/35 text-amber-50' };
          return (
            <div
              key={r.bloco}
              data-teste={`atencao-${r.bloco}-${r.passo}`}
              className={`xeos-cru rounded-2xl p-4 text-left space-y-3 ring-2 ${tom.fundo} ${tom.anel}`}
              style={{ boxShadow: '0 6px 24px rgba(0,0,0,0.25)' }}
            >
              <p className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${tom.selo}`} data-teste={`leia-com-atencao-${r.bloco}`}>
                <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.8} /> Leia com atenção
              </p>
              <p className={`text-[15px] font-extrabold leading-snug ${tom.titulo}`}>{r.titulo}</p>
              {r.motivo && (
                <p className="text-[13px] leading-relaxed font-bold text-[#3d1f3f] bg-white/95 rounded-xl px-3 py-2.5" data-teste={`motivo-${r.bloco}`}>
                  {r.motivo}
                </p>
              )}
              <p className="text-[12px] font-semibold text-white/90">{r.texto}</p>

              {r.passo === 'explicar' ? (
                explicando === r.bloco ? (
                  <div className="space-y-2">
                    <textarea
                      value={textoExplicacao}
                      onChange={(e) => setTextoExplicacao(e.target.value)}
                      rows={3}
                      autoFocus
                      placeholder="Escreve aqui, com as suas palavras…"
                      className="w-full rounded-xl bg-black/25 border border-white/25 text-white text-[13px] p-3 placeholder:text-white/40"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!textoExplicacao.trim() || enviandoExplicacao}
                        onClick={() => enviarExplicacao(r.bloco)}
                        data-teste={`enviar-explicacao-${r.bloco}`}
                        className="xeos-cru flex-1 rounded-xl bg-white text-[#0A1B2E] text-[12px] font-extrabold px-4 py-2.5 disabled:opacity-40"
                      >{enviandoExplicacao ? 'mandando…' : 'Mandar minha explicação'}</button>
                      <button
                        type="button"
                        onClick={() => { setExplicando(''); setTextoExplicacao(''); }}
                        className="rounded-xl border border-white/30 text-white/80 text-[12px] font-bold px-3 py-2.5 hover:bg-white/10"
                      >agora não</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setExplicando(r.bloco); setTextoExplicacao(''); }}
                      data-teste={`explicar-${r.bloco}`}
                      className="xeos-cru flex-1 rounded-xl bg-white/15 border border-white/30 text-white text-[12px] font-bold px-4 py-2.5 hover:bg-white/25"
                    >Explicar</button>
                    {/* quem prefere refazer direto não é obrigado a se justificar */}
                    <button
                      type="button"
                      onClick={() => refazerBloco(r.bloco)}
                      data-teste={`refazer-direto-${r.bloco}`}
                      className="rounded-xl border border-white/30 text-white/80 text-[12px] font-bold px-3 py-2.5 hover:bg-white/10"
                    >refazer</button>
                  </div>
                )
              ) : r.ajudaPedida ? (
                // 🆘 já pediu — sem botão de ação obrigatória, mas continua
                // podendo tentar de novo se quiser, enquanto espera.
                <button
                  type="button"
                  onClick={() => refazerBloco(r.bloco)}
                  data-teste={`refazer-${r.bloco}`}
                  className="rounded-xl border border-white/30 text-white/80 text-[12px] font-bold px-3 py-2.5 hover:bg-white/10"
                >tentar de novo mesmo assim</button>
              ) : r.podePedirAjuda ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => pedirAjuda(r.bloco)}
                    data-teste={`pedir-ajuda-${r.bloco}`}
                    className="xeos-cru flex-1 rounded-xl bg-white text-[#0A1B2E] text-[12px] font-extrabold px-4 py-2.5 hover:bg-violet-50"
                  >Pedir ajuda a um gestor</button>
                  <button
                    type="button"
                    onClick={() => refazerBloco(r.bloco)}
                    data-teste={`refazer-${r.bloco}`}
                    className="rounded-xl border border-white/30 text-white/80 text-[12px] font-bold px-3 py-2.5 hover:bg-white/10"
                  >tentar mais uma vez</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => refazerBloco(r.bloco)}
                  data-teste={`refazer-${r.bloco}`}
                  className="xeos-cru w-full rounded-xl bg-white text-[#0A1B2E] text-[12px] font-extrabold px-4 py-2.5 hover:bg-amber-50"
                >Refazer {ROTULO_DO_BLOCO[r.bloco]}</button>
              )}
            </div>
          );
        })}

        {passo === P.ABERTURA && (
          <>
            <Halo><Sunrise className="w-14 h-14 text-[#FFE7C2]" strokeWidth={1.5} /></Halo>
            {/* 🔤 22/09 — dono: "preciso que esses textos fiquem mais
                visíveis". Título com sombra própria: sobre o mar ele precisa
                se destacar sem precisar de caixa por trás. */}
            <h2
              className="text-[2.1rem] sm:text-5xl font-black tracking-tight text-[#FFF8F0]"
              style={{ textShadow: '0 2px 24px rgba(4,12,22,.75), 0 1px 2px rgba(4,12,22,.9)' }}
            >Bom dia, {nome || 'campeão'}.</h2>
            {/* 🔦 medido: em #F2E3D2 esta linha dava 4,76:1 contra a faixa quente
                do horizonte, que é exatamente onde ela cai — passava na WCAG
                por 0,26 de sobra. Em #FFF1DF dá 5,4:1 e continua mais quente
                que o título, que é o que segura a hierarquia. */}
            <p className="text-[#FFF1DF] text-[15px] sm:text-[16px] leading-relaxed max-w-sm mx-auto" style={{ textShadow: '0 1px 12px rgba(4,12,22,.75), 0 1px 2px rgba(4,12,22,.6)' }}>
              O dia ainda nem clareou — e você já está aqui.
            </p>
            {/* o selo: era um texto âmbar solto de 11px; agora tem fio de luz
                dos dois lados e peso pra virar assinatura da tela.
                🔦 22/09 — a placa escura NÃO é enfeite: medindo no celular o
                âmbar caía a 4,43:1 em cima da bruma clara do horizonte, abaixo
                do mínimo de 4,5:1 da WCAG. Com a placa ele carrega o próprio
                fundo e passa em qualquer luz do nascer do sol. */}
            <p
              data-teste="selo-antecipacao"
              className="inline-flex items-center justify-center gap-3 mx-auto rounded-full px-4 py-1.5 text-[11px] font-black tracking-[0.3em] text-[#FFC46B] ring-1 ring-[#FFC46B]/25"
              style={{ backgroundColor: 'rgba(6,18,32,.78)' }}
            >
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#FFC46B]/70" />
              ANTECIPAÇÃO É PODER
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#FFC46B]/70" />
            </p>
            {/* 🧱 O CONTRATO, DITO ANTES — não depois de errar.
                DIR-134 já tinha achado que a maior parte das reprovações do
                ritual não é "esqueceu", é "não sabia a regra". Agora a regra
                inteira cabe em três linhas, e elas vêm antes do primeiro
                clique: o que são os três blocos, quanto tempo tem, e que
                nada do que for entregue se perde no meio do caminho. */}
            {/* 🪟 o vidro fosco: é ele que faz o texto ser legível em cima do
                mar, em qualquer luz. Antes era `bg-white/10` — quase nada, e
                por isso o card sumia e o texto de 70% de branco também. */}
            <div
              className="xeos-cru rounded-2xl p-4 text-left space-y-2.5 backdrop-blur-md ring-1 ring-[#FFC46B]/30"
              style={{ background: 'linear-gradient(180deg, rgba(10,27,46,.62), rgba(6,18,32,.72))', boxShadow: '0 10px 40px rgba(3,10,20,.45)' }}
              data-teste="contrato-do-ritual"
            >
              <p className="text-[13px] text-[#FFF8F0] font-extrabold text-center tracking-wide">São três blocos, e cada um fica salvo na hora.</p>
              {BLOCOS.map((nome, i) => (
                <p key={nome} className="text-[12.5px] text-[#EBDCC9] flex items-start gap-2.5 leading-snug">
                  <span className="grid place-items-center shrink-0 w-5 h-5 mt-px rounded-full bg-[#FFC46B]/20 ring-1 ring-[#FFC46B]/45 text-[10px] font-black text-[#FFD9A0]">{i + 1}</span>
                  <span>
                    <b className="text-[#FFF8F0]">{ROTULO_DO_BLOCO[nome]}</b>
                    {nome === 'acordei' && ' — o print do seu bom dia no Instagram.'}
                    {nome === 'gratidao' && ' — fala ou escreve, você escolhe.'}
                    {nome === 'visualizacao' && ' — o vídeo olhando o seu sonho, e a ação de hoje.'}
                  </span>
                </p>
              ))}
              <p className="flex items-start gap-2 text-[11.5px] font-semibold text-[#FFD9A0] pt-2 border-t border-[#FFC46B]/25">
                <span aria-hidden="true">⏱️</span>
                <span>Você tem {RITUAL_MINUTOS_PARA_CONCLUIR} minutos a partir de agora. Se parar no meio, o que já entregou continua valendo.</span>
              </p>
            </div>
            <BotaoRitual onClick={() => { som('passo'); setAbertoEm(new Date().toISOString()); setPasso(P.ACORDEI); }}>Começar o ritual</BotaoRitual>
          </>
        )}

        {/* ═══════ BLOCO 1 — ACORDEI ═══════════════════════════════════════
            Luiz, 10/09: "o cara acorda, faz um print do Instagram no bom dia
            e comprova que ele acordou."

            🟢 E o print NÃO BLOQUEIA: ele é validado no aparelho (é imagem
            de verdade? já foi usado antes?), sobe, o bloco fecha e a pessoa
            SEGUE. A IA olha depois e o que ela achar aparece no fechamento.
            Decisão do dono, e ela tem uma razão dura: a IA passou três horas
            fora do ar hoje. Print bloqueante + IA fora = ninguém passa do
            bloco 1 às cinco da manhã. */}
        {passo === P.ACORDEI && (
          <>
            {/* ═══════════════════════════════════════════════════════════
                🌅 O DESPERTAR — 22/09/2026, ordem do dono:
                "Segunda lâmina: uma imagem que reflita o Despertar, uma
                força, que pegue a tela toda. Precisa ter também a câmera
                aqui pra bater a foto — é muito melhor isso, está dando
                trabalho manter todas as outras. Mix com textos melhores,
                mantendo limpo, porém que dê pra ler e aparecer legal no
                telefone."

                🔴 O QUE SAIU: três caminhos concorrendo na mesma tela —
                "Abrir o Instagram" num botão com degradê roxo→rosa→laranja
                (a MESMA assinatura de app-feito-por-IA que a lâmina 1
                acabou de expulsar), "Escolher o print" do mesmo tamanho, e
                só depois o comprovar. Quem acorda às 4h40 não escolhe entre
                três coisas: ou tem uma porta óbvia, ou desiste.

                🟢 O QUE ENTRA: UMA porta — a lente, aberta grande. As
                outras duas viram linha de texto pequena, pra quem precisa.
                ═══════════════════════════════════════════════════════ */}
            <Halo><Sunrise className="w-12 h-12 text-[#FFE7C2]" strokeWidth={1.5} /></Halo>
            <h2
              className="text-[1.85rem] sm:text-4xl font-black tracking-tight text-[#FFF8F0]"
              style={{ textShadow: '0 2px 24px rgba(4,12,22,.75), 0 1px 2px rgba(4,12,22,.9)' }}
            >Você levantou.</h2>
            {/* 🔦 medido no celular: em #FFF1DF esta linha dava 4,44:1 em cima
                do clarão do rompimento — REPROVADA na WCAG. Em branco puro,
                com o clarão mais contido, passa com folga. */}
            <p className="text-white text-[15px] leading-relaxed max-w-xs mx-auto" style={{ textShadow: '0 1px 14px rgba(4,12,22,.85), 0 1px 2px rgba(4,12,22,.75)' }}>
              Bate uma foto agora, do jeito que você está. É ela que marca a hora.
            </p>

            {printUrlLocal ? (
              // ✅ a foto na mão: aparece GRANDE, no mesmo tamanho em que foi
              // tirada. Miniatura de 44px fazia a pessoa apertar comprovar
              // sem ter visto direito o que estava mandando.
              <div className="xeos-cru rounded-3xl p-2 space-y-2 ring-1 ring-emerald-300/40" style={{ background: 'rgba(6,18,32,.72)' }} data-teste="print-escolhido">
                <img src={printUrlLocal} alt="a foto do seu despertar" className="mx-auto w-full max-w-[300px] rounded-2xl" />
                <button
                  type="button"
                  onClick={() => { setPrint(null); setPrintUrlLocal(null); setFotoAoVivo(false); }}
                  data-teste="trocar-a-foto"
                  className="text-[12px] font-bold text-[#FFC46B] underline hover:text-[#FFD79C]"
                >tirar outra</button>
              </div>
            ) : camFotoAberta ? (
              // 📷 a lente ABERTA. Retrato e quase a largura toda — o mesmo
              // tamanho que a câmera da visualização ganhou na DIR-170,
              // pelo mesmo motivo: num quadradinho a pessoa se vê cortada e
              // acha que não está pegando.
              <div className="space-y-2" data-teste="camera-do-despertar">
                <video
                  ref={videoFotoRef}
                  playsInline
                  muted
                  className="mx-auto w-full max-w-[300px] aspect-[3/4] rounded-3xl object-cover ring-4 ring-[#FFC46B]/50 bg-black"
                />
                <div className="flex items-center justify-center gap-2">
                  <BotaoRitual onClick={baterFoto} marca="bater-a-foto">
                    <span className="inline-flex items-center gap-2"><Camera className="w-4 h-4" strokeWidth={2.4} /> Bater a foto</span>
                  </BotaoRitual>
                  <button
                    type="button"
                    onClick={virarCameraFoto}
                    data-teste="virar-camera-do-despertar"
                    aria-label="virar a câmera"
                    className="xeos-cru rounded-2xl px-3 py-3 ring-1 ring-[#FFC46B]/40 text-[#FFC46B] hover:bg-white/10"
                    style={{ background: 'rgba(6,18,32,.72)' }}
                  ><SwitchCamera className="w-5 h-5" /></button>
                </div>
                <button type="button" onClick={fecharCameraFoto} className="text-[11px] text-[#FFF1DF]/60 underline hover:text-[#FFF1DF]">fechar a câmera</button>
              </div>
            ) : (
              <BotaoRitual onClick={abrirCameraFoto} marca="abrir-camera-do-despertar">
                <span className="inline-flex items-center gap-2"><Camera className="w-5 h-5" strokeWidth={2.4} /> Abrir a câmera</span>
              </BotaoRitual>
            )}

            {aviso && <p className="xeos-cru text-xs font-bold text-[#0A1B2E] bg-[#FFD79C] rounded-xl px-3 py-2">{aviso}</p>}

            <BotaoRitual disabled={!print || !!salvando} onClick={salvarAcordei}>
              {salvando === 'acordei' ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> guardando…</span> : 'Comprovar que acordei'}
            </BotaoRitual>

            {/* 🚪 AS DUAS PORTAS DE SERVIÇO. Continuam existindo — quem não
                tem câmera liberada não pode ficar sem saída, e quem já postou
                o story não pode ser obrigado a posar de novo. Mas são LINHA
                DE TEXTO, não botão: o tamanho é que diz qual é o caminho. */}
            {!camFotoAberta && !printUrlLocal && (
              <div className="flex flex-col items-center gap-1.5 pt-1" data-teste="portas-de-servico-do-despertar">
                <label className="xeos-cru cursor-pointer text-[12px] text-[#FFF1DF]/70 underline hover:text-[#FFF1DF]">
                  mandar um print que eu já tirei
                  <input type="file" accept="image/*" className="hidden" data-teste="print-do-bom-dia" onChange={escolherPrint} />
                </label>
                <a
                  href={LINK_ABRIR_INSTAGRAM}
                  target="_blank"
                  rel="noreferrer"
                  data-teste="abrir-instagram"
                  className="inline-flex items-center gap-1.5 text-[12px] text-[#FFF1DF]/70 underline hover:text-[#FFF1DF]"
                >
                  {/* 🌈 22/09 — dono: "precisa entrar o ícone do Instagram com
                      as cores dele, pode manter tamanho e tal, mas deixa a cor
                      do Instagram". O degradê da marca (amarelo → laranja →
                      magenta → roxo) vai no TRAÇO do ícone, via
                      `linearGradient` + `stroke`, e não num botão de fundo
                      colorido — o botão de degradê foi justamente o que saiu
                      desta lâmina. A marca aparece; o peso do caminho não muda.
                      `aria-hidden` porque quem lê em voz alta já tem o texto
                      do link logo ao lado. */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
                    <defs>
                      <linearGradient id="corDoInstagram" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FFD600" />
                        <stop offset="26%" stopColor="#FF7A00" />
                        <stop offset="54%" stopColor="#FF0069" />
                        <stop offset="78%" stopColor="#D300C5" />
                        <stop offset="100%" stopColor="#7638FA" />
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="url(#corDoInstagram)" strokeWidth="2" />
                    <circle cx="12" cy="12" r="4.2" stroke="url(#corDoInstagram)" strokeWidth="2" />
                    <circle cx="17.6" cy="6.4" r="1.15" fill="url(#corDoInstagram)" />
                  </svg>
                  postar o bom dia no Instagram também
                </a>
              </div>
            )}

            <p className="text-[#FFF1DF]/45 text-[10px]">a foto é guardada na hora — a conferência acontece depois, sem te travar aqui</p>
          </>
        )}

        {/* ═══════ BLOCO 2 — GRATIDÃO ══════════════════════════════════ */}
        {passo === P.GRATIDAO && (
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
            {/* 🎙️/✍️ DUAS OPÇÕES DO MESMO TAMANHO — Luiz, 10/09: "só o áudio.
                O áudio e o digitar. Dá duas opções."

                🔴 Antes não eram duas opções: era um botão grande de gravar e,
                embaixo, uma caixa de texto com "OU escreve com o coração" —
                plano B declarado. Quem prefere escrever lia a tela inteira
                dizendo que estava fazendo o caminho torto. Agora a pessoa
                ESCOLHE, com os dois lados pesando igual, e a escolha só abre o
                que ela pediu — uma coisa de cada vez na tela. */}
            {/* 🧹 "essa comunicação tem que ficar muito limpa" — enquanto a
                pessoa FALA, as duas portas de entrada saem da frente. Antes
                elas ficavam na tela junto com o botão de parar e com o
                painel: três coisas disputando o olho de quem está com sono. */}
            {!audioGratidaoUrl && !modoEscrita && !ditadoGratidao.gravando && (
              <div className="grid grid-cols-2 gap-2" data-teste="duas-opcoes-da-gratidao">
                <button
                  type="button"
                  onClick={() => ditadoGratidao.disponivel ? ditadoGratidao.alternar?.() : setModoEscrita(true)}
                  disabled={!ditadoGratidao.disponivel}
                  data-teste="opcao-falar"
                  className="xeos-cru flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-white/30 bg-white/10 text-white px-4 py-5 hover:bg-white/20 disabled:opacity-30"
                >
                  <Mic className="w-6 h-6" strokeWidth={1.8} />
                  <span className="text-[14px] font-extrabold">Falar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoEscrita(true)}
                  data-teste="opcao-escrever"
                  className="xeos-cru flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-white/30 bg-white/10 text-white px-4 py-5 hover:bg-white/20"
                >
                  <Pencil className="w-6 h-6" strokeWidth={1.8} />
                  <span className="text-[14px] font-extrabold">Escrever</span>
                </button>
              </div>
            )}
            {ditadoGratidao.disponivel && !audioGratidaoUrl && ditadoGratidao.gravando && (
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

            {(modoEscrita || audioGratidaoUrl) && (
              <textarea
                autoFocus={modoEscrita && !audioGratidaoUrl}
                value={gratidao}
                onChange={(e) => setGratidao(e.target.value)}
                onPaste={bloquearCola}
                onDrop={bloquearCola}
                placeholder={audioGratidaoUrl
                  ? 'quer acrescentar algo escrito? (opcional)'
                  : 'escreve com o coração — uma linha já muda o dia.'}
                className="xeos-cru w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm p-4 min-h-[90px] focus:outline-none focus:border-white/50"
              />
            )}
            {modoEscrita && !audioGratidaoUrl && ditadoGratidao.disponivel && (
              <button type="button" onClick={() => setModoEscrita(false)} className="text-[11px] text-white/55 underline hover:text-white/80">prefiro falar</button>
            )}
            {(aviso || ditadoGratidao.erro) && <p className="xeos-cru text-xs font-semibold text-amber-200 bg-white/10 rounded-xl px-3 py-2">{aviso || ditadoGratidao.erro}</p>}
            <div className="space-y-1.5">
              <button
                type="button"
                disabled={!entrega.ok || !!salvando}
                onClick={salvarGratidao}
                data-teste="gratidao-continuar"
                className="xeos-cru rounded-2xl bg-white text-[#0A1B2E] font-extrabold tracking-wide px-9 py-3.5 hover:bg-amber-50 disabled:opacity-30 transition-transform active:translate-y-[3px]"
                style={{ boxShadow: '0 5px 0 0 rgba(0,0,0,0.28)' }}
              >{salvando === 'gratidao' ? 'guardando…' : 'Continuar'}</button>
              {/* 📣 ESTE É O TEXTO QUE O DONO CIRCULOU DE VERMELHO (18/09).
                  A redação já estava certa — diz a falta na unidade certa,
                  conserto do chamado do Paim em 07/09. O que faltava era ser
                  VISTO, e contar o que já foi feito em vez do que falta.
                  Quem gravou 61 de 70s andou 87%; a barra mostra isso. */}
              {/* 🔴 22/09 — ANTES ISTO LIA `audioGratidaoSeg`, que só é escrito
                  quando a gravação PARA. Durante a fala ele valia 0, o painel
                  caía no ramo do texto e mostrava "0 de 20 letras · faltam 20"
                  — cobrando LETRAS de quem estava FALANDO — e a barra ficava
                  zerada justo no minuto em que ela mais serve. Quem escolhe a
                  régua agora é `progressoDaGratidao`, que enxerga a gravação
                  em andamento. E o painel aparece TAMBÉM enquanto ela fala:
                  é aí que a barra crescendo tem valor. */}
              {(!entrega.ok || ditadoGratidao.gravando) && (() => {
                const pg = progressoDaGratidao({
                  gravando: ditadoGratidao.gravando,
                  segundosAoVivo: ditadoGratidao.segundos,
                  audioSeg: audioGratidaoSeg,
                  texto: gratidao,
                  minSeg: minSegHoje,
                });
                return <DicaDaEtapa feito={pg.feito} meta={pg.meta} unidade={pg.unidade} complemento={pg.complemento} teste="dica-gratidao" />;
              })()}
            </div>
          </>
        )}

        {/* ═══════ BLOCO 3 — VISUALIZAÇÃO ══════════════════════════════ */}
        {passo === P.VISUALIZACAO && (
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
                {/* 📷 21/09/2026 — dono: "abre só um quadradinho, a pessoa
                    fica aparecendo cortada... tem que abrir uma foto real, a
                    câmera real, pegando praticamente o celular todo". Era
                    160×160px num círculo (`w-40 h-40 rounded-full`), cortando
                    a pessoa pelos quatro cantos. Agora ocupa a largura quase
                    toda da tela, em retrato (proporção de selfie), sem
                    cortar em círculo. */}
                <video ref={videoAoVivoRef} playsInline muted className="mx-auto w-full max-w-[300px] aspect-[3/4] rounded-3xl object-cover ring-4 ring-amber-300/60" />
                {/* 🕐 DIR-93 — ordem do dono: "precisa de pelo menos 01 minuto
                    obrigatório e isso precisa ficar claro pra pessoa, e
                    deixar livre até a pessoa quiser". O piso (60s) é a única
                    trava; o teto (VISUALIZACAO_TETO_SEG, 15min) é só uma
                    rede de segurança que quase nunca vai ser alcançada. */}
                <p className="flex items-center justify-center gap-2 text-amber-200 text-xs font-extrabold tracking-wide" data-teste="cronometro-visualizacao">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {textoDoCronometroVisualizacao(gravSeg)}
                </p>
                {/* 📣 18/09 — a MESMA dor do "fale mais 9s": o quanto falta pra
                    liberar só existia no `title` (que no celular ninguém vê) e
                    dentro do rótulo do botão apagado. Agora a barra enche na
                    frente da pessoa enquanto ela visualiza. */}
                {faltaDaVisualizacao(gravSeg) > 0 && (
                  <DicaDaEtapa
                    feito={gravSeg}
                    meta={VISUALIZACAO_MIN_SEG}
                    unidade="s"
                    complemento="Olha os sonhos subindo. Respira. Visualiza você chegando lá."
                    teste="dica-visualizacao"
                  />
                )}
                {faltaDaVisualizacao(gravSeg) === 0 && (
                  // 📊 21/09/2026 — dono: "os segundos precisa contar, a barra
                  // do vídeo precisa estar mais visual". A DicaDaEtapa some
                  // assim que libera (ela é feita pra "meta batida, ✓" — não
                  // pra gravação contínua); esta barra própria substitui ela
                  // aqui, mostrando o progresso até o teto de segurança
                  // (VISUALIZACAO_TETO_SEG) — a gravação nunca fica sem
                  // nenhum indicador visual, do primeiro ao último segundo.
                  <div className="space-y-1.5">
                    <p className="text-emerald-200 text-[11px] font-bold">✅ já vale — grave mais se quiser, ou conclua quando estiver pronta</p>
                    <div className="h-1.5 w-full rounded-full bg-black/25 overflow-hidden">
                      <div
                        data-teste="barra-visualizacao-extra"
                        className="h-full rounded-full bg-emerald-300 transition-[width] duration-500 ease-out"
                        style={{ width: `${Math.min(100, Math.round((gravSeg / VISUALIZACAO_TETO_SEG) * 100))}%` }}
                      />
                    </div>
                    <p className="text-white/60 text-[11px]">Olha os sonhos subindo. Respira. Visualiza você chegando lá.</p>
                  </div>
                )}
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
                  disabled={acao.trim().length < ACAO_MIN || !!salvando}
                  onClick={continuarDoSonho}
                  className="xeos-cru rounded-2xl bg-white text-[#0A1B2E] font-bold px-8 py-3 hover:bg-amber-50 disabled:opacity-40"
                >{salvando === 'visualizacao' ? 'guardando…' : 'Continuar'}</button>
                {!videoBlob && (
                  <p className="text-white/40 text-[10px]">continuar sem o vídeo manda a comprovação pra análise manual</p>
                )}
              </>
            )}
          </>
        )}

        {/* ═══════ FECHAMENTO ═════════════════════════════════════════════
            Luiz, 10/09: "vem o concluir com a informação que ele precisa
            concluir o vídeo... e se ele fez alguma coisa errada, a plataforma
            precisa sinalizar."

            🔴 Antes isso era um toast que sumia em quatro segundos. Nenhuma
            das sete pessoas reprovadas em 09 e 10/09 consegue reler por que
            foi reprovada. Aqui a lista fica PARADA na tela, e o selo é
            explicado ANTES de concluir — não depois. */}
        {passo === P.FECHAMENTO && (
          <>
            <Halo><Star className="w-12 h-12 text-white" strokeWidth={1.5} /></Halo>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {selo === 'pendente_ia' ? 'Entregue — aguardando confirmação.' : pendencias.length ? 'Quase lá.' : 'Ritual completo.'}
            </h2>

            {pendencias.length > 0 ? (
              <div className="xeos-cru rounded-2xl bg-amber-400/20 ring-2 ring-amber-300/60 p-4 text-left space-y-2" data-teste="pendencias-do-ritual">
                <p className="text-[12px] font-extrabold text-amber-100 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" strokeWidth={2.4} />
                  {selo === 'pendente_ia' ? 'Você entregou tudo — isto aqui não é sua pendência:' : 'Falta isto pra fechar com selo cheio:'}
                </p>
                {pendencias.map((x, i) => (
                  <p key={`${x.bloco}-${i}`} className="text-[12px] text-amber-50/90 flex gap-2">
                    <span className="text-amber-300">•</span><span>{x.o_que}</span>
                  </p>
                ))}
                {faltaVideo && (
                  <button
                    type="button"
                    onClick={() => setPasso(P.VISUALIZACAO)}
                    data-teste="voltar-pro-video"
                    className="xeos-cru w-full rounded-xl bg-white/15 border border-white/30 text-white text-[12px] font-bold px-4 py-2.5 hover:bg-white/25"
                  >Voltar e gravar o vídeo</button>
                )}
              </div>
            ) : (
              <p className="xeos-cru rounded-2xl bg-emerald-400/20 ring-2 ring-emerald-300/60 p-3 text-[12px] font-bold text-emerald-50">
                ⭐ Os três blocos entregues, com o vídeo. Isto é o selo BRILHANTE.
              </p>
            )}

            <p className="text-white/60 text-[12px]">
              {selo === 'brilhante' ? 'Concluir agora carimba o seu ritual como BRILHANTE.'
                : selo === 'completo' ? 'Concluir agora vale o ritual — sem o selo BRILHANTE, que é do vídeo.'
                  : selo === 'pendente_ia' ? 'A IA estava fora do ar e não confirmou um bloco a tempo — não foi você. Concluir agora manda pra revisão; você não perde o que já fez.'
                    : 'Concluir agora registra o que você entregou. O que faltou fica marcado, e amanhã tem de novo.'}
            </p>

            <div>
              <button
                type="button"
                disabled={!!salvando}
                data-teste="concluir-o-ritual"
                onClick={() => { som('conclusao'); pararGravacao(); onConcluir({ gratidao: gratidao.trim(), acao: acao.trim(), videoBlob, frameBlob, gravSeg, audioGratidao, audioGratidaoSeg, metaMotivosHoje, transcricaoGratidao, audioAcao, tempoTelaS: Math.round((Date.now() - inicioRef.current) / 1000) }); }}
                className="xeos-cru mt-2 rounded-2xl bg-white text-[#0A1B2E] font-extrabold tracking-wide px-9 py-3.5 hover:bg-amber-50 disabled:opacity-40 transition-transform active:translate-y-[3px]"
                style={{ boxShadow: '0 5px 0 0 rgba(0,0,0,0.28)' }}
              ><span className="inline-flex items-center gap-2">Concluir o ritual <Check className="w-4 h-4" strokeWidth={3} /></span></button>
            </div>
            <p className="text-white/50 text-[11px]">o ritual é a sua comprovação — horário, palavras e vídeo, carimbados</p>
          </>
        )}

        {/* 🧱 a barra dos três blocos + o cronômetro, sempre visíveis depois
            que o ritual abre. As bolinhas antigas diziam "passo 2 de 4" e
            nada mais; esta diz O QUE já está em casa — que é a informação
            que faz a pessoa não desistir no meio. */}
        {passo !== P.ABERTURA && (
          <div className="pt-3 space-y-2">
            <BarraDosBlocos feitos={feitos} atual={proximoBloco(comprovacao)} />
            {segRestantes !== null && (
              <p
                data-teste="cronometro-do-ritual"
                className={`text-[11px] font-extrabold tracking-wide ${expirou ? 'text-red-300' : segRestantes < 300 ? 'text-amber-200' : 'text-white/40'}`}
              >
                ⏱️ {textoDoPrazo(segRestantes)}{expirou ? ' — o que você já entregou continua valendo' : ' pra fechar o ritual'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
