import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck } from 'lucide-react';
import TermoAdesaoTexto, { DECLARACAO_CIENCIA } from '@/components/legal/TermoAdesaoTexto';

/**
 * Modal do Termo de Adesão — visual clean institucional (PONTO 70), alinhado
 * à Recepção: fundo claro, verde da marca, zero gradiente chamativo.
 *
 * modo="aceite" (padrão): exige o checkbox da Declaração de Ciência.
 * modo="leitura": só exibe o termo (aviso "não é leilão oficial").
 */
export default function TermoAdesaoModal({ onAccept, onClose, modo = 'aceite', textoConfirmar = 'Concordo e Quero Participar' }) {
  const [aceito, setAceito] = useState(false);
  const somenteLeitura = modo === 'leitura';

  return (
    <div className="fixed inset-0 bg-nz-verde-escuro/70 backdrop-blur-sm flex items-center justify-center z-[2100] p-3 sm:p-4 animate-in fade-in-0">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-nz-borda shadow-xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-nz-borda">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-nz-verde">Leilão NoZap</p>
          <h2 className="text-lg sm:text-xl font-bold text-nz-tinta mt-1">Antes de continuar</h2>
          <p className="text-sm text-nz-tinta-fraca mt-1.5 leading-relaxed">
            Transparência total: leia como funciona a disputa e o seu crédito.
          </p>
        </div>

        <div className="px-4 sm:px-6 py-4 overflow-y-auto">
          <TermoAdesaoTexto />
          {!somenteLeitura && (
            <div className="flex items-start gap-2.5 pt-4">
              <Checkbox
                id="termo-adesao-aceite"
                checked={aceito}
                onCheckedChange={setAceito}
                className="mt-0.5 border-nz-borda data-[state=checked]:bg-nz-verde data-[state=checked]:border-nz-verde"
              />
              <label htmlFor="termo-adesao-aceite" className="text-[13px] text-nz-tinta leading-snug cursor-pointer">
                {DECLARACAO_CIENCIA}
              </label>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-nz-borda bg-nz-cinza-fundo flex flex-col sm:flex-row sm:justify-end gap-2">
          {somenteLeitura ? (
            <Button onClick={onClose} className="w-full sm:w-auto min-h-[48px] bg-nz-verde hover:bg-nz-verde/90 text-white font-semibold">
              Fechar
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto min-h-[48px] bg-white border-nz-borda text-nz-tinta-fraca hover:bg-nz-verde-fundo"
              >
                Cancelar
              </Button>
              <Button
                onClick={onAccept}
                disabled={!aceito}
                className="w-full sm:w-auto min-h-[48px] bg-nz-verde hover:bg-nz-verde/90 text-white font-semibold disabled:opacity-40"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {textoConfirmar}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}