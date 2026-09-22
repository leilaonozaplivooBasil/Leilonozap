import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Send, Loader2, Network, Inbox, CalendarPlus, LayoutGrid, Check } from 'lucide-react';
import { plataforma } from '@/api/plataformaClient';
import {
  noNovo, raizDe, podeVirarFilho, moverNo, apagarNo,
  quantosCaemJunto, renomearNo, lugarDoFilho,
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
const ALTURA = 44;

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
export default function MapaMental({ onDemandaCriada }) {
  const [nos, setNos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState('');
  const [recado, setRecado] = useState('');
  const [destinoAberto, setDestinoAberto] = useState(null); // id do nó com o seletor aberto
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

  // ── gestos ───────────────────────────────────────────────────────────────
  const criarFilho = (paiId) => {
    // 🔴 O lugar sai da régua, não de uma conta aqui. A primeira versão
    // descia pelo número de IRMÃOS — o que funciona para um ramo e empilha
    // cards assim que dois ramos crescem. Apareceu no primeiro print cheio.
    const novo = noNovo({ pai: paiId, ...lugarDoFilho(nos, paiId) });
    mudar([...nos, novo]);
    setEditando(novo.id);
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
  const comecarArrasto = (e, no) => {
    e.preventDefault();
    const caixa = telaRef.current?.getBoundingClientRect();
    arrasto.current = {
      id: no.id,
      dx: e.clientX - (caixa?.left || 0) - no.x,
      dy: e.clientY - (caixa?.top || 0) - no.y,
      mexeu: false,
    };
    const mover = (ev) => {
      if (!arrasto.current) return;
      arrasto.current.mexeu = true;
      const c = telaRef.current?.getBoundingClientRect();
      const x = Math.max(0, ev.clientX - (c?.left || 0) - arrasto.current.dx);
      const y = Math.max(0, ev.clientY - (c?.top || 0) - arrasto.current.dy);
      setNos((atual) => atual.map((n) => (n.id === arrasto.current.id ? { ...n, x, y } : n)));
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      if (arrasto.current?.mexeu) setNos((atual) => { salvar(atual); return atual; });
      arrasto.current = null;
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

  return (
    <div className="space-y-2" data-teste="mapa-mental">
      <div className="flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-nz-verde-menta">
          <Network className="h-3.5 w-3.5" /> Mapa mental
          <span className="font-normal normal-case tracking-normal text-white/40">
            — esvazie a cabeça, depois mande pro quadro
          </span>
        </p>
        {salvando && <span className="text-[10px] text-white/40">salvando…</span>}
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
        className="relative h-[420px] w-full overflow-auto rounded-2xl border border-white/10 bg-nz-noite-3"
        data-teste="mapa-tela"
      >
        {/* As linhas ligando pai e filho. SVG por baixo, sem receber clique. */}
        <svg data-teste="mapa-linhas" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {nos.filter((n) => n.pai).map((n) => {
            const pai = nos.find((p) => p.id === n.pai);
            if (!pai) return null;
            return (
              <line
                key={`l-${n.id}`}
                x1={pai.x + LARGURA} y1={pai.y + ALTURA / 2}
                x2={n.x} y2={n.y + ALTURA / 2}
                stroke="rgba(63,208,126,0.35)" strokeWidth="2"
              />
            );
          })}
        </svg>

        {nos.map((n) => (
          <div
            key={n.id}
            data-teste="mapa-no"
            style={{ left: n.x, top: n.y, width: LARGURA }}
            className={`absolute rounded-xl border px-2.5 py-1.5 shadow-lg transition-colors ${
              n.id === raiz?.id
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
                  onBlur={(e) => { mudar(renomearNo(nos, n.id, e.target.value)); setEditando(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  className="w-full bg-transparent text-[12px] text-white outline-none"
                  data-teste="mapa-input"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditando(n.id)}
                  className="block w-full truncate text-left text-[12px] text-white"
                  title={n.texto}
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

      <p className="px-1 text-[10px] text-white/35">
        Toque no texto pra escrever · <Plus className="inline h-2.5 w-2.5" /> pendura um item ·{' '}
        <Send className="inline h-2.5 w-2.5" /> manda pras demandas, pro quadro ou pra jornada · arraste pra organizar
      </p>
    </div>
  );
}

// Exportado só para a banca medir a geometria sem adivinhar número mágico.
export const MEDIDAS = { LARGURA, ALTURA };
// `podeVirarFilho` e `moverNo` entram quando o arrasto passar a RELIGAR nós
// (hoje ele só move a posição). A regra já está pronta e provada.
export { podeVirarFilho, moverNo };
