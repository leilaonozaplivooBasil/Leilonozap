import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Star,
  Trash2,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize,
  Move,
  X,
  Users,
  Mail,
  GitBranch,
  CornerDownRight,
  TriangleAlert,
  Rows3,
  Network as NetworkIcon,
  ImagePlus,
  Unlink,
  RotateCcw,
  Phone,
  AtSign,
  Wallet,
  CalendarDays,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { levelColor as getCareerColor, getLevel } from '@/lib/careerLevels';

/**
 * TreeHierarchy — Árvore da rede (Sistema de Alavancagem)
 *
 * Reescrito em 26/07/2026 (pedido Gabriel: leitura fácil no primeiro impacto,
 * sem bugs, tela maior, poder mexer sem errar).
 *
 * Decisões de UX:
 *   • Dois modos: LISTA (raiz à esquerda, nome e cargo ao lado — legível mesmo
 *     com rede grande) e ORGANOGRAMA (clássico, de cima para baixo).
 *   • Abre mostrando a raiz principal e seus diretos, em zoom confortável —
 *     nada de rede inteira em 40% ilegível.
 *   • Layout calculado (tidy tree): as linhas não saem do lugar ao expandir.
 *   • Zoom (roda/botões) e pan (arrastar o fundo).
 *   • Arrastar uma pessoa sobre outra muda o indicador COM confirmação; soltar
 *     no vazio não altera nada; ciclos são bloqueados.
 */

/* ---------- métricas dos dois layouts ---------- */
const V = { node: 64, slot: 136, level: 158 };         // organograma (vertical)
const H = { card: 250, cardH: 54, row: 72, col: 330 }; // lista (horizontal)
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const OPEN_ZOOM_FLOOR = 0.55; // nunca abre a tela em algo ilegível

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const normalize = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const firstAndLast = (name) => {
  const parts = (name || '').trim().split(' ').filter(Boolean);
  if (parts.length <= 2) return parts.join(' ');
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

export default function TreeHierarchy({
  users,
  onEdit,
  onDelete,
  onPromote,
  onRelink,
  onDetach,
  fullHeight = false,
}) {
  // Modo fica salvo: recarregar dados (editar, promover, mover) não pode
  // jogar o admin de volta para a Lista sem ele pedir.
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('treeViewMode') === 'chart' ? 'chart' : 'list';
    } catch {
      return 'list';
    }
  });
  const [menu, setMenu] = useState(null); // menu do botão direito: { id, x, y }
  const [expanded, setExpanded] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [query, setQuery] = useState('');
  const [drag, setDrag] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [fitRequest, setFitRequest] = useState(0);
  const [didFit, setDidFit] = useState(false);

  const viewportRef = useRef(null);
  const panState = useRef(null);
  const dragState = useRef(null);
  const nodesRef = useRef([]);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const dropRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('treeViewMode', mode); } catch { /* storage indisponível */ }
  }, [mode]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { dropRef.current = dropTarget; }, [dropTarget]);

  /* ------------------------------------------------------------------ */
  /* Hierarquia                                                          */
  /* ------------------------------------------------------------------ */
  const { roots, byId } = useMemo(() => {
    const map = new Map((users || []).map((u) => [u.id, { ...u, children: [] }]));
    const rs = [];
    for (const u of users || []) {
      const node = map.get(u.id);
      const parent = u.referred_by_id ? map.get(u.referred_by_id) : null;
      if (parent && parent.id !== node.id) parent.children.push(node);
      else rs.push(node);
    }
    const sortRec = (n) => {
      n.children.sort((a, b) => b.children.length - a.children.length);
      n.children.forEach(sortRec);
    };
    rs.forEach(sortRec);
    rs.sort((a, b) => b.children.length - a.children.length);
    return { roots: rs, byId: map };
  }, [users]);

  // Primeiro impacto: só a raiz principal aberta (um nível), não a rede inteira
  useEffect(() => {
    if (roots.length && expanded.size === 0) {
      const main = roots.find((r) => r.children.length);
      if (main) setExpanded(new Set([main.id]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots.length]);

  /* ------------------------------------------------------------------ */
  /* Layout                                                              */
  /* ------------------------------------------------------------------ */
  const { nodes, edges, size } = useMemo(() => {
    const outNodes = [];
    const outEdges = [];
    let cursor = 0;
    let maxDepth = 0;

    const walk = (node, depth) => {
      maxDepth = Math.max(maxDepth, depth);
      const isOpen = expanded.has(node.id);
      const kids = isOpen ? node.children : [];
      let main;
      let placedKids = [];

      if (!kids.length) {
        main = cursor;
        cursor += mode === 'chart' ? V.slot : H.row;
      } else {
        placedKids = kids.map((k) => walk(k, depth + 1));
        main = (placedKids[0].main + placedKids[placedKids.length - 1].main) / 2;
      }

      const placedNode =
        mode === 'chart'
          ? { id: node.id, data: node, main, x: main, y: depth * V.level, depth, childCount: node.children.length, isOpen }
          : { id: node.id, data: node, main, x: depth * H.col, y: main, depth, childCount: node.children.length, isOpen };

      placedKids.forEach((child) =>
        outEdges.push({ id: `${node.id}->${child.id}`, from: placedNode, to: child })
      );

      outNodes.push(placedNode);
      return placedNode;
    };

    roots.forEach((r) => {
      walk(r, 0);
      cursor += mode === 'chart' ? V.slot * 0.6 : H.row * 0.5;
    });

    return {
      nodes: outNodes,
      edges: outEdges,
      size:
        mode === 'chart'
          ? { width: Math.max(cursor, V.slot * 3), height: (maxDepth + 1) * V.level + 40 }
          : { width: (maxDepth + 1) * H.col, height: Math.max(cursor, H.row * 3) },
    };
  }, [roots, expanded, mode]);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const matches = useMemo(() => {
    const q = normalize(query).trim();
    if (!q) return new Set();
    return new Set(
      nodes
        .filter((n) => normalize(n.data.full_name).includes(q) || normalize(n.data.email).includes(q))
        .map((n) => n.id)
    );
  }, [nodes, query]);

  /* ------------------------------------------------------------------ */
  /* Zoom / pan                                                          */
  /* ------------------------------------------------------------------ */
  const fitToView = useCallback(
    (opts = {}) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const w = vp.clientWidth - 60;
      const h = vp.clientHeight - 60;
      if (w <= 0 || h <= 0) return;
      const raw = Math.min(w / size.width, h / size.height);
      const floor = opts.allowTiny ? MIN_ZOOM : OPEN_ZOOM_FLOOR;
      const z = Math.min(1, Math.max(floor, raw));
      setZoom(z);

      const fitsX = size.width * z <= vp.clientWidth - 40;
      const fitsY = size.height * z <= vp.clientHeight - 40;
      // Quando não cabe, o enquadramento é feito PELA RAIZ — ela precisa estar
      // sempre visível; centralizar o conteúdo inteiro a jogaria para fora.
      const root = nodesRef.current.find((n) => n.depth === 0) || { x: 0, y: 0 };
      const rootCx = mode === 'chart' ? root.x + V.node / 2 : root.x + H.card / 2;
      const rootCy = mode === 'chart' ? root.y + V.node / 2 : root.y + H.cardH / 2;

      setPan({
        // modo lista lê da esquerda para a direita: a raiz fica sempre encostada
        // à esquerda; o organograma continua centralizado.
        x:
          mode === 'list'
            ? 40 - (root.x || 0) * z
            : fitsX
            ? (vp.clientWidth - size.width * z) / 2
            : vp.clientWidth / 2 - rootCx * z,
        // organograma lê de cima para baixo: raiz sempre encostada no topo
        y:
          mode === 'chart'
            ? 40
            : fitsY
            ? (vp.clientHeight - size.height * z) / 2
            : vp.clientHeight / 2 - rootCy * z,
      });
    },
    [size.width, size.height, mode]
  );

  useEffect(() => {
    if (didFit || !nodes.length) return;
    const t = setTimeout(() => {
      fitToView();
      setDidFit(true);
    }, 60);
    return () => clearTimeout(t);
  }, [didFit, nodes.length, fitToView]);

  useEffect(() => {
    if (!fitRequest) return;
    const t = setTimeout(() => fitToView({ allowTiny: true }), 30);
    return () => clearTimeout(t);
  }, [fitRequest, size.width, size.height, fitToView]);

  // Reenquadra ao trocar de modo ou entrar/sair da tela cheia
  useEffect(() => {
    const t = setTimeout(() => fitToView(), 90);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullHeight, mode]);

  const zoomBy = useCallback((factor, origin) => {
    const z = zoomRef.current;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
    if (next === z) return;
    const p = panRef.current;
    const o = origin || {
      x: (viewportRef.current?.clientWidth || 0) / 2,
      y: (viewportRef.current?.clientHeight || 0) / 2,
    };
    setPan({ x: o.x - ((o.x - p.x) * next) / z, y: o.y - ((o.y - p.y) * next) / z });
    setZoom(next);
  }, []);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const handler = (e) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    vp.addEventListener('wheel', handler, { passive: false });
    return () => vp.removeEventListener('wheel', handler);
  }, [zoomBy]);

  const onBackgroundPointerDown = (e) => {
    setMenu(null);
    if (e.button !== 0) return;
    panState.current = { startX: e.clientX, startY: e.clientY, origin: { ...panRef.current } };
    setIsPanning(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (panState.current) {
      setPan({
        x: panState.current.origin.x + (e.clientX - panState.current.startX),
        y: panState.current.origin.y + (e.clientY - panState.current.startY),
      });
      return;
    }
    if (!dragState.current) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (!dragState.current.moved) {
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      if (Math.hypot(dx, dy) < 5) return;
      dragState.current.moved = true;
    }

    setDrag({ id: dragState.current.id, x: px, y: py });

    // alvo = nó mais próximo dentro de um raio generoso
    const wx = (px - panRef.current.x) / zoomRef.current;
    const wy = (py - panRef.current.y) / zoomRef.current;
    const radius = mode === 'chart' ? V.node : H.cardH;
    let hit = null;
    let best = Infinity;
    for (const n of nodesRef.current) {
      if (n.id === dragState.current.id) continue;
      const cx = mode === 'chart' ? n.x + V.node / 2 : n.x + H.card / 2;
      const cy = mode === 'chart' ? n.y + V.node / 2 : n.y + H.cardH / 2;
      const d = Math.hypot(cx - wx, cy - wy);
      if (d < best) {
        best = d;
        hit = n;
      }
    }
    setDropTarget(best <= radius ? hit.id : null);
  };

  const isDescendant = useCallback(
    (ancestorId, maybeDescendantId) => {
      const stack = [ancestorId];
      const seen = new Set();
      while (stack.length) {
        const cur = stack.pop();
        const node = byId.get(cur);
        for (const c of node?.children || []) {
          if (c.id === maybeDescendantId) return true;
          if (!seen.has(c.id)) {
            seen.add(c.id);
            stack.push(c.id);
          }
        }
      }
      return false;
    },
    [byId]
  );

  const onPointerUp = () => {
    if (panState.current) {
      panState.current = null;
      setIsPanning(false);
    }
    const state = dragState.current;
    const target = dropRef.current;
    dragState.current = null;
    setDrag(null);
    setDropTarget(null);

    if (!state?.moved) return;                 // foi clique, não arraste
    if (!target || target === state.id) return; // solto no vazio: nada muda

    const moved = byId.get(state.id);
    const parent = byId.get(target);
    if (!moved || !parent) return;
    if (moved.referred_by_id === target) return;

    if (isDescendant(state.id, target)) {
      toast.error(`Não dá para mover ${moved.full_name} para baixo de um indicado dele.`);
      return;
    }
    setPendingMove({ moved, parent });
  };

  const confirmMove = async () => {
    if (!pendingMove) return;
    const { moved, parent } = pendingMove;
    setIsMoving(true);
    try {
      await onRelink?.(moved.id, parent.id, true);
      setExpanded((prev) => new Set(prev).add(parent.id));
      toast.success(`${moved.full_name} agora está abaixo de ${parent.full_name}`);
      setPendingMove(null);
    } catch (err) {
      toast.error('Erro ao mover: ' + (err?.message || 'falha'));
    } finally {
      setIsMoving(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Expandir / recolher / focar                                         */
  /* ------------------------------------------------------------------ */
  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expandAll = () => {
    const all = new Set();
    const walk = (n) => {
      if (n.children.length) all.add(n.id);
      n.children.forEach(walk);
    };
    roots.forEach(walk);
    setExpanded(all);
    setFitRequest((v) => v + 1);
  };

  const collapseAll = () => {
    const main = roots.find((r) => r.children.length);
    setExpanded(main ? new Set([main.id]) : new Set());
    setFitRequest((v) => v + 1);
  };

  const focusUser = (id) => {
    const path = [];
    let cur = byId.get(id);
    while (cur?.referred_by_id) {
      path.push(cur.referred_by_id);
      cur = byId.get(cur.referred_by_id);
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      path.forEach((p) => next.add(p));
      return next;
    });
    setSelectedId(null); // fecha o perfil aberto para a árvore ficar visível
    setTimeout(() => {
      const node = nodesRef.current.find((n) => n.id === id);
      const vp = viewportRef.current;
      if (!node || !vp) return;
      const z = zoomRef.current;
      const cx = mode === 'chart' ? node.x + V.node / 2 : node.x + H.card / 2;
      const cy = mode === 'chart' ? node.y + V.node / 2 : node.y + H.cardH / 2;
      setPan({ x: vp.clientWidth / 2 - cx * z, y: vp.clientHeight / 2 - cy * z });
    }, 130);
  };

  const selected = selectedId ? byId.get(selectedId) : null;
  const selectedParent = selected?.referred_by_id ? byId.get(selected.referred_by_id) : null;
  const selectedLevel = selected ? getLevel(selected.primary_career_level || 'usuario') : null;

  if (!roots.length) {
    return (
      <div className="w-full p-8 bg-gray-900 rounded-lg text-center text-gray-400">
        Nenhum usuário encontrado na hierarquia.
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  const renderEdge = (e) => {
    if (mode === 'chart') {
      const x1 = e.from.x + V.node / 2;
      const y1 = e.from.y + V.node;
      const x2 = e.to.x + V.node / 2;
      const y2 = e.to.y;
      const mid = (y1 + y2) / 2;
      return (
        <path
          key={e.id}
          d={`M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`}
          fill="none"
          stroke="rgba(148,163,184,0.5)"
          strokeWidth="2"
        />
      );
    }
    const x1 = e.from.x + H.card;
    const y1 = e.from.y + H.cardH / 2;
    const x2 = e.to.x;
    const y2 = e.to.y + H.cardH / 2;
    const mid = (x1 + x2) / 2;
    return (
      <path
        key={e.id}
        d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke="rgba(148,163,184,0.5)"
        strokeWidth="2"
      />
    );
  };

  return (
    <div className={`relative w-full bg-gray-950 ${fullHeight ? 'h-full' : 'rounded-b-lg'}`}>
      {/* -------- Barra de ferramentas -------- */}
      <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b border-gray-800 bg-gray-900/80">
        <div className="flex items-center rounded-lg border border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setMode('list')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] transition-colors ${
              mode === 'list'
                ? 'bg-emerald-600/20 text-emerald-300'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            title="Lista hierárquica — nome e cargo ao lado (mais legível)"
          >
            <Rows3 className="w-3.5 h-3.5" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setMode('chart')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] transition-colors border-l border-gray-700 ${
              mode === 'chart'
                ? 'bg-emerald-600/20 text-emerald-300'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            title="Organograma — visão de cima para baixo"
          >
            <NetworkIcon className="w-3.5 h-3.5" />
            Organograma
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches.size) focusUser([...matches][0]);
            }}
            placeholder="Buscar pessoa na rede…"
            className="w-52 bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-[12.5px] text-white placeholder:text-gray-600 outline-none focus:border-emerald-500/50"
          />
        </div>
        {query && (
          <span className="text-[11px] text-gray-500">
            {matches.size === 1 ? '1 resultado' : `${matches.size} resultados`}
            {matches.size > 0 && ' — Enter centraliza'}
          </span>
        )}

        <div className="flex-1" />

        <span className="hidden 2xl:flex items-center gap-1.5 text-[11px] text-gray-600 mr-1">
          <Move className="w-3 h-3" />
          arraste o fundo para mover · roda dá zoom · arraste uma pessoa sobre outra para vincular
        </span>

        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => zoomBy(1 / 1.2)}
            className="h-7 w-7 p-0 border-gray-700 text-gray-300 hover:bg-gray-800" title="Diminuir zoom">
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px] text-gray-500 w-10 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button size="sm" variant="outline" onClick={() => zoomBy(1.2)}
            className="h-7 w-7 p-0 border-gray-700 text-gray-300 hover:bg-gray-800" title="Aumentar zoom">
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => fitToView({ allowTiny: true })}
            className="h-7 px-2 border-gray-700 text-gray-300 hover:bg-gray-800 text-[11px]" title="Ver a rede inteira">
            <Maximize className="w-3.5 h-3.5 mr-1" />
            Ver tudo
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={expandAll}
            className="h-7 px-2 text-[11px] border-emerald-700 text-emerald-400 hover:bg-emerald-600/15">
            Expandir todos
          </Button>
          <Button size="sm" variant="outline" onClick={collapseAll}
            className="h-7 px-2 text-[11px] border-gray-700 text-gray-400 hover:bg-gray-800">
            Recolher
          </Button>
        </div>
      </div>

      {/* -------- Área da árvore -------- */}
      <div
        ref={viewportRef}
        className={`relative overflow-hidden select-none touch-none ${
          fullHeight ? 'h-[calc(100%-46px)]' : 'h-[58vh] min-h-[420px]'
        }`}
        style={{
          cursor: isPanning ? 'grabbing' : 'grab',
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '26px 26px',
        }}
        onPointerDown={onBackgroundPointerDown}
        onContextMenu={(e) => e.preventDefault()}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: size.width,
            height: size.height,
            transition: isPanning || drag ? 'none' : 'transform 180ms ease-out',
          }}
        >
          <svg
            className="absolute inset-0 pointer-events-none overflow-visible"
            width={size.width}
            height={size.height}
          >
            {edges.map(renderEdge)}
          </svg>

          {nodes.map((n) => {
            const level = getLevel(n.data.primary_career_level || 'usuario');
            const isSelected = selectedId === n.id;
            const isMatch = matches.has(n.id);
            const isTarget = dropTarget === n.id;
            const isDragging = drag?.id === n.id;

            const pointerProps = {
              onPointerDown: (e) => {
                if (e.button === 2) return; // botão direito abre o menu, não arrasta
                e.stopPropagation();
                dragState.current = { id: n.id, moved: false, startX: e.clientX, startY: e.clientY };
                viewportRef.current?.setPointerCapture?.(e.pointerId);
              },
              onClick: (e) => {
                e.stopPropagation();
                setSelectedId(n.id);
              },
              onDoubleClick: (e) => {
                e.stopPropagation();
                if (n.childCount) toggle(n.id);
              },
              // Botão direito: menu de ações direto no nó
              onContextMenu: (e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = viewportRef.current.getBoundingClientRect();
                setSelectedId(n.id);
                setMenu({ id: n.id, x: e.clientX - rect.left, y: e.clientY - rect.top });
              },
            };

            const expandButton =
              n.childCount > 0 ? (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(n.id);
                  }}
                  className={
                    mode === 'list'
                      ? `flex items-center gap-0.5 h-6 px-1.5 rounded-md text-[10.5px] font-bold border flex-shrink-0 transition-colors ${
                          n.isOpen
                            ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                            : 'bg-emerald-600 border-emerald-400 text-white hover:bg-emerald-500'
                        }`
                      : `absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 h-5 rounded-full text-[10px] font-bold border transition-colors ${
                          n.isOpen
                            ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                            : 'bg-emerald-600 border-emerald-400 text-white hover:bg-emerald-500'
                        }`
                  }
                  title={n.isOpen ? 'Recolher indicados' : `Ver ${n.childCount} indicados`}
                >
                  {n.isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {(mode === 'list' || !n.isOpen) && n.childCount}
                </button>
              ) : null;

            /* ---------- modo LISTA ---------- */
            if (mode === 'list') {
              return (
                <div key={n.id} className="absolute" style={{ left: n.x, top: n.y, width: H.card }}>
                  <div
                    {...pointerProps}
                    role="button"
                    tabIndex={0}
                    title={n.data.email}
                    className={`group flex items-center gap-2 rounded-xl border pl-2.5 pr-1.5 h-[54px] cursor-grab active:cursor-grabbing
                      transition-colors bg-gray-900
                      ${
                        isTarget
                          ? 'border-emerald-400 ring-4 ring-emerald-500/25'
                          : isSelected
                          ? 'border-white/70 ring-2 ring-white/20'
                          : 'border-gray-700 hover:border-gray-500'
                      }
                      ${isMatch ? 'ring-4 ring-amber-400/60' : ''}
                      ${isDragging ? 'opacity-40' : ''}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full ${getCareerColor(
                        n.data.primary_career_level || 'usuario'
                      )} flex items-center justify-center text-white text-[11px] font-bold overflow-hidden flex-shrink-0`}
                    >
                      {n.data.avatar_url ? (
                        <img
                          src={n.data.avatar_url}
                          alt=""
                          className="w-full h-full object-cover pointer-events-none"
                          draggable={false}
                        />
                      ) : (
                        getInitials(n.data.full_name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-white truncate leading-tight">
                        {firstAndLast(n.data.full_name)}
                      </p>
                      <p className={`text-[10.5px] ${level.textColor} truncate leading-tight`}>
                        {level.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(n.data);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded-md text-blue-400 hover:bg-blue-500/15"
                      title="Editar dados desta pessoa"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {expandButton}
                  </div>
                </div>
              );
            }

            /* ---------- modo ORGANOGRAMA ---------- */
            return (
              <div key={n.id} className="absolute group/node" style={{ left: n.x, top: n.y, width: V.node }}>
                <div
                  {...pointerProps}
                  role="button"
                  tabIndex={0}
                  title={`${n.data.full_name} — ${level.name}`}
                  className={`relative rounded-full ${getCareerColor(
                    n.data.primary_career_level || 'usuario'
                  )} flex items-center justify-center text-white font-bold text-[13px]
                    overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-shadow
                    ${
                      isTarget
                        ? 'border-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.3)]'
                        : isSelected
                        ? 'border-white shadow-[0_0_0_4px_rgba(255,255,255,0.2)]'
                        : 'border-white/25'
                    }
                    ${isMatch ? 'ring-4 ring-amber-400/70' : ''}
                    ${isDragging ? 'opacity-40' : ''}`}
                  style={{ width: V.node, height: V.node }}
                >
                  {n.data.avatar_url ? (
                    <img
                      src={n.data.avatar_url}
                      alt=""
                      className="w-full h-full object-cover pointer-events-none"
                      draggable={false}
                    />
                  ) : (
                    getInitials(n.data.full_name)
                  )}
                </div>

                {expandButton}

                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(n.data);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gray-900 border border-blue-500/50 text-blue-400
                    flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 group-hover/node:opacity-100 transition-opacity"
                  title="Editar dados desta pessoa"
                >
                  <Pencil className="w-3 h-3" />
                </button>

                <div className="absolute top-full mt-3.5 left-1/2 -translate-x-1/2 w-[128px] text-center pointer-events-none">
                  <p className="text-[11.5px] font-medium text-gray-200 truncate leading-tight">
                    {firstAndLast(n.data.full_name)}
                  </p>
                  <p className={`text-[10px] ${level.textColor} truncate leading-tight`}>{level.name}</p>
                </div>
              </div>
            );
          })}
        </div>

        {drag && (
          <>
            <div
              className="absolute pointer-events-none z-30 rounded-full bg-emerald-500/85 border-2 border-emerald-300 flex items-center justify-center text-white text-[11px] font-bold"
              style={{ left: drag.x - 22, top: drag.y - 22, width: 44, height: 44 }}
            >
              {getInitials(byId.get(drag.id)?.full_name)}
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-lg bg-gray-900/95 border border-emerald-500/40 text-[11.5px] text-emerald-300 flex items-center gap-2">
              <CornerDownRight className="w-3.5 h-3.5" />
              {dropTarget
                ? `Soltar sobre ${byId.get(dropTarget)?.full_name}`
                : 'Solte sobre quem passa a ser o indicador (no vazio, nada muda)'}
            </div>
          </>
        )}
      </div>

      {/* -------- Menu do botão direito -------- */}
      {menu && (() => {
        const target = byId.get(menu.id);
        if (!target) return null;
        const isTrashed = target.active === false;
        const item = 'w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-left transition-colors';
        return (
          <>
            <div className="absolute inset-0 z-40" onPointerDown={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
            <div
              className="absolute z-50 w-56 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden py-1"
              style={{ left: Math.min(menu.x, (viewportRef.current?.clientWidth || 600) - 240), top: Math.min(menu.y, (viewportRef.current?.clientHeight || 400) - 260) }}
            >
              <div className="px-3 py-1.5 border-b border-gray-800 mb-1">
                <p className="text-[12px] font-semibold text-white truncate">{target.full_name}</p>
                <p className="text-[10.5px] text-gray-500 truncate">{target.email}</p>
              </div>

              <button type="button" className={`${item} text-blue-300 hover:bg-blue-500/15`}
                onClick={() => { setMenu(null); onEdit?.(target); }}>
                <Pencil className="w-3.5 h-3.5" />
                Editar dados
              </button>
              <button type="button" className={`${item} text-blue-300 hover:bg-blue-500/15`}
                onClick={() => { setMenu(null); onEdit?.(target); }}>
                <ImagePlus className="w-3.5 h-3.5" />
                Anexar foto (arquivo ou URL)
              </button>
              <button type="button" className={`${item} text-emerald-300 hover:bg-emerald-500/15`}
                onClick={() => { setMenu(null); onPromote?.(target); }}>
                <Star className="w-3.5 h-3.5" />
                Promover / mudar cargo
              </button>

              {target.children.length > 0 && (
                <button type="button" className={`${item} text-gray-300 hover:bg-white/5`}
                  onClick={() => { setMenu(null); toggle(target.id); }}>
                  {expanded.has(target.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  {expanded.has(target.id) ? 'Recolher indicados' : `Ver ${target.children.length} indicados`}
                </button>
              )}

              {target.referred_by_id && onDetach && (
                <button type="button" className={`${item} text-amber-300 hover:bg-amber-500/15`}
                  onClick={() => { setMenu(null); onDetach(target); }}>
                  <Unlink className="w-3.5 h-3.5" />
                  Soltar da rede (virar raiz)
                </button>
              )}

              <div className="my-1 border-t border-gray-800" />

              <button type="button" className={`${item} ${isTrashed ? 'text-emerald-300 hover:bg-emerald-500/15' : 'text-red-400 hover:bg-red-500/15'}`}
                onClick={() => { setMenu(null); onDelete?.(target); }}>
                {isTrashed ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                {isTrashed ? 'Restaurar da lixeira' : 'Excluir (vai para a lixeira)'}
              </button>
            </div>
          </>
        );
      })()}

      {/* -------- Perfil expandido: modal no centro da tela (clique no nó) -------- */}
      {selected && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setSelectedId(null)}
        >
          {/* Desktop: card 16:9 (como abrir um produto na loja). Mobile: altura livre. */}
          <div
            className="w-full max-w-5xl rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden
              max-h-[88vh] md:aspect-video md:max-h-[86vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* capa */}
            <div className="relative flex-shrink-0">
              <div className={`h-20 md:h-24 ${getCareerColor(selected.primary_career_level || 'usuario')} opacity-25`} />
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 text-gray-300 hover:text-white hover:bg-black/70"
                aria-label="Fechar perfil"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-6 -mt-12 overflow-y-auto flex-1 min-h-0">
              {/* identidade + ações */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div
                  className={`w-24 h-24 rounded-2xl ${getCareerColor(
                    selected.primary_career_level || 'usuario'
                  )} flex items-center justify-center text-white text-2xl font-bold overflow-hidden border-4 border-gray-900 flex-shrink-0`}
                >
                  {selected.avatar_url ? (
                    <img src={selected.avatar_url} alt={selected.full_name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(selected.full_name)
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-white leading-tight truncate">{selected.full_name}</h2>
                  <p className={`text-[13px] font-semibold ${selectedLevel.textColor}`}>{selectedLevel.name}</p>
                  {selected.active === false && (
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">
                      na lixeira
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => onEdit?.(selected)}
                    className="h-9 text-[12px] border-blue-600/50 text-blue-300 hover:bg-blue-500/15">
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onEdit?.(selected)}
                    className="h-9 text-[12px] border-sky-600/50 text-sky-300 hover:bg-sky-500/15">
                    <ImagePlus className="w-3.5 h-3.5 mr-1.5" />
                    Foto
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onPromote?.(selected)}
                    className="h-9 text-[12px] border-emerald-600/50 text-emerald-300 hover:bg-emerald-500/15">
                    <Star className="w-3.5 h-3.5 mr-1.5" />
                    Promover
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDelete?.(selected)}
                    className={`h-9 text-[12px] ${
                      selected.active === false
                        ? 'border-emerald-600/50 text-emerald-300 hover:bg-emerald-500/15'
                        : 'border-red-600/50 text-red-300 hover:bg-red-500/15'
                    }`}>
                    {selected.active === false
                      ? <><RotateCcw className="w-3.5 h-3.5 mr-1.5" />Restaurar</>
                      : <><Trash2 className="w-3.5 h-3.5 mr-1.5" />Excluir</>}
                  </Button>
                </div>
              </div>

              {/* conteúdo em duas colunas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                {/* coluna 1 — dados */}
                <div className="space-y-3">
                  <p className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold">Dados do cadastro</p>
                  <Field icon={Mail} label="E-mail" value={selected.email} />
                  {selected.phone && <Field icon={Phone} label="Telefone" value={selected.phone} />}
                  {selected.nickname && <Field icon={AtSign} label="Apelido nos lances" value={selected.nickname} />}
                  {selected.referral_code && (
                    <Field icon={LinkIcon} label="Código de indicação" value={selected.referral_code} />
                  )}
                  <Field
                    icon={Wallet}
                    label="Saldo"
                    value={`R$ ${Number(selected.valora_pay_balance || selected.saldo_disponivel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  />
                  {selected.created_date && (
                    <Field
                      icon={CalendarDays}
                      label="Cadastro"
                      value={new Date(selected.created_date).toLocaleDateString('pt-BR')}
                    />
                  )}
                </div>

                {/* coluna 2 — posição na rede + plano */}
                <div className="space-y-3">
                  <p className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold">Posição na rede</p>
                  <Field icon={Users} label="Indicados diretos" value={`${selected.children.length} pessoa(s)`} />
                  <Field
                    icon={GitBranch}
                    label="Indicado por"
                    value={selectedParent ? selectedParent.full_name : 'Raiz da rede — sem indicador'}
                  />

                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-900/12 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold mb-1">
                      No plano de alavancagem
                    </p>
                    <p className="text-[12px] text-gray-200 leading-relaxed">
                      <strong className={selectedLevel.textColor}>{selectedLevel.name}</strong>
                      {selectedLevel.venda_direta_pct > 0 && (
                        <> — {selectedLevel.venda_direta_pct}% de venda direta</>
                      )}
                    </p>
                    {selectedLevel.regra && (
                      <p className="text-[11px] text-gray-400 leading-snug mt-1">{selectedLevel.regra}</p>
                    )}
                    <p className="text-[11px] text-gray-500 leading-snug mt-1.5">
                      A posição na árvore define a cadeia de rebate: mover esta pessoa muda quem
                      recebe sobre a equipe dela.
                    </p>
                  </div>

                  {Array.isArray(selected.career_levels) && selected.career_levels.length > 1 && (
                    <div>
                      <p className="text-[10.5px] uppercase tracking-wider text-gray-500 mb-1.5">Todos os cargos</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.career_levels.map((id) => {
                          const l = getLevel(id);
                          return (
                            <span key={id} className={`text-[10.5px] px-2 py-0.5 rounded ${l.color} text-white`}>
                              {l.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* equipe direta */}
              {selected.children.length > 0 && (
                <div className="mt-6">
                  <p className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                    Equipe direta ({selected.children.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {selected.children.map((c) => {
                      const l = getLevel(c.primary_career_level || 'usuario');
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => focusUser(c.id)}
                          className="flex items-center gap-2 rounded-lg border border-gray-700/70 px-2 py-1.5 hover:bg-white/5 hover:border-gray-600 text-left"
                          title="Abrir esta pessoa na árvore"
                        >
                          <span className={`w-7 h-7 rounded-full ${l.color} flex items-center justify-center text-white text-[9.5px] font-bold overflow-hidden flex-shrink-0`}>
                            {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : getInitials(c.full_name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] text-gray-200 truncate">{c.full_name}</span>
                            <span className={`block text-[10px] ${l.textColor} truncate`}>{l.name}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------- Confirmação de mudança de vínculo -------- */}
      {pendingMove && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-emerald-500/30 bg-gray-900 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
              <TriangleAlert className="w-4 h-4 text-amber-400" />
              <span className="text-[13px] font-semibold text-white">Confirmar mudança na rede</span>
            </div>
            <div className="px-4 py-4 text-[13px] text-gray-300 space-y-2">
              <p>
                Mover <strong className="text-white">{pendingMove.moved.full_name}</strong> para baixo de{' '}
                <strong className="text-emerald-400">{pendingMove.parent.full_name}</strong>?
              </p>
              <p className="text-[11.5px] text-gray-500">
                Toda a equipe abaixo dessa pessoa vai junto. Você pode desfazer arrastando de volta.
              </p>
              <p className="text-[11.5px] text-emerald-400/90">
                No plano de alavancagem, a partir de agora o rebate dessa perna passa a subir por{' '}
                <strong>{pendingMove.parent.full_name}</strong>.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-800">
              <Button size="sm" variant="outline" disabled={isMoving}
                onClick={() => setPendingMove(null)}
                className="h-8 text-[12px] border-gray-700 text-gray-300 hover:bg-gray-800">
                Cancelar
              </Button>
              <Button size="sm" disabled={isMoving} onClick={confirmMove}
                className="h-8 text-[12px] bg-emerald-600 hover:bg-emerald-500">
                {isMoving ? 'Movendo…' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Linha de informação do perfil expandido */
function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-gray-600 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 leading-tight">{label}</p>
        <p className="text-[12px] text-gray-200 break-words">{value}</p>
      </div>
    </div>
  );
}
