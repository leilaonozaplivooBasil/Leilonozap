import React, { useEffect, useRef, useCallback, useState } from 'react';

/**
 * 🔄 SISTEMA DE SINCRONIZAÇÃO EM TEMPO REAL - OTIMIZADO PARA SALAS DE LEILÃO
 * Intervalos ajustados dinamicamente baseado no contexto
 */

export function useRealtimeSync({ 
  entityName, 
  filters = {}, 
  onUpdate, 
  interval = 90000, // Padrão: 90s
  enabled = true,
  priority = 'normal' // 'high' para sala de leilão, 'normal' para outras páginas
}) {
  const pollingRef = useRef(null);
  const channelRef = useRef(null);
  const lastDataRef = useRef(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const isBlockedRef = useRef(false);
  const blockUntilRef = useRef(0);
  const lastSuccessRef = useRef(Date.now());

  const syncModeRef = useRef(priority === 'high' ? 'fast' : 'normal');

  // Cria canal de broadcast
  useEffect(() => {
    if (!enabled) return;

    try {
      channelRef.current = new BroadcastChannel(`realtime-${entityName}`);
      
      channelRef.current.onmessage = (event) => {
        if (event.data.type === 'update' && mountedRef.current) {
          onUpdate(event.data.payload);
          lastSuccessRef.current = Date.now();
        }
      };
    } catch (error) {
      // BroadcastChannel não disponível
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [entityName, enabled]);

  // FETCH DATA COM PRIORIDADE
  const fetchData = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    const now = Date.now();
    
    // PROTEÇÃO 1: Verifica se está bloqueado
    if (isBlockedRef.current && now < blockUntilRef.current) {
      return;
    }

    // PROTEÇÃO 2: Intervalo mínimo entre chamadas
    const minInterval = priority === 'high' ? 8000 : 45000;
    if (now - lastSuccessRef.current < minInterval) {
      return;
    }

    try {
      const { base44 } = await import('@/api/base44Client');
      const Entity = base44.entities[entityName];
      
      if (!Entity) return;
      
      const data = await Promise.race([
        Entity.list('-updated_date', 100),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
      ]);
      
      retryCountRef.current = 0;
      isBlockedRef.current = false;
      lastSuccessRef.current = Date.now();
      syncModeRef.current = 'fast';
      
      const dataStr = JSON.stringify(data);
      if (lastDataRef.current !== dataStr) {
        lastDataRef.current = dataStr;
        if (mountedRef.current) onUpdate(data);
        
        if (channelRef.current) {
          try { channelRef.current.postMessage({ type: 'update', payload: data }); } catch (e) {}
        }
      }
    } catch (error) {
      const errorMsg = error.message || '';
      if (errorMsg.includes('429') || errorMsg.includes('Rate limit') || errorMsg.includes('Network Error') || errorMsg.includes('Timeout')) {
        retryCountRef.current++;
        isBlockedRef.current = true;
        syncModeRef.current = 'slow';
        
        const blockTime = Math.min(30000 * Math.pow(2, retryCountRef.current - 1), 300000);
        blockUntilRef.current = Date.now() + blockTime;
      }
    }
  }, [entityName, enabled, priority]);

  // POLLING ESTÁVEL - NÃO DEPENDE DE syncMode (evita loop de re-render)
  useEffect(() => {
    if (!enabled) return;

    const activeInterval = priority === 'high' ? 10000 : 90000;

    // Primeira busca com delay escalonado para evitar burst
    const initialDelay = priority === 'high' ? 3000 : (5000 + Math.random() * 5000);
    const initialTimeout = setTimeout(fetchData, initialDelay);

    pollingRef.current = setInterval(fetchData, activeInterval);

    return () => {
      clearTimeout(initialTimeout);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchData, enabled, priority, entityName]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { 
    refresh: fetchData,
    isActive: enabled && !isBlockedRef.current,
    mode: syncMode
  };
}

/**
 * 🎯 LEILÃO - PRIORIDADE ALTA (10 segundos)
 */
export function useRealtimeAuction(auctionId, onUpdate) {
  return useRealtimeSync({
    entityName: 'Auction',
    filters: { id: auctionId },
    onUpdate: (data) => {
      if (data.length > 0) {
        onUpdate(data[0]);
      }
    },
    interval: 10000, // 10 segundos
    enabled: !!auctionId,
    priority: 'high' // ALTA PRIORIDADE
  });
}

/**
 * 💬 MENSAGENS - PRIORIDADE ALTA (10 segundos)
 */
export function useRealtimeMessages(auctionId, onNewMessage) {
  const lastCountRef = useRef(0);

  return useRealtimeSync({
    entityName: 'AuctionMessage',
    filters: { auction_id: auctionId },
    onUpdate: (data) => {
      if (data.length > lastCountRef.current) {
        const newMessages = data.slice(0, data.length - lastCountRef.current);
        newMessages.forEach(msg => {
          onNewMessage(msg);
        });
      }
      lastCountRef.current = data.length;
    },
    interval: 10000, // 10 segundos
    enabled: !!auctionId,
    priority: 'high' // ALTA PRIORIDADE
  });
}

/**
 * 🏆 RANKING - DESABILITADO POR PADRÃO
 */
export function useRealtimeRanking(onUpdate) {
  return useRealtimeSync({
    entityName: 'AppUser',
    filters: {},
    onUpdate: (users) => {
      const sorted = users.sort((a, b) => (b.points || 0) - (a.points || 0));
      onUpdate(sorted);
    },
    interval: 120000, // 120 segundos (2 minutos)
    enabled: true // ✅ HABILITADO
  });
}

/**
 * 📊 STATUS DE CONEXÃO
 */
export function RealtimeStatus({ isActive }) {
  const [status, setStatus] = useState('connected');

  useEffect(() => {
    if (!isActive) {
      setStatus('disconnected');
      return;
    }
    
    // Considera conectado se ativo
    setStatus('connected');
  }, [isActive]);

  const statusConfig = {
    connected: { color: 'bg-green-500', text: 'Online', pulse: true },
    warning: { color: 'bg-yellow-500', text: 'Lento', pulse: true },
    error: { color: 'bg-red-500', text: 'Offline', pulse: false },
    disconnected: { color: 'bg-gray-500', text: 'Pausado', pulse: false }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <div className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span>{config.text}</span>
    </div>
  );
}