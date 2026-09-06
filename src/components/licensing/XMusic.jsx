import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Radio, Play, Pause, Star, X, ChevronDown, Plus, Pencil, ListMusic, Search, Loader2 } from 'lucide-react';
import {
  lerEstacoes, gravarEstacaoDoSlot, anotarAcerto, carregarApiYoutube, buscarNoYoutube, resolverEstacao,
  extrairIdYoutube, extrairListaYoutube,
  lerPlaylist, gravarPlaylist, lerEstacao, gravarEstacao, lerLigado, gravarLigado, buscarTitulo,
} from '@/lib/xmusic';
import { vibrar, VIBRA_TOQUE, VIBRA_ABRIR } from '@/lib/xgame';
import useOcultarAoRolar from '@/hooks/useOcultarAoRolar';
import { cabecalhosSessao } from '@/lib/sessaoCliente';

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

// 🎬 O PLAYER. Deixou de ser um <iframe> solto e passou a ser a API oficial
// do YouTube pelo motivo que apareceu na tela do dono: o <iframe> engole o
// erro. Dois vídeos passaram na conferência por título e abriram "Vídeo
// indisponível" mesmo assim — porque existir e poder ser embutido são coisas
// diferentes, e só o player sabe a segunda.
//
// Com a API a gente ganha três coisas que o X-Music precisa:
//   • onError com motivo → a fila da vaga anda sozinha até algo TOCAR;
//   • o TÍTULO REAL do que está no ar → some o rótulo inventado, e é esse
//     nome que vai pra playlist da pessoa quando ela salva;
//   • trocar de estação sem REMONTAR nada (loadVideoById/loadPlaylist), o
//     que é ainda mais seguro pro som contínuo do que o iframe memoizado.
const PlayerYT = React.memo(function PlayerYT({ alvo, ligado, onErro, onTitulo }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const alvoRef = useRef(alvo);
  const ligadoRef = useRef(ligado);
  const onErroRef = useRef(onErro);
  const onTituloRef = useRef(onTitulo);
  alvoRef.current = alvo;
  ligadoRef.current = ligado;
  onErroRef.current = onErro;
  onTituloRef.current = onTitulo;

  const carregarAlvo = useCallback(() => {
    const p = playerRef.current;
    const a = alvoRef.current;
    if (!p || !a?.id) return;
    try {
      if (a.lista) p.loadPlaylist({ list: a.id, listType: 'playlist' });
      else p.loadVideoById(a.id);
      if (!ligadoRef.current) p.pauseVideo?.();
    } catch { /* player ainda subindo */ }
  }, []);

  // nasce UMA vez e não morre mais — é o que segura o som atravessando a
  // navegação inteira dos Hábitos
  useEffect(() => {
    let morto = false;
    carregarApiYoutube().then((YT) => {
      if (morto || !YT?.Player || !hostRef.current || playerRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        height: '168',
        width: '100%',
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1, controls: 1 },
        events: {
          onReady: () => carregarAlvo(),
          onError: (e) => onErroRef.current?.(e?.data, alvoRef.current),
          onStateChange: (e) => {
            if (e?.data === YT.PlayerState?.PLAYING) {
              const t = playerRef.current?.getVideoData?.()?.title;
              if (t) onTituloRef.current?.(String(t).slice(0, 70), alvoRef.current);
            }
          },
        },
      });
    });
    return () => { morto = true; };
  }, [carregarAlvo]);

  // trocar de estação: NÃO remonta nada, só manda o player carregar outra
  useEffect(() => { carregarAlvo(); }, [alvo?.id, alvo?.lista, carregarAlvo]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try { if (ligado) p.playVideo?.(); else p.pauseVideo?.(); } catch { /* ainda subindo */ }
  }, [ligado]);

  return <div className="w-full h-[168px] overflow-hidden rounded-xl bg-black/40"><div ref={hostRef} /></div>;
});

export default function XMusic() {
  const [aberto, setAberto] = useState(false);
  const [ligado, setLigado] = useState(lerLigado);
  const [estacoes, setEstacoes] = useState(lerEstacoes);
  const [falhou, setFalhou] = useState({});           // vagas que esgotaram a fila
  const [vagaAlvo, setVagaAlvo] = useState(null);     // vaga esperando um link
  const [estacao, setEstacao] = useState(() => lerEstacao() || lerEstacoes()[0] || null);
  const [playlist, setPlaylist] = useState(lerPlaylist);
  const [link, setLink] = useState('');
  const [aviso, setAviso] = useState('');
  const [busca, setBusca] = useState('');
  const [achados, setAchados] = useState(null);      // null = nem buscou ainda
  const [buscando, setBuscando] = useState(false);
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

  const naPlaylist = playlist.some((m) => m.id === estacao?.id);

  useEffect(() => { gravarLigado(ligado); }, [ligado]);
  useEffect(() => { if (estacao) gravarEstacao(estacao); }, [estacao]);

  // a tela de bloqueio / a central de mídia do sistema mostra o que toca
  useEffect(() => {
    if (!('mediaSession' in navigator) || typeof window.MediaMetadata !== 'function') return;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: estacao?.tocando || estacao?.nome || 'X-Music',
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

  // 📻 AS VAGAS SE RESOLVEM AO ABRIR O PAINEL. Vaga sem escolha da pessoa não
  // tem link nenhum guardado: ela busca no YouTube (pela nossa rota, que só
  // devolve o que toca embutido e guarda o resultado pra equipe por 12h). É o
  // que faz "as opções funcionarem de verdade": não existe ID escrito por mim
  // que possa ter morrido — o conteúdo é o que está no ar hoje.
  useEffect(() => {
    if (!aberto) return undefined;
    let vivo = true;
    (async () => {
      for (const vaga of estacoes) {
        if (vaga.fila?.length) continue;
        const itens = await resolverEstacao(vaga.slot, cabecalhosSessao());
        if (!vivo) return;
        if (!itens.length) { setFalhou((f) => ({ ...f, [vaga.slot]: true })); continue; }
        setEstacoes((atuais) => atuais.map((v) => (
          v.slot === vaga.slot ? { ...v, fila: itens, ...itens[0] } : v
        )));
        // "deixar tocando": a primeira vaga que se resolve já vira o que
        // está no ar, se ainda não havia nada. Ninguém precisa procurar play.
        setEstacao((e) => (e?.id ? e : { ...vaga, fila: itens, ...itens[0] }));
      }
    })();
    return () => { vivo = false; };
  }, [aberto, estacoes]);

  // ⏭️ A FILA ANDA SOZINHA. Deu erro no que está tocando, o X-Music pula pro
  // próximo candidato daquela vaga sem a pessoa fazer nada — só quando a fila
  // inteira acaba é que a vaga se declara e pede um link. É isto que substitui
  // a conferência por título, que passava em vídeo que não tocava.
  const aoErrar = useCallback((codigo, alvo) => {
    if (!alvo?.slot) {
      // sem vaga: ou é link colado pela pessoa, ou é uma estação velha que
      // ficou salva no aparelho de uma versão anterior. Nos dois casos cair
      // numa tela preta é inaceitável — volta pra primeira vaga da casa, que
      // tem fila, e avisa uma vez.
      const primeira = estacoes[0];
      if (primeira?.id) setEstacao(primeira);
      setAviso('Esse link não toca aqui (fora do ar ou embed bloqueado).');
      setTimeout(() => setAviso(''), 6000);
      return;
    }
    const vaga = estacoes.find((e) => e.slot === alvo.slot);
    const fila = vaga?.fila || [];
    const i = fila.findIndex((c) => c.id === alvo.id);
    const proximo = i >= 0 ? fila[i + 1] : fila[0];
    if (proximo) { setEstacao({ ...vaga, ...proximo, tocando: null }); return; }
    setFalhou((f) => ({ ...f, [alvo.slot]: true }));
    setAviso(`"${vaga?.nome || 'Essa estação'}" está sem link que toque — cole um seu.`);
    setVagaAlvo(alvo.slot);
    setTimeout(() => setAviso(''), 8000);
  }, [estacoes]);

  // 🏷️ TOCOU DE VERDADE: guarda o título real (some o rótulo inventado) e
  // anota o candidato que funcionou, pra da próxima vez entrar direto nele.
  const aoTocar = useCallback((titulo, alvo) => {
    setEstacao((e) => (e && e.id === alvo?.id ? { ...e, tocando: titulo } : e));
    if (alvo?.slot && alvo?.id) {
      anotarAcerto(alvo.slot, alvo.id);
      setFalhou((f) => (f[alvo.slot] ? { ...f, [alvo.slot]: false } : f));
    }
  }, []);

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
      // a escolha da pessoa VIRA a fila daquela vaga — não tem por que
      // continuar tentando os candidatos da casa depois que ela decidiu.
      const novas = estacoes.map((e) => (
        e.slot === vagaAlvo ? { ...e, ...dados, fila: [dados] } : e
      ));
      setEstacoes(novas);
      setFalhou((f) => ({ ...f, [vagaAlvo]: false }));
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
    // o nome salvo é o TÍTULO REAL que o player informou — é o que a pessoa
    // acabou de ouvir, não um rótulo da casa nem um genérico.
    const nome = estacao.tocando || estacao.nome
      || (await buscarTitulo(estacao.id, !!estacao.lista, estacao.video)) || 'Minha estação';
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

  // 🔎 BUSCAR NO YOUTUBE. Tudo que volta daqui TOCA — o filtro
  // videoEmbeddable é aplicado pelo próprio YouTube na rota do servidor. É a
  // resposta definitiva pro "botão que não toca": em vez de eu adivinhar
  // links, a pessoa procura e escolhe.
  const procurar = useCallback(async () => {
    const q = busca.trim();
    if (!q) return;
    setBuscando(true);
    const r = await buscarNoYoutube(q, cabecalhosSessao());
    setBuscando(false);
    setAchados(r.itens);
    if (!r.ok) {
      setAviso(r.erro === 'sem_chave'
        ? 'O buscador ainda não tem a chave do YouTube configurada.'
        : 'A busca não respondeu agora. Tente de novo.');
      setTimeout(() => setAviso(''), 6000);
    }
  }, [busca]);

  const remover = useCallback((id) => {
    const nova = playlist.filter((m) => m.id !== id);
    setPlaylist(nova);
    gravarPlaylist(nova);
  }, [playlist]);

  return (
    // 📏 A ALTURA NÃO É UM NÚMERO SOLTO: sai da mesma régua dos outros
    // flutuantes (--nz-dock-b, do FloatingDock), mais uma folga que tira a
    // pílula de cima do selo "Preview oficial" (fixed bottom-2 left-2), que
    // estava tapando o nome do que tocava. Como a régua é a mesma, nas
    // páginas com barra de ação no rodapé — sala de leilão, loja — a pílula
    // sobe junto sozinha, em vez de cair em cima do botão de lance.
    <div
      ref={painelRef}
      aria-hidden={rolando}
      style={{ bottom: 'calc(var(--nz-dock-b, 1.75rem) + 2.25rem)' }}
      className={`fixed left-4 z-40 print:hidden transition-all duration-300 ${rolando ? 'opacity-0 translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0'}`}
    >
      <div
        aria-hidden={!aberto}
        className={aberto ? 'mb-2' : 'absolute bottom-0 -left-[9999px] opacity-0 pointer-events-none'}
      >
        {/* 📏 O painel cresce PRA CIMA e nunca vaza pra fora da tela: o teto é
            a altura da janela menos o espaço da pílula, e o que não couber
            rola DENTRO dele. Sem isto, com a busca aberta a lista passava do
            topo e o conteúdo de cima ficava cortado, inalcançável. */}
        <div className="xeos-cru w-[min(88vw,20rem)] rounded-2xl border border-white/12 shadow-2xl p-3 space-y-3 overflow-y-auto overscroll-contain"
          style={{
            background: 'rgba(10,16,32,0.97)',
            backdropFilter: 'blur(12px)',
            maxHeight: 'calc(100vh - 8.5rem)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold tracking-[0.2em] text-white/70">X-MUSIC</p>
            <button type="button" onClick={() => setAberto(false)} className="text-white/40 hover:text-white">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <PlayerYT alvo={estacao} ligado={ligado} onErro={aoErrar} onTitulo={aoTocar} />

          {/* 🔎 O BUSCADOR — a resposta definitiva pro link que não toca: em
              vez de alguém adivinhar, a pessoa procura. Tudo que aparece
              aqui toca embutido (o YouTube filtra por videoEmbeddable na
              nossa rota), então não existe resultado que abra tela preta. */}
          <div>
            <div className="flex gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') procurar(); }}
                  placeholder="buscar música no YouTube"
                  className="xeos-cru w-full rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/35 text-[11px] pl-7 pr-2.5 py-2 focus:outline-none focus:border-white/40"
                />
              </div>
              <button
                type="button"
                onClick={procurar}
                disabled={buscando}
                className="xeos-cru shrink-0 rounded-lg bg-white text-[#0A1020] text-[11px] font-bold px-3 disabled:opacity-50"
              >
                {buscando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              </button>
            </div>

            {achados && (
              <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto">
                {achados.length === 0 && (
                  <p className="text-[10px] text-white/35 py-1">Nada encontrado com esse termo.</p>
                )}
                {achados.map((it) => (
                  <div key={it.id} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        // toca na hora; a vaga aberta, se houver, fica com ele
                        const achado = { id: it.id, nome: it.titulo, lista: false, video: it.id, nota: it.canal };
                        if (vagaAlvo) {
                          const dados = { id: it.id, lista: false, video: it.id, titulo: it.titulo };
                          gravarEstacaoDoSlot(vagaAlvo, dados);
                          const novas = estacoes.map((e) => (
                            e.slot === vagaAlvo ? { ...e, ...dados, fila: [dados] } : e
                          ));
                          setEstacoes(novas);
                          setFalhou((f) => ({ ...f, [vagaAlvo]: false }));
                          const vaga = novas.find((e) => e.slot === vagaAlvo);
                          setVagaAlvo(null);
                          trocar(vaga);
                          return;
                        }
                        trocar(achado);
                      }}
                      className="flex-1 min-w-0 text-left rounded-lg bg-white/[0.05] hover:bg-white/10 px-2.5 py-1.5"
                    >
                      <span className="block text-[11px] text-white/85 truncate">{it.titulo}</span>
                      <span className="block text-[9px] text-white/40 truncate">{it.canal}</span>
                    </button>
                    <button
                      type="button"
                      title="salvar direto na minha playlist"
                      onClick={() => {
                        const nova = [...playlist.filter((m) => m.id !== it.id), { id: it.id, nome: it.titulo, lista: false, video: it.id }];
                        setPlaylist(nova);
                        gravarPlaylist(nova);
                        vibrar(VIBRA_TOQUE);
                      }}
                      className="shrink-0 text-white/30 hover:text-amber-200"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* as vagas da casa — cada uma com sua fila; o player pula sozinho
              o que não toca e só pede link quando a fila acaba */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-1.5">estações da casa</p>
            <div className="grid grid-cols-2 gap-1.5">
              {estacoes.map((m) => {
                const procurando = !m.id && !falhou[m.slot];
                const toca = Boolean(m.id) && !falhou[m.slot];
                const pedindo = vagaAlvo === m.slot;
                const noAr = estacao?.slot === m.slot && estacao?.tocando;
                // a segunda linha diz a VERDADE, nesta ordem: o que está no ar
                // agora (título real, vindo do player) > procurando no YouTube
                // > o propósito da vaga > o pedido de link quando nada tocou.
                const legenda = noAr
                  || (procurando ? 'procurando no YouTube…'
                    : toca ? m.nota
                    : 'nada tocou aqui · ponha a sua');
                return (
                  <button
                    key={m.slot}
                    type="button"
                    onClick={() => {
                      if (procurando) return;      // ainda buscando: não faz nada
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
                    <span className={`block text-[9px] truncate ${toca ? 'text-white/45' : procurando ? 'text-white/30' : 'text-amber-200/70'}`}>
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
          {/* 💾 tocando e ainda não é dele? oferece salvar. Vale também pras
              estações da casa: é assim que ele "sente o gostinho" e vai
              formando a coleção dele sem procurar nada. */}
          {ligado && !naPlaylist && estacao?.id && (
            <button
              type="button"
              onClick={favoritar}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-400/15 text-amber-200 text-[11px] font-bold py-2 hover:bg-amber-400/25"
            >
              <Star className="w-3.5 h-3.5" fill="currentColor" />
              <span className="truncate">salvar {estacao?.tocando ? `"${estacao.tocando}"` : 'na minha playlist'}</span>
            </button>
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
              {ligado ? (estacao?.tocando || estacao?.nome || 'tocando') : 'desligado'}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
