import { useState, useEffect, useCallback, useRef } from 'react';
import { provarConexao } from '@/lib/conexao';

/**
 * Hook de status de conexão (reescrito na DIR-35, 01/09/2026).
 *
 * Regra: offline NUNCA se declara pelo palpite do navegador. O
 * `navigator.onLine` mente (VPN, proxy, troca de rede) e chegou a trancar o
 * app na tela "Sem conexão" com a página recém-carregada da rede. Agora:
 * - o estado nasce otimista (a página acabou de chegar pela rede);
 * - o evento `offline` é GATILHO DE VERIFICAÇÃO — só vira offline se a
 *   prova real (busca no próprio domínio) falhar;
 * - o evento `online` e qualquer prova bem-sucedida restauram na hora.
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [wasOffline, setWasOffline] = useState(false);
    // Nº de série da prova: descarta resultado de prova ATRASADA (ex.: a rede
    // caiu, a prova ficou pendurada, a rede voltou e o evento `online` chegou
    // antes — a falha velha não pode sobrescrever o estado novo).
    const provaSeq = useRef(0);

    // Prova de verdade: /version.json do próprio domínio (ver src/lib/conexao.js)
    const checkConnection = useCallback(async () => {
        const minha = ++provaSeq.current;
        const ok = await provarConexao();
        if (minha === provaSeq.current) {
            setIsOnline(ok);
            setWasOffline(!ok);
        }
        return ok;
    }, []);

    useEffect(() => {
        const handleOnline = () => { provaSeq.current += 1; setIsOnline(true); setWasOffline(false); };
        // Navegador ACHA que caiu → confere com a rede antes de declarar
        const handleOffline = () => { checkConnection(); };

        // Boot com o navegador dizendo "offline": não tranca — prova primeiro.
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            checkConnection();
        }

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkConnection]);

    return { isOnline, wasOffline, checkConnection };
}

export default useOnlineStatus;
