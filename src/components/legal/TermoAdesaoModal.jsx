import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, ShieldCheck } from 'lucide-react';
import TermoAdesaoTexto, { DECLARACAO_CIENCIA } from '@/components/legal/TermoAdesaoTexto';

/**
 * Modal do Termo de Adesão Obrigatório — reaproveitado na sala de leilão e nos cadastros.
 * modo="aceite" (padrão): exige o checkbox do item 9 antes de liberar a ação.
 * modo="leitura": só exibe o termo (usado pelo aviso "não é leilão oficial").
 */
export default function TermoAdesaoModal({ onAccept, onClose, modo = 'aceite', textoConfirmar = 'Concordo e Quero Participar' }) {
  const [aceito, setAceito] = useState(false);
  const somenteLeitura = modo === 'leitura';

  return (
    <div className="fixed inset-0 bg-gray-900/85 flex items-center justify-center z-[2100] p-3 sm:p-4 animate-in fade-in-0">
      <Card className="w-full max-w-lg bg-gray-800 border-gray-700 text-white max-h-[92vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white text-base sm:text-lg">
            <FileText className="w-6 h-6 text-orange-400 flex-shrink-0" />
            Termo de Adesão Obrigatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300 text-sm">
            Para participar, você deve ler e concordar com nossas regras. A transparência é nosso maior compromisso.
          </p>
          <TermoAdesaoTexto />
          {!somenteLeitura && (
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="termo-adesao-aceite"
                checked={aceito}
                onCheckedChange={setAceito}
                className="mt-0.5 border-gray-600 data-[state=checked]:bg-green-600"
              />
              <label htmlFor="termo-adesao-aceite" className="text-sm font-medium text-gray-300 leading-snug cursor-pointer">
                {DECLARACAO_CIENCIA}
              </label>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
          {somenteLeitura ? (
            <Button onClick={onClose} className="w-full sm:w-auto min-h-[44px] bg-green-600 hover:bg-green-700">
              Fechar
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto min-h-[44px] border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={onAccept}
                disabled={!aceito}
                className="w-full sm:w-auto min-h-[44px] bg-green-600 hover:bg-green-700"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {textoConfirmar}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}