import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para detectar status de conexão com a internet
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Marca que voltou do offline para mostrar mensagem de reconexão
            if (wasOffline) {
                setWasOffline(false);
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            setWasOffline(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [wasOffline]);

    // Função para verificar conexão real (não apenas status do navegador)
    const checkConnection = useCallback(async () => {
        try {
            const response = await fetch('https://leilaonozap.net/api/health', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-store'
            });
            setIsOnline(true);
            return true;
        } catch {
            setIsOnline(false);
            return false;
        }
    }, []);

    return { isOnline, wasOffline, checkConnection };
}

export default useOnlineStatus;
