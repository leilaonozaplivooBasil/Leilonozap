import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, TriangleAlert, Loader2, Ban } from 'lucide-react';

/**
 * Confirmação de exclusão DEFINITIVA de um cadastro que já está na Lixeira.
 * `blockReasons` chega preenchido quando o servidor recusou (saldo, comissão, pedido…).
 */
export default function PurgeUserDialog({ user, isPurging, blockReasons = [], onCancel, onConfirm }) {
  if (!user) return null;
  const bloqueado = blockReasons.length > 0;

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-gray-900 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          {bloqueado ? <Ban className="w-4 h-4 text-amber-400" /> : <TriangleAlert className="w-4 h-4 text-red-400" />}
          <span className="text-[14px] font-semibold text-white">
            {bloqueado ? 'Não é possível apagar este cadastro' : 'Apagar de vez do banco'}
          </span>
        </div>

        <div className="px-4 py-4 space-y-3 text-[13px] text-gray-300">
          <p>
            <strong className="text-white break-words">{user.full_name}</strong>
            <span className="block text-gray-500 break-all">{user.email || 'sem e-mail'}</span>
          </p>

          {bloqueado ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-900/15 p-3 space-y-1.5 text-[12px] text-amber-200">
              {blockReasons.map((r, i) => (
                <p key={i}>• {r}</p>
              ))}
              <p className="text-amber-300/70 pt-1">
                Resolva isso primeiro — o cadastro segue guardado na Lixeira.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-red-500/30 bg-red-900/15 p-3 text-[12px] text-red-200">
              Esta conta será apagada do banco permanentemente. Não tem como voltar.
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 px-4 py-3 border-t border-gray-800">
          <Button
            size="sm"
            variant="outline"
            disabled={isPurging}
            onClick={onCancel}
            className="h-9 min-w-[96px] text-[12px] bg-gray-100 border-gray-300 text-gray-900 hover:bg-white hover:text-black"
          >
            {bloqueado ? 'Fechar' : 'Cancelar'}
          </Button>
          {!bloqueado && (
            <Button
              size="sm"
              disabled={isPurging}
              onClick={onConfirm}
              className="h-9 text-[12px] bg-red-600 hover:bg-red-500 disabled:opacity-40"
            >
              {isPurging ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Apagando…</>
              ) : (
                <><Trash2 className="w-3.5 h-3.5 mr-1.5" />Apagar definitivamente</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}