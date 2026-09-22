import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Send, Loader2, Network, Inbox, CalendarPlus, LayoutGrid, Check, Wand2 } from 'lucide-react';
import { plataforma } from '@/api/plataformaClient';
import {
  noNovo, raizDe, podeVirarFilho, moverNo, apagarNo, descendentesDe,
  quantosCaemJunto, renomearNo, lugarDoFilho, semearNoMapa,
  caixaDoMapa, ligacaoEntre, noSob, irmaoNovo, arrumarMapa,
} from '@/lib/mapaMental';

/**
 * 🗺️ O MAPA MENTAL do Compromisso.
 *
 * Dono (áudio de 19/09/2026): "criar um mapa mental ali do lado, ligado ao
 * quadro… onde eu esvazio a minha mente e dessa mente transformo em tarefa.
 * Um mapa mental foda. SIMPLES E OBJETIVO."
 *
 * 🔴 "Simples e objetivo" é requisito, não elogio. Por isso aqui NÃO tem:
 * zoom, minimapa, escolha de cor por nó, tipo de linha, exportar PNG. Tem
 * quatro gestos — criar, escrever, arrastar, mandar pro quadro — e nada mais.
 * Cada botão a mais é um segundo a menos esvaziando a cabeça.
 *
 * ✈ 22/09/2026 — O DESTINO DIRETO. A outra metade do mesmo áudio: "quando eu
 * esvazio a mente no mapa mental, eu jogo para o meu quadro, para a minha
 * lista e para a minha jornada." Até agora o ✈ parava nas demandas e o dono
 * tinha que ir até a aba Demandas terminar o serviço — duas telas para um
 * pensamento só. Agora o ✈ pergunta o destino ali mesmo.
 * O botão continua UM: a escolha só aparece DEPOIS do clique, e "só nas
 * demandas" segue em primeiro, que é o gesto de quem só quer largar a ideia.
 *
 * A REGRA NÃO ESTÁ AQUI. Ciclo, órfão e "vira demanda" moram em
 * src/lib/mapaMental.js, em JS puro, com 19 provas no Node. Aqui só se desenha
 * e se arrasta — porque o risco desta peça é a árvore, não o traço.
 */

const LARGURA = 172;
// só a largura do card é fixa. A ALTURA agora é MEDIDA no navegador (`medidas`)
// porque texto longo faz o card crescer — o número fixo de 44 desalinhava toda
// linha e enganava a régua do "não cobrir ninguém".

// Os quatro destinos do ✈, na ordem de quem está esvaziando a cabeça: primeiro
// o que não exige decisão nenhuma. Os três de baixo criam trabalho DE VERDADE
// no servidor (metodo_tarefas / metodo_quadro), pelo mesmo caminho da aba
// Demandas — não existe formato paralelo saindo do mapa.
const DESTINOS = [
  { id: 'demandas', rotulo: 'Só nas demandas', Icone: Inbox, dica: 'decido depois' },
  { id: 'dia', rotulo: 'Minha jornada', Icone: CalendarPlus, dica: 'vira tarefa de hoje' },
  { id: 'quadro', rotulo: 'Meu quadro', Icone: LayoutGrid, dica: 'vira cartão' },
  { id: 'ambos', rotulo: 'Os dois', Icone: Check, dica: 'tarefa + cartão' },
];

const CONFIRMACAO = {
  demandas: 'Mandado para as demandas.',
  dia: 'Entrou na sua jornada de hoje.',
  quadro: 'Foi pro seu quadro.',
  ambos: 'Virou tarefa de hoje e cartão no quadro.',
};

// Não recebe `currentUser`: o dono do mapa sai do CRACHÁ, no servidor. Passar
// o usuário daqui seria oferecer ao navegador um jeito de pedir o mapa alheio.
export default function MapaMental({ onDemandaCriada, semente = null, onSemeado = null }) {
  const [nos, setNos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState('');
  const [recado, setRecado] = useState('');
  const [destinoAberto, setDestinoAberto] = useState(null); // id do nó com o seletor aberto
  const [destacado, setDestacado] = useState(null);           // o nó recém-semeado, para a vista achar
  // 📏 o tamanho REAL de cada card, medido no navegador. Texto longo faz o
  // card crescer, então altura fixa é sempre mentira — e era ela que
  // desalinhava as linhas e enganava a régua do "não cobrir ninguém".
  const [medidas, setMedidas] = useState({});
  // o pai candidato enquanto o dedo está no ar, para a pessoa ver onde vai cair
  const [alvoDoSolto, setAlvoDoSolto] = useState(null);
  const nascendo = useRef(new Set()); // nós criados agora e ainda sem texto
  // 🔴 22/09 — soltar o card disparava um `click` no texto e o card ABRIA PARA
  // EDIÇÃO sozinho, toda vez que alguém arrastava. Este sinal engole esse
  // clique — e só ele: o clique seguinte volta a valer normalmente.
  const acabouDeArrastar = useRef(false);

  // 📏 mede TODOS os cards de uma vez, depois que a tela desenhou.
  //
  // 🔴 A primeira versão media por `ref` em cada card. Como a função do ref é
  // nova a cada render, o React solta e repega o elemento toda vez — e como
  // medir gravava estado, isso virou laço infinito (React #185, a tela morria
  // ao criar o primeiro item). Medir num efeito só, depois do desenho, não tem
  // esse problema.
  //
  // A chave do efeito é id+texto: só isso muda o tamanho de um card. Arrastar
  // muda x/y e NÃO remede — senão o observador seria refeito a cada pixel.
  const chaveDosCards = nos.map((n) => `${n.id}:${n.texto}`).join('|');
  useEffect(() => {
    const tela = telaRef.current;
    if (!tela) return undefined;
    const lerTodos = () => {
      const achadas = {};
      for (const el of tela.querySelectorAll('[data-teste="mapa-no"]')) {
        const id = el.dataset.no;
        if (id) achadas[id] = { largura: Math.round(el.offsetWidth), altura: Math.round(el.offsetHeight) };
      }
      setMedidas((atual) => {
        const ids = Object.keys(achadas);
        const igual = ids.length === Object.keys(atual).length
          && ids.every((i) => atual[i]?.largura === achadas[i].largura && atual[i]?.altura === achadas[i].altura);
        return igual ? atual : achadas;
      });
    };
    lerTodos();
    if (typeof ResizeObserver === 'undefined') return undefined;
    // o card cresce quando o texto quebra em duas linhas; sem o observador a
    // linha ficaria ancorada na altura antiga até o próximo render.
    const obs = new ResizeObserver(lerTodos);
    for (const el of tela.querySelectorAll('[data-teste="mapa-no"]')) obs.observe(el);
    return () => obs.disconnect();
  }, [chaveDosCards]);
  const telaRef = useRef(null);
  const arrasto = useRef(null);
  const salvarTimer = useRef(null);

  // ── carregar ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await plataforma.functions.invoke('meuMapaMental', null, { method: 'GET' });
        if (!vivo) return;
        const guardados = Array.isArray(r?.mapa?.nos) ? r.mapa.nos : [];
        // Primeira vez: nasce com a raiz, senão a tela abre vazia e sem
        // nenhuma pista de por onde começar.
        setNos(guardados.length ? guardados : [noNovo({ texto: 'Minha semana', x: 40, y: 140 })]);
      } catch {
        if (vivo) setErro('Não consegui carregar seu mapa agora.');
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  // ── salvar, sem atropelar ────────────────────────────────────────────────
  // Espera meio segundo depois do último gesto. Sem isto, arrastar um nó
  // dispararia uma gravação por quadro de animação.
  const salvar = useCallback((lista) => {
    clearTimeout(salvarTimer.current);
    salvarTimer.current = setTimeout(async () => {
      setSalvando(true);
      try {
        await plataforma.functions.invoke('meuMapaMental', { nos: lista });
        setErro('');
      } catch {
        // 🔴 Falha ao salvar PRECISA aparecer. Mapa que some sem avisar é pior
        // que mapa que não abre: a pessoa acha que guardou.
        setErro('Não consegui salvar. Sua última alteração pode se perder.');
      } finally {
        setSalvando(false);
      }
    }, 500);
  }, []);

  const mudar = useCallback((lista) => { setNos(lista); salvar(lista); }, [salvar]);

  // 🌱 a demanda que veio da caixa para virar nó ("transformo em mapa mental,
  // PARA ABRIR o mapa mental"). Só depois que o mapa carregou: semear antes
  // penduraria o nó numa raiz que ainda não chegou — e ele nasceria órfão.
  useEffect(() => {
    if (carregando || !String(semente || '').trim()) return;
    const { nos: lista, id, novo } = semearNoMapa(nos, semente);
    if (novo) mudar(lista);
    setDestacado(id);
    setRecado(novo ? 'Está no seu mapa.' : 'Essa já estava no seu mapa.');
    onSemeado?.(id);
    // de propósito só com `semente` e `carregando`: incluir `nos` re-semearia
    // a cada arrasto, e o mapa viraria uma fila de cópias.
  }, [semente, carregando]);

  // o destaque é sinal de "é este aqui", não estado: some junto com o recado.
  useEffect(() => {
    if (!destacado) return undefined;
    const t = setTimeout(() => setDestacado(null), 6000);
    return () => clearTimeout(t);
  }, [destacado]);

  // ── gestos ───────────────────────────────────────────────────────────────
  // `base` existe por causa de um defeito real: Enter renomeava o nó e, na
  // MESMA volta, criava o irmão a partir do `nos` do render — que ainda era o
  // de ANTES da renomeação. O texto recém-digitado sumia. Quem encadeia passa
  // a lista que acabou de sair.
  const criarFilho = (paiId, base = nos) => {
    // 🔴 O lugar sai da régua, não de uma conta aqui. A primeira versão
    // descia pelo número de IRMÃOS — o que funciona para um ramo e empilha
    // cards assim que dois ramos crescem. Apareceu no primeiro print cheio.
    const novo = noNovo({ pai: paiId, ...lugarDoFilho(base, paiId, medidas) });
    nascendo.current.add(novo.id);
    mudar([...base, novo]);
    setEditando(novo.id);
  };

  // ⌨️ Enter cria um IRMÃO, Tab cria um FILHO — o padrão de todo mapa mental,
  // e o que o dono descreveu no áudio: "vou esvaziando a mente, tum, tum, tum".
  // Com a mão no mouse card a card, esse "tum tum tum" não acontece.
  const criarIrmao = (deQuemId, base = nos) => {
    const novo = irmaoNovo(base, deQuemId);
    if (!novo) { criarFilho(deQuemId, base); return; } // a raiz não tem irmão: desce um nível
    nascendo.current.add(novo.id);
    mudar([...base, novo]);
    setEditando(novo.id);
  };

  /** 🧹 arruma tudo numa árvore limpa — o desfazer de meia hora de arrasto. */
  const arrumar = () => {
    const arrumado = arrumarMapa(nos, medidas);
    mudar(arrumado);
    setRecado('Mapa arrumado.');
  };

  // Fecha a edição. Nó recém-criado e deixado em branco é REMOVIDO: senão
  // sobra um card "escrever…" para sempre, que não vira demanda nem some.
  const fecharEdicao = (id, texto) => {
    const limpo = String(texto || '').trim();
    setEditando(null);
    if (!limpo && nascendo.current.has(id)) {
      nascendo.current.delete(id);
      mudar(apagarNo(nos, id));
      return null;
    }
    nascendo.current.delete(id);
    if (!limpo) return null;
    const lista = renomearNo(nos, id, limpo);
    mudar(lista);
    return lista;
  };

  const apagar = (id) => {
    const junto = quantosCaemJunto(nos, id);
    const texto = junto
      ? `Apagar este e mais ${junto} que estão pendurados nele?`
      : 'Apagar este item?';
    if (!window.confirm(texto)) return;
    mudar(apagarNo(nos, id));
  };

  // ✈ manda o nó para a fila de demandas — `xperf_demandas`, a MESMA que o
  // Encontro alimenta e o Painel Corporativo mostra. Não existe fila separada
  // do mapa: o dono decidiu em 21/09 que "esvaziar a mente" desemboca onde ele
  // já olha todo dia.
  //
  // 🔴 O ✈ NÃO SOME DEPOIS DE CLICADO, e é de propósito: o nó continua no mapa
  // porque o mapa é o desenho do pensamento, não uma fila de saída. Por isso o
  // segundo clique é ESPERADO — quem barra a duplicata é o servidor, que
  // responde `jaExistia` em vez de gravar de novo. Aqui só traduzimos isso.
  const mandarProQuadro = async (no, destino = 'demandas') => {
    if (!String(no.texto || '').trim()) return;
    setErro('');
    setDestinoAberto(null);
    try {
      const r = await plataforma.functions.invoke('minhasDemandas', { titulo: no.texto, destino });
      if (r && r.success === false) { setErro('Não consegui mandar para as demandas.'); return; }
      // "já estava na fila" só é o recado inteiro quando NADA mais foi feito.
      // Se o destino era o quadro ou a jornada, a demanda repetida foi até lá
      // — dizer só "já estava lá" faria o dono achar que o clique não pegou.
      setRecado(r?.jaExistia && destino === 'demandas'
        ? 'Essa já estava na fila.'
        : CONFIRMACAO[destino] || CONFIRMACAO.demandas);
      onDemandaCriada?.(no);
    } catch {
      setErro('Não consegui mandar para as demandas.');
    }
  };

  // o recado se apaga sozinho: é confirmação, não aviso que precise de ação.
  useEffect(() => {
    if (!recado) return undefined;
    const t = setTimeout(() => setRecado(''), 2600);
    return () => clearTimeout(t);
  }, [recado]);

  // ── arrastar ─────────────────────────────────────────────────────────────
  // Ouvintes na JANELA, não no nó: soltar fora do card (ou fora da tela)
  // precisa terminar o arrasto. Com ouvinte no próprio nó, o card fica
  // grudado no cursor — já aconteceu no carrossel da home em 19/09.
  //
  // 🔴 22/09/2026 — O ARRASTO PASSOU A RELIGAR, E NÃO SÓ A MOVER.
  // `moverNo` e `podeVirarFilho` existiam, com prova, e a tela NUNCA chamava:
  // arrastar só mudava x/y. Você levava o card para perto de outro pai e a
  // linha continuava apontando para o antigo, atravessando o mapa. Reorganizar
  // o pensamento é metade do que um mapa mental faz — e essa metade não
  // existia. Soltar EM CIMA de outro card agora repende o nó nele; soltar no
  // vazio continua sendo só mudar de lugar.
  const comecarArrasto = (e, no) => {
    e.preventDefault();
    const caixa = telaRef.current?.getBoundingClientRect();
    const rolagem = { x: telaRef.current?.scrollLeft || 0, y: telaRef.current?.scrollTop || 0 };
    arrasto.current = {
      id: no.id,
      dx: e.clientX - (caixa?.left || 0) - rolagem.x - no.x,
      dy: e.clientY - (caixa?.top || 0) - rolagem.y - no.y,
      mexeu: false,
      // o próprio nó e a galhada dele nunca podem ser o novo pai: viraria uma
      // volta fechada, e quem percorre a árvore roda para sempre.
      proibidos: [no.id, ...descendentesDe(nos, no.id).map((d) => d.id)],
      alvo: null,
    };
    const ponto = (ev) => {
      const c = telaRef.current?.getBoundingClientRect();
      return {
        x: ev.clientX - (c?.left || 0) + (telaRef.current?.scrollLeft || 0),
        y: ev.clientY - (c?.top || 0) + (telaRef.current?.scrollTop || 0),
      };
    };
    const mover = (ev) => {
      if (!arrasto.current) return;
      arrasto.current.mexeu = true;
      const p = ponto(ev);
      const x = Math.max(0, p.x - arrasto.current.dx);
      const y = Math.max(0, p.y - arrasto.current.dy);
      setNos((atual) => {
        const lista = atual.map((n) => (n.id === arrasto.current.id ? { ...n, x, y } : n));
        const sob = noSob(lista, p, medidas, arrasto.current.proibidos);
        const idAlvo = sob?.id || null;
        if (arrasto.current.alvo !== idAlvo) { arrasto.current.alvo = idAlvo; setAlvoDoSolto(idAlvo); }
        return lista;
      });
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      const dados = arrasto.current;
      arrasto.current = null;
      setAlvoDoSolto(null);
      if (!dados?.mexeu) return;
      acabouDeArrastar.current = true;
      const podeReligar = dados.alvo && podeVirarFilho(nos, dados.id, dados.alvo).pode;
      setNos((atual) => {
        if (!podeReligar) { salvar(atual); return atual; }
        // 🔒 a regra decide o religar: é ela que tem as provas, não este arquivo.
        const religado = moverNo(atual, dados.id, dados.alvo);
        // e o card ENCAIXA ao lado do novo pai em vez de ficar largado em cima
        // dele — soltar em cima e continuar em cima é o que faz parecer que
        // não pegou.
        const lugar = lugarDoFilho(religado.filter((n) => n.id !== dados.id), dados.alvo, medidas);
        const posto = religado.map((n) => (n.id === dados.id ? { ...n, ...lugar } : n));
        salvar(posto);
        return posto;
      });
      if (podeReligar) setRecado('Rependuramos o item.');
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-16 text-white/50 text-sm gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> abrindo seu mapa…
      </div>
    );
  }

  const raiz = raizDe(nos);
  // o tamanho do MAPA, não o da janela que o mostra — é o que faz as linhas
  // continuarem desenhadas quando ele cresce.
  const caixa = caixaDoMapa(nos, medidas);

  return (
    <div className="space-y-2" data-teste="mapa-mental">
      <div className="flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-nz-verde-menta">
          <Network className="h-3.5 w-3.5" /> Mapa mental
          <span className="font-normal normal-case tracking-normal text-white/40">
            — esvazie a cabeça, depois mande pro quadro
          </span>
        </p>
        <span className="ml-auto flex items-center gap-2">
          {salvando && <span className="text-[10px] text-white/40">salvando…</span>}
          <button
            type="button" onClick={arrumar} disabled={nos.length < 2} data-teste="mapa-arrumar"
            title="põe tudo numa árvore limpa"
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[10.5px] font-bold text-white/60 hover:border-nz-verde-neon/40 hover:text-nz-verde-neon disabled:opacity-30"
          >
            <Wand2 className="h-3 w-3" /> arrumar
          </button>
        </span>
      </div>

      {erro && (
        <p className="rounded-lg border border-nz-fogo/40 bg-nz-fogo/10 px-3 py-2 text-[11px] text-nz-fogo-claro" data-teste="mapa-erro">
          {erro}
        </p>
      )}

      {/* ✈ sem retorno visual é ✈ que a pessoa clica três vezes achando que
          não pegou. O recado some sozinho — é confirmação, não pendência. */}
      {!erro && recado && (
        <p className="rounded-lg border border-nz-verde-neon/40 bg-nz-verde-neon/10 px-3 py-2 text-[11px] text-nz-verde-neon" data-teste="mapa-recado">
          {recado}
        </p>
      )}

      <div
        ref={telaRef}
        className="relative h-[clamp(360px,58vh,620px)] w-full overflow-auto rounded-2xl border border-white/10 bg-nz-noite-3"
        data-teste="mapa-tela"
      >
        {/* 🔴 A CAMADA DO CONTEÚDO (22/09/2026).
            Antes, cards e linhas moravam direto na janela rolável: o SVG era
            `w-full h-full`, do tamanho do que se VÊ, e não do que existe.
            Assim que o mapa passava da área visível as linhas eram cortadas —
            os cards rolavam para dentro da vista SEM LIGAÇÃO NENHUMA, e parecia
            dado perdido. Agora tudo mora numa camada do tamanho do mapa, e é
            ela que rola. */}
        <div className="relative" style={{ width: caixa.largura, height: caixa.altura }} data-teste="mapa-conteudo">
          <svg
            data-teste="mapa-linhas" className="pointer-events-none absolute left-0 top-0"
            width={caixa.largura} height={caixa.altura} aria-hidden="true"
          >
            {nos.filter((n) => n.pai).map((n) => {
              const pai = nos.find((p) => p.id === n.pai);
              const l = ligacaoEntre(pai, n, medidas);
              if (!l) return null;
              return (
                <path
                  key={`l-${n.id}`} d={l.d} fill="none"
                  stroke={alvoDoSolto === pai.id ? 'rgba(63,208,126,0.85)' : 'rgba(63,208,126,0.4)'}
                  strokeWidth="2" strokeLinecap="round"
                />
              );
            })}
          </svg>

          {nos.map((n) => (
          <div
            key={n.id}
            data-teste="mapa-no" data-no={n.id}
            style={{ left: n.x, top: n.y, width: LARGURA }}
            data-destacado={n.id === destacado ? 'sim' : undefined}
            data-alvo={n.id === alvoDoSolto ? 'sim' : undefined}
            className={`absolute rounded-xl border px-2.5 py-1.5 shadow-lg transition-colors ${
              n.id === alvoDoSolto
                ? 'border-nz-verde-neon bg-nz-verde-neon/30 ring-2 ring-nz-verde-neon'
                : n.id === destacado
                  ? 'border-nz-verde-neon bg-nz-verde-neon/25 ring-2 ring-nz-verde-neon/60'
                  : n.id === raiz?.id
                    ? 'border-nz-verde-neon/50 bg-nz-verde-neon/15'
                    : 'border-white/15 bg-white/[0.07] hover:border-nz-verde-neon/40'
            }`}
          >
            <div
              onPointerDown={(e) => comecarArrasto(e, n)}
              className="cursor-grab active:cursor-grabbing"
            >
              {editando === n.id ? (
                <input
                  autoFocus
                  defaultValue={n.texto}
                  onBlur={(e) => fecharEdicao(n.id, e.target.value)}
                  onKeyDown={(e) => {
                    // ⌨️ o "tum, tum, tum" do áudio: Enter põe o próximo item
                    // do mesmo nível, Tab desce um nível, Esc desiste. Sem
                    // isto, esvaziar a cabeça é clicar de card em card.
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const lista = fecharEdicao(n.id, e.currentTarget.value);
                      if (lista) criarIrmao(n.id, lista);
                    } else if (e.key === 'Tab') {
                      e.preventDefault();
                      const lista = fecharEdicao(n.id, e.currentTarget.value);
                      if (lista) criarFilho(n.id, lista);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      fecharEdicao(n.id, nascendo.current.has(n.id) ? '' : n.texto);
                    }
                  }}
                  className="w-full bg-transparent text-[12px] text-white outline-none"
                  data-teste="mapa-input"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (acabouDeArrastar.current) { acabouDeArrastar.current = false; return; }
                    setEditando(n.id);
                  }}
                  /* 🔴 22/09 — era `truncate`: medi uma anotação de 488px de
                     texto aparecendo dentro de 150px. O resto sumia, e o mapa
                     existe justamente para despejar frase, não palavra solta.
                     Agora quebra em linhas e o card cresce junto. */
                  className="block w-full whitespace-normal break-words text-left text-[12px] leading-snug text-white"
                >
                  {n.texto || <span className="text-white/35">escrever…</span>}
                </button>
              )}
            </div>

            <div className="mt-1 flex items-center gap-1">
              <button type="button" onClick={() => criarFilho(n.id)} title="pendurar um item aqui"
                className="rounded p-0.5 text-white/45 hover:bg-white/10 hover:text-nz-verde-neon" data-teste="mapa-filho">
                <Plus className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => setDestinoAberto((a) => (a === n.id ? null : n.id))}
                title="mandar para…" aria-expanded={destinoAberto === n.id}
                className="rounded p-0.5 text-white/45 hover:bg-white/10 hover:text-nz-verde-neon" data-teste="mapa-demanda">
                <Send className="h-3 w-3" />
              </button>
              {n.id !== raiz?.id && (
                <button type="button" onClick={() => apagar(n.id)} title="apagar"
                  className="ml-auto rounded p-0.5 text-white/35 hover:bg-white/10 hover:text-nz-fogo-claro" data-teste="mapa-apagar">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* ✈ o destino, só depois do clique — o botão continua sendo um. */}
            {destinoAberto === n.id && (
              <div
                className="absolute left-0 top-full z-20 mt-1 w-[184px] overflow-hidden rounded-lg border border-white/15 bg-nz-noite-2 shadow-xl"
                data-teste="mapa-destinos"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {DESTINOS.map(({ id, rotulo, Icone, dica }) => (
                  <button
                    key={id} type="button" onClick={() => mandarProQuadro(n, id)} data-destino={id}
                    className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-white/10"
                  >
                    <Icone className="h-3.5 w-3.5 shrink-0 text-nz-verde-neon" />
                    <span className="min-w-0">
                      <span className="block truncate text-[11.5px] font-bold text-white">{rotulo}</span>
                      <span className="block truncate text-[10px] text-white/40">{dica}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          ))}
        </div>
      </div>

      <p className="px-1 text-[10px] leading-relaxed text-white/35">
        Escrevendo: <b className="font-semibold text-white/55">Enter</b> põe o próximo item ·{' '}
        <b className="font-semibold text-white/55">Tab</b> pendura um item embaixo ·{' '}
        <b className="font-semibold text-white/55">Esc</b> desiste
        <br />
        Arraste um item <b className="font-semibold text-white/55">para cima de outro</b> pra repender ·{' '}
        <Send className="inline h-2.5 w-2.5" /> manda pras demandas, pro quadro ou pra jornada
      </p>
    </div>
  );
}

// Exportado só para a banca medir a geometria sem adivinhar número mágico.
// A altura não entra: ela é medida, não constante.
export const MEDIDAS = { LARGURA };
