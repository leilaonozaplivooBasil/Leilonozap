import { useEffect, useRef } from 'react';

/**
 * 🧹 HOOK DE LIMPEZA AUTOMÁTICA DE MEMÓRIA
 * Registra e limpa intervalos, timeouts, refs, e listeners
 */
export function useMemoryCleanup() {
  const intervalsRef = useRef([]);
  const timeoutsRef = useRef([]);
  const listenersRef = useRef([]);
  const controllersRef = useRef([]);

  const registerInterval = (id) => {
    intervalsRef.current.push(id);
    return id;
  };

  const registerTimeout = (id) => {
    timeoutsRef.current.push(id);
    return id;
  };

  const registerListener = (element, event, handler) => {
    listenersRef.current.push({ element, event, handler });
    element.addEventListener(event, handler);
  };

  const registerController = (controller) => {
    controllersRef.current.push(controller);
    return controller;
  };

  useEffect(() => {
    return () => {
      // Limpa todos os intervals
      intervalsRef.current.forEach(id => clearInterval(id));
      
      // Limpa todos os timeouts
      timeoutsRef.current.forEach(id => clearTimeout(id));
      
      // Remove todos os listeners
      listenersRef.current.forEach(({ element, event, handler }) => {
        try {
          element.removeEventListener(event, handler);
        } catch (e) {
          console.debug('Listener cleanup error:', e.message);
        }
      });
      
      // Aborta todos os controllers
      controllersRef.current.forEach(controller => {
        try {
          controller.abort();
        } catch (e) {
          console.debug('Controller abort error:', e.message);
        }
      });

      console.log('🧹 Memory cleanup complete');
    };
  }, []);

  return {
    registerInterval,
    registerTimeout,
    registerListener,
    registerController
  };
}