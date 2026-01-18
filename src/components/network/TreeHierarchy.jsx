import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const getCareerColor = (level) => {
  const colors = {
    usuario: 'bg-slate-500',
    licenciado_aplicativo: 'bg-amber-500',
    licenciado_catalogo: 'bg-blue-500',
    influencer: 'bg-pink-500',
    trainee: 'bg-purple-500',
    executivo: 'bg-indigo-500',
    kit_start: 'bg-emerald-500',
    plano_lider: 'bg-red-500',
    plano_lojista: 'bg-cyan-500',
    distribuidor: 'bg-orange-500',
    diretor: 'bg-fuchsia-500',
    diretoria: 'bg-violet-500',
  };
  return colors[level] || 'bg-slate-500';
};

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(' ').filter(p => p);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function TreeHierarchy({ users, onEdit, onDelete, onPromote }) {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const nodePositions = useRef({});
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const toggleNode = (userId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedNodes(newExpanded);
  };

  const getHierarchy = () => {
    const usersMap = new Map(users.map(u => [u.id, { ...u, children: [] }]));
    const roots = [];

    for (const user of users) {
      if (!user.referred_by_id) {
        roots.push(usersMap.get(user.id));
      } else {
        const parent = usersMap.get(user.referred_by_id);
        if (parent) {
          parent.children.push(usersMap.get(user.id));
        } else {
          roots.push(usersMap.get(user.id));
        }
      }
    }

    roots.sort((a, b) => b.children.length - a.children.length);
    return roots;
  };

  const drawSVGConnections = () => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    // Garante stroke visível e não escalonado
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `line { vector-effect: non-scaling-stroke; }`;
    defs.appendChild(style);
    svg.appendChild(defs);

    // Definir dimensões do SVG
    const containerRect = containerRef.current.getBoundingClientRect();
    const container = containerRef.current;
    svg.setAttribute('width', container.scrollWidth);
    svg.setAttribute('height', container.scrollHeight);

    // Buscar nós raiz a partir da hierarquia calculada
    const roots = getHierarchy();

    // Desenhar conexões para cada raiz
    roots.forEach(root => {
      const rootPos = nodePositions.current[root.id];
      if (!rootPos || !root.children || root.children.length === 0) return;

      // Encontrar posições de todos os filhos diretos
      const childPositions = root.children
        .map((child, idx) => ({ pos: nodePositions.current[child.id], child }))
        .filter(item => item.pos !== undefined);

      if (childPositions.length === 0) return;

      // Ordenar filhos por posição X (esquerda para direita)
      childPositions.sort((a, b) => a.pos.x - b.pos.x);

      const minX = childPositions[0].pos.x;
      const maxX = childPositions[childPositions.length - 1].pos.x;
      const firstChildY = childPositions[0].pos.y;

      // Conexões no estilo do exemplo: diagonal pontilhada do topo até um "cotovelo" acima do filho e descida vertical
      childPositions.forEach(({ pos: cpos }) => {
        const rootBottomY = rootPos.y + 40;        // base do nó raiz
        const childTopY = cpos.y - 40;             // topo do nó filho
        const elbowY = rootBottomY + Math.min(160, Math.max(80, (childTopY - rootBottomY) * 0.6));

        // Caminho: raiz -> (x do filho, elbowY) -> (x do filho, topo do filho)
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${rootPos.x} ${rootBottomY} L ${cpos.x} ${elbowY} L ${cpos.x} ${childTopY}`;
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#cbd5e1');
        path.setAttribute('stroke-width', '4');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-dasharray', '10 8');
        svg.appendChild(path);
      });

      // 3. Linhas verticais dos filhos aos seus netos
      childPositions.forEach(({ pos: childPos, child }) => {
        if (!child.children || child.children.length === 0) return;

        const grandchildPositions = child.children
          .map(gc => nodePositions.current[gc.id])
          .filter(pos => pos !== undefined);

        if (grandchildPositions.length === 0) return;

        grandchildPositions.sort((a, b) => a.x - b.x);

        const minGX = grandchildPositions[0].x;
        const maxGX = grandchildPositions[grandchildPositions.length - 1].x;
        const firstGrandchildY = grandchildPositions[0].y;

        // Conexões dos netos seguem padrão simples (linhas sólidas)
        const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vLine.setAttribute('x1', childPos.x);
        vLine.setAttribute('y1', childPos.y + 40);
        vLine.setAttribute('x2', childPos.x);
        vLine.setAttribute('y2', firstGrandchildY - 50);
        vLine.setAttribute('stroke', '#475569');
        vLine.setAttribute('stroke-width', '2');
        vLine.setAttribute('stroke-linecap', 'round');
        svg.appendChild(vLine);

        const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hLine.setAttribute('x1', minGX);
        hLine.setAttribute('y1', firstGrandchildY - 50);
        hLine.setAttribute('x2', maxGX);
        hLine.setAttribute('y2', firstGrandchildY - 50);
        hLine.setAttribute('stroke', '#475569');
        hLine.setAttribute('stroke-width', '2');
        hLine.setAttribute('stroke-linecap', 'round');
        svg.appendChild(hLine);
      });
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        drawSVGConnections();
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [expandedNodes, users]);

  useEffect(() => {
    window.addEventListener('resize', drawSVGConnections);
    return () => window.removeEventListener('resize', drawSVGConnections);
  }, []);

  const TreeNode = ({ node, depth = 0, isRoot = false, parentId = null }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const primaryLevel = node.primary_career_level || 'usuario';
    const bgColor = getCareerColor(primaryLevel);
    const initials = getInitials(node.full_name);
    const nodeRef = useRef(null);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
      if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect();
        const container = containerRef.current?.getBoundingClientRect();
        if (container) {
          nodePositions.current[node.id] = {
            x: rect.left - container.left + rect.width / 2,
            y: rect.top - container.top + rect.height / 2
          };
        }
      }
    }, [node.id, isExpanded]);

    return (
      <div 
        className={`flex flex-col items-center ${isRoot ? 'w-full' : ''}`} 
        ref={nodeRef}
        style={{ gap: isRoot ? '60px' : '30px' }}
      >
        {/* Nó/Bolha */}
        <div 
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* Bolha melhorada */}
          <button
            onClick={() => hasChildren && toggleNode(node.id)}
            className={`
              w-16 h-16 rounded-full ${bgColor}
              flex items-center justify-center
              text-white font-bold text-sm
              hover:shadow-2xl transition-all duration-300
              cursor-pointer shadow-lg
              relative group/btn
              hover:scale-110
              border-2 border-white/20
              overflow-hidden
              flex-shrink-0
            `}
          >
            {node.avatar_url ? (
              <img src={node.avatar_url} alt={node.full_name} className="w-full h-full object-cover" />
            ) : (
              initials
            )}

            {/* Dropdown indicator */}
            {hasChildren && (
              <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                <div className="bg-gray-900 rounded-full p-1 border border-gray-700">
                  <ChevronDown className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
          </button>

          {/* Tooltip com info e ações */}
          <div 
            className={`absolute ${isRoot ? 'top-full mt-2' : 'left-full ml-1 top-1/2 -translate-y-1/2'} ${showTooltip ? 'block' : 'hidden'} bg-gray-950 text-white text-xs rounded-lg px-3 py-2 z-20 border border-gray-600 shadow-2xl whitespace-nowrap`}
          >
            <div className="font-bold">{node.full_name}</div>
            <div className="text-gray-400 text-[10px] mt-1">{node.email}</div>

            {/* Botões de ação */}
            <div className="flex gap-1 mt-2 pt-2 border-t border-gray-700">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-xs text-blue-400 hover:bg-blue-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(node);
                }}
              >
                ✏️
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-xs text-green-400 hover:bg-green-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onPromote(node);
                }}
              >
                ⭐
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-xs text-red-400 hover:bg-red-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(node);
                }}
              >
                🗑️
              </Button>
            </div>
          </div>
        </div>

        {/* Children - Estrutura em cascata */}
        {hasChildren && isExpanded && (
          <div className={isRoot ? "flex flex-row gap-16 justify-center flex-wrap w-full" : "flex flex-col gap-6"}>
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <TreeNode node={child} depth={depth + 1} isRoot={false} parentId={node.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const roots = getHierarchy();

  return (
    <div className="w-full p-8 bg-gray-900 rounded-lg relative overflow-auto min-h-screen flex items-center justify-center" ref={containerRef}>
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1, top: 0, left: 0 }}
        preserveAspectRatio="none"
      />
      <div className="relative" style={{ zIndex: 2 }}>
        {roots.map((root) => (
          <TreeNode key={root.id} node={root} depth={0} isRoot={true} />
        ))}
      </div>
    </div>
  );
}