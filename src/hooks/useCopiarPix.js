import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { copyLink } from '@/lib/clipboard';

// useCopiarPix — feedback visual REAL do "Copiar Código PIX".
//
// O padrão antigo era `navigator.clipboard.writeText(codigo); toast.success(...)`.
// Dois problemas: no webview do WhatsApp/Instagram (de onde vem a maior parte do
// tráfego) `navigator.clipboard` pode não existir — aí a linha estoura, o toast
// nem chega a rodar e o cliente fica olhando pro spinner do monitoramento sem
// saber se copiou. E o toast era otimista: aparecia mesmo quando a cópia falhava.
//
// Aqui a cópia passa pelo copyLink() (que tem fallback de execCommand) e só
// marca "copiado" quando copiou de verdade.
export function useCopiarPix(duracaoMs = 2500) {
  const [copiado, setCopiado] = useState(false);
  const timerRef = useRef(null);

  const copiar = useCallback(async (codigo) => {
    const ok = await copyLink(codigo);

    if (!ok) {
      toast.error('Não consegui copiar. Selecione o código abaixo e copie manualmente.');
      return false;
    }

    setCopiado(true);
    toast.success('Código PIX copiado com sucesso!');

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopiado(false), duracaoMs);
    return true;
  }, [duracaoMs]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { copiado, copiar };
}
