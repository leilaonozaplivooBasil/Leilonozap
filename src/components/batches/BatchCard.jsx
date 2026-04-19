import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronDown, ChevronUp, FileImage, Edit, Trash2, ArrowRight,
  Package, Calendar, DollarSign, Hash, Layers, Eye, Pencil, Check
} from 'lucide-react';

const MARKETPLACE_ICONS = {
  'Mercado Livre': '🟡',
  'Shopee': '🟠',
  'Magazine Luiza': '🔵',
  'Casas Bahia': '🔴',
  'Extra': '🟢',
  'Amazon': '🟤',
  'Americanas': '❤️',
  'Submarino': '🔷',
  'Netshoes': '👟',
  'Dafiti': '👗',
  'OLX': '🟣',
  'Outros': '📦',
};

function formatPrettyDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return null; }
}

export default function BatchCard({
  // Common props
  title,
  subtitle,
  status, // 'pendente' | 'convertido' | 'estoque'
  totalProdutos,
  valorTotal,
  custoUnitario,
  date,
  dateLabel,
  marketplace,
  origem, // 'nota_fiscal' | 'planilha' | 'manual' | 'estoque_lotes'
  produtosNoEstoque,
  arquivoUrl,
  arquivoNome,
  observacoes,
  // Actions
  onExpand,
  onEdit,
  onDelete,
  onConvert,
  onViewFile,
  onRename, // NEW: callback(newName) to save inline rename
  // Expanded content
  isExpanded,
  expandedContent,
  lotesCount,
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title || '');
  const prettyDate = formatPrettyDate(date);

  const statusConfig = {
    pendente: { label: 'Pendente', cls: 'bg-amber-500/20 text-amber-300 border border-amber-500/40' },
    convertido: { label: 'No Estoque', cls: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' },
    estoque: { label: 'No Estoque', cls: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' },
  };

  const origemConfig = {
    nota_fiscal: { label: 'Nota Fiscal', icon: '📄' },
    planilha: { label: 'Planilha', icon: '📊' },
    manual: { label: 'Manual', icon: '✏️' },
    estoque_lotes: { label: 'Estoque de Lotes', icon: '🗂️' },
  };

  const st = statusConfig[status] || statusConfig.convertido;
  const og = origemConfig[origem] || origemConfig.manual;

  return (
    <div className="rounded-2xl border border-gray-700/60 bg-gradient-to-br from-gray-800/80 to-gray-900/80 overflow-hidden transition-all hover:border-gray-600/80 group">
      {/* TOP BAR — status accent */}
      <div className={`h-1 w-full ${status === 'pendente' ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`} />

      {/* HEADER */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          {/* LEFT — Info */}
          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-center gap-2.5 mb-2">
              {isRenaming ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && renameValue.trim()) {
                        onRename?.(renameValue.trim());
                        setIsRenaming(false);
                      }
                      if (e.key === 'Escape') setIsRenaming(false);
                    }}
                    autoFocus
                    className="bg-gray-700 border-gray-600 text-white h-8 text-base font-bold"
                    placeholder="Nome do leilão / fornecedor"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (renameValue.trim()) {
                        onRename?.(renameValue.trim());
                        setIsRenaming(false);
                      }
                    }}
                    className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-500"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0 group/title">
                  <h3 className="text-lg font-bold text-white truncate">{title}</h3>
                  {onRename && (
                    <button
                      onClick={() => { setRenameValue(title || ''); setIsRenaming(true); }}
                      className="opacity-0 group-hover/title:opacity-100 transition-opacity text-gray-500 hover:text-white"
                      title="Renomear"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
              {marketplace && !isRenaming && (
                <span className="text-sm flex-shrink-0" title={marketplace}>
                  {MARKETPLACE_ICONS[marketplace] || '📦'}
                </span>
              )}
            </div>

            {/* Metrics Row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {lotesCount != null && lotesCount > 0 && (
                <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-300">{lotesCount} lotes</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg px-2.5 py-1">
                <Package className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-semibold text-purple-300">{totalProdutos || 0} produtos</span>
              </div>
              <div className="flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 rounded-lg px-2.5 py-1">
                <DollarSign className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-semibold text-sky-300">R$ {(valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              {custoUnitario != null && custoUnitario > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300">C.U. R$ {custoUnitario.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Date + Origin Row */}
            <div className="flex flex-wrap items-center gap-3">
              {prettyDate && (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs">{dateLabel || 'Lançado em'}: <span className="text-gray-300 font-medium">{prettyDate}</span></span>
                </div>
              )}
              <div className="flex items-center gap-1 text-gray-500">
                <span className="text-xs">{og.icon} {og.label}</span>
              </div>
              {marketplace && (
                <span className="text-xs text-gray-500">{marketplace}</span>
              )}
            </div>
          </div>

          {/* RIGHT — Status + Actions */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge className={`${st.cls} text-xs font-semibold px-3 py-1`}>
                {st.label}
              </Badge>
              {produtosNoEstoque != null && produtosNoEstoque > 0 && (
                <Badge className="bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs px-2 py-1">
                  {produtosNoEstoque} no estoque
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              {onExpand && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onExpand}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                  title="Expandir detalhes"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              )}
              {(arquivoUrl || onViewFile) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewFile ? onViewFile() : window.open(arquivoUrl, '_blank')}
                  className="h-8 w-8 p-0 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  title={arquivoNome || 'Ver arquivo'}
                >
                  <FileImage className="w-4 h-4" />
                </Button>
              )}
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onEdit}
                  className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {onConvert && status === 'pendente' && (
                <Button
                  size="sm"
                  onClick={onConvert}
                  className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Converter
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OBSERVAÇÕES — se houver */}
      {observacoes && !isExpanded && (
        <div className="px-5 pb-3">
          <p className="text-xs text-gray-500 line-clamp-2">{observacoes}</p>
        </div>
      )}

      {/* EXPANDED CONTENT */}
      {isExpanded && expandedContent && (
        <div className="border-t border-gray-700/50 bg-gray-900/40 px-5 py-4">
          {expandedContent}
        </div>
      )}
    </div>
  );
}