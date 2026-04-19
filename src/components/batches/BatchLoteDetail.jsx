import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';

export default function BatchLoteDetail({ lote, loteIndex, batch, lotesStatus, onConvertSingleLot }) {
  const loteKey = `${batch.id}_${lote.numero_lote}`;
  const status = lotesStatus?.[loteKey];
  const totalProdutos = lote.produtos?.reduce((sum, p) => sum + (p.quantidade || 1), 0) || 0;

  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-400">#{lote.numero_lote || (loteIndex + 1)}</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Lote {lote.numero_lote || `#${loteIndex + 1}`}</h4>
            <p className="text-xs text-gray-500">{totalProdutos} produto(s)</p>
          </div>
          {status && (
            status.complete && status.found > 0 ? (
              <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs">
                ✓ Completo ({status.found}/{status.expected})
              </Badge>
            ) : status.missing > 0 ? (
              <Badge className="bg-red-500/15 text-red-300 border border-red-500/30 text-xs">
                ⚠ Faltam {status.missing}
              </Badge>
            ) : status.found === 0 ? (
              <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs">
                ⏳ Não lançado
              </Badge>
            ) : null
          )}
        </div>
        <div className="flex items-center gap-2">
          {lote.valor_lote > 0 && (
            <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-md px-2 py-0.5">
              R$ {lote.valor_lote?.toFixed(2)}
            </span>
          )}
          {onConvertSingleLot && (
            <Button
              size="sm"
              onClick={() => onConvertSingleLot(batch, loteIndex)}
              className="h-7 bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 gap-1"
            >
              <Package className="w-3 h-3" />
              {batch.status === 'convertido' ? 'Relançar' : 'Lançar'}
            </Button>
          )}
        </div>
      </div>

      {/* Products Table */}
      {lote.produtos && lote.produtos.length > 0 && (
        <div className="divide-y divide-gray-700/30">
          {lote.produtos.map((produto, prodIdx) => (
            <div key={prodIdx} className="flex items-center justify-between px-4 py-2 hover:bg-gray-700/20 transition-colors">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {produto.codigo && (
                  <span className="text-xs font-mono bg-gray-700/60 text-gray-400 px-1.5 py-0.5 rounded flex-shrink-0">
                    {produto.codigo}
                  </span>
                )}
                <span className="text-sm text-gray-200 truncate">{produto.descricao || 'Sem descrição'}</span>
                {produto.variacao && (
                  <span className="text-xs text-gray-500 flex-shrink-0">• {produto.variacao}</span>
                )}
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                <span className="text-xs text-gray-400">
                  Qtd: <span className="text-white font-semibold">{produto.quantidade || 1}</span>
                </span>
                <span className="text-xs text-gray-500">
                  Unit: R$ {batch.custo_por_unidade?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}