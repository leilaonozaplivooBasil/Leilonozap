import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

export default function TreeHierarchy({ users, onEdit, onDelete, onPromote, onRelink }) {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [lineKey, setLineKey] = useState(0);
  const [draggedNode, setDraggedNode] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const nodePositions = useRef({});
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Monta hierarquia completa
  const getHierarchy = useCallback(() => {
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
    return { roots, usersMap };
  }, [users]);

  const { roots } = getHierarchy();
  const mainRoot = roots[0] || null;

  // Toggle expandir/colapsar um nó
  const toggleExpand = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
    // Força redesenho das linhas após animação
    setTimeout(() => setLineKey(k => k + 1), 100);
  };

  // Desenha TODAS as linhas de conexão recursivamente
  const drawAllConnections = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    const containerRect = containerRef.current.getBoundingClientRect();
    svg.setAttribute('width', containerRect.width);
    svg.setAttribute('height', containerRect.height);

    // Função recursiva para desenhar linhas
    const drawLinesForNode = (node) => {
      if (!node) return;
      
      const parentPos = nodePositions.current[node.id];
      if (!parentPos) return;

      const children = node.children || [];
      const isExpanded = expandedNodes.has(node.id);

      if (isExpanded && children.length > 0) {
        children.forEach(child => {
          const childPos = nodePositions.current[child.id];
          if (!childPos) return;

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', parentPos.x);
          line.setAttribute('y1', parentPos.y + 32);
          line.setAttribute('x2', childPos.x);
          line.setAttribute('y2', childPos.y - 32);
          line.setAttribute('stroke', '#cbd5e1');
          line.setAttribute('stroke-width', '3');
          line.setAttribute('stroke-linecap', 'round');
          line.setAttribute('stroke-dasharray', '8 6');
          svg.appendChild(line);

          // Recursivamente desenha linhas para os filhos
          drawLinesForNode(child);
        });
      }
    };

    if (mainRoot) {
      drawLinesForNode(mainRoot);
    }
  }, [expandedNodes, mainRoot]);

  useEffect(() => {
    const timer = setTimeout(() => {
      requestAnimationFrame(drawAllConnections);
    }, 200);
    return () => clearTimeout(timer);
  }, [expandedNodes, users, lineKey, drawAllConnections]);

  useEffect(() => {
    window.addEventListener('resize', drawAllConnections);
    return () => window.removeEventListener('resize', drawAllConnections);
  }, [drawAllConnections]);

  // Handlers de drag and drop
  const handleDragStart = (e, node) => {
    e.stopPropagation();
    setDraggedNode(node);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.id);
    // Visual feedback
    if (e.target) {
      e.target.style.opacity = '0.5';
    }
  };

  const handleDragOver = (e, node) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNode && draggedNode.id !== node.id) {
      e.dataTransfer.dropEffect = 'move';
      setDropTarget(node.id);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
  };

  const handleDrop = async (e, newParent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedId = e.dataTransfer.getData('text/plain') || draggedNode?.id;
    
    if (!draggedId || draggedId === newParent.id) {
      setDraggedNode(null);
      setDropTarget(null);
      return;
    }

    const draggedUser = users.find(u => u.id === draggedId);
    if (!draggedUser) {
      setDraggedNode(null);
      setDropTarget(null);
      return;
    }

    // Verifica se o alvo é descendente do arrastado (causaria ciclo)
    const isDescendantOf = (ancestorId, maybeDescendantId) => {
      const queue = [ancestorId];
      const seen = new Set();
      while (queue.length > 0) {
        const currentId = queue.shift();
        for (const u of users) {
          if (u.referred_by_id === currentId && !seen.has(u.id)) {
            if (u.id === maybeDescendantId) return true;
            seen.add(u.id);
            queue.push(u.id);
          }
        }
      }
      return false;
    };

    if (isDescendantOf(draggedId, newParent.id)) {
      toast.error('Não pode mover para um descendente! O ciclo será resolvido automaticamente.');
    }

    // Chama callback de relink (com flag para resolver ciclos)
    if (onRelink) {
      try {
        await onRelink(draggedId, newParent.id, true);
        toast.success(`${draggedUser.full_name} agora está abaixo de ${newParent.full_name}`);
      } catch (err) {
        toast.error('Erro ao mover: ' + err.message);
      }
    }

    setDraggedNode(null);
    setDropTarget(null);
  };

  const handleDragEnd = (e) => {
    // Reset visual feedback
    if (e.target) {
      e.target.style.opacity = '1';
    }
    setDraggedNode(null);
    setDropTarget(null);
  };

  // Componente do nó (círculo) com filhos expansíveis
  const TreeNode = ({ node, depth = 0 }) => {
    const primaryLevel = node.primary_career_level || 'usuario';
    const bgColor = getCareerColor(primaryLevel);
    const initials = getInitials(node.full_name);
    const nodeRef = useRef(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isDragging = draggedNode?.id === node.id;
    const isDropTarget = dropTarget === node.id;

    useEffect(() => {
      if (nodeRef.current && containerRef.current) {
        const rect = nodeRef.current.getBoundingClientRect();
        const container = containerRef.current.getBoundingClientRect();
        nodePositions.current[node.id] = {
          x: rect.left - container.left + rect.width / 2,
          y: rect.top - container.top + rect.height / 2
        };
        setTimeout(drawAllConnections, 50);
      }
    }, [node.id, isExpanded]);

    return (
      <div className="flex flex-col items-center">
        {/* Círculo do nó */}
        <div 
          className={`relative flex flex-col items-center transition-all duration-200 ${isDragging ? 'opacity-50 scale-90' : ''} ${isDropTarget ? 'scale-110' : ''}`}
          ref={nodeRef}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node)}
        >
          <div
            draggable="true"
            onDragStart={(e) => handleDragStart(e, node)}
            onDragEnd={handleDragEnd}
            onClick={() => hasChildren && toggleExpand(node.id)}
            className={`
              w-16 h-16 rounded-full ${bgColor}
              flex items-center justify-center
              text-white font-bold text-sm
              hover:shadow-2xl transition-all duration-300
              cursor-grab active:cursor-grabbing
              ${hasChildren ? 'hover:scale-110' : ''}
              shadow-lg border-2 ${isDropTarget ? 'border-green-400 ring-4 ring-green-400/50' : 'border-white/20'}
              overflow-hidden flex-shrink-0
              relative select-none
            `}
          >
            {node.avatar_url ? (
              <img src={node.avatar_url} alt={node.full_name} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
            
            {/* Indicador de expandir/colapsar */}
            {hasChildren && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center border border-gray-600">
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-green-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
              </div>
            )}
          </div>

          {/* Badge de quantidade de filhos */}
          {hasChildren && !isExpanded && (
            <div className="absolute -top-1 -left-1 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
              {node.children.length}
            </div>
          )}

          {/* Tooltip */}
          <div 
            className={`absolute ${depth === 0 ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 ${showTooltip ? 'block' : 'hidden'} bg-gray-950 text-white text-xs rounded-lg px-3 py-2 z-30 border border-gray-600 shadow-2xl whitespace-nowrap`}
          >
            <div className="font-bold">{node.full_name}</div>
            <div className="text-gray-400 text-[10px] mt-1">{node.email}</div>
            {hasChildren && (
              <div className="text-green-400 text-[10px] mt-1">
                {isExpanded ? '👇 Clique para fechar' : `👆 Clique para ver ${node.children.length} indicados`}
              </div>
            )}

            <div className="flex gap-1 mt-2 pt-2 border-t border-gray-700">
              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-blue-400 hover:bg-blue-500/20"
                onClick={(e) => { e.stopPropagation(); onEdit(node); }}>✏️</Button>
              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-green-400 hover:bg-green-500/20"
                onClick={(e) => { e.stopPropagation(); onPromote(node); }}>⭐</Button>
              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-red-400 hover:bg-red-500/20"
                onClick={(e) => { e.stopPropagation(); onDelete(node); }}>🗑️</Button>
            </div>
          </div>
        </div>

        {/* Filhos expandidos */}
        {hasChildren && isExpanded && (
          <div className="mt-32 flex flex-row gap-8 justify-center flex-wrap">
            {node.children.map(child => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!mainRoot) {
    return (
      <div className="w-full p-8 bg-gray-900 rounded-lg text-center text-gray-400">
        Nenhum usuário encontrado na hierarquia.
      </div>
    );
  }

  return (
    <div className="w-full p-8 bg-gray-900 rounded-lg relative min-h-[500px] overflow-auto" ref={containerRef}>
      {/* Botão Expandir Todos / Colapsar Todos */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <Button
          onClick={() => {
            // Expande todos os nós com filhos
            const allIds = new Set();
            const collectIds = (node) => {
              if (node.children && node.children.length > 0) {
                allIds.add(node.id);
                node.children.forEach(collectIds);
              }
            };
            collectIds(mainRoot);
            setExpandedNodes(allIds);
            setTimeout(() => setLineKey(k => k + 1), 100);
          }}
          variant="outline"
          size="sm"
          className="text-xs border-green-600 text-green-400 hover:bg-green-600/20"
        >
          Expandir Todos
        </Button>
        <Button
          onClick={() => {
            setExpandedNodes(new Set());
            setTimeout(() => setLineKey(k => k + 1), 100);
          }}
          variant="outline"
          size="sm"
          className="text-xs border-gray-600 text-gray-400 hover:bg-gray-600/20"
        >
          Colapsar Todos
        </Button>
      </div>

      {/* SVG para linhas */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* Árvore recursiva */}
      <div className="relative flex flex-col items-center pt-12" style={{ zIndex: 2 }}>
        <TreeNode node={mainRoot} depth={0} />
      </div>
    </div>
  );
}