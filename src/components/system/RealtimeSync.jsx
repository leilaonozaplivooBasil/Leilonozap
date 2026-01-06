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

  const [syncMode, setSyncMode] = useState(priority === 'high' ? 'fast' : 'normal');

  // Cria canal de broadcast
  useEffect(() => {
    if (!enabled) return;

    try {
      channelRef.current = new BroadcastChannel(`realtime-${entityName}`);
      
      channelRef.current.onmessage = (event) => {
        if (event.data.type === 'update' && mountedRef.current) {
          console.log(`📡 [${entityName}] Atualização de outra aba:`, event.data.payload);
          onUpdate(event.data.payload);
          lastSuccessRef.current = Date.now();
        }
      };
    } catch (error) {
      console.log('BroadcastChannel não disponível');
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [entityName, enabled, onUpdate]);

  // FETCH DATA COM PRIORIDADE
  const fetchData = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    // PROTEÇÃO 1: Verifica se está bloqueado
    const now = Date.now();
    if (isBlockedRef.current && now < blockUntilRef.current) {
      const secondsLeft = Math.ceil((blockUntilRef.current - now) / 1000);
      console.log(`⏸️ [${entityName}] Bloqueado por ${secondsLeft}s`);
      return;
    }

    // PROTEÇÃO 2: Verifica última requisição bem-sucedida
    const minInterval = priority === 'high' ? 5000 : 30000; // Alta: 5s, Normal: 30s
    const timeSinceSuccess = now - lastSuccessRef.current;
    
    if (timeSinceSuccess < minInterval) {
      console.log(`⏸️ [${entityName}] Aguardando intervalo (${Math.floor(timeSinceSuccess/1000)}s)`);
      return;
    }

    try {
      const { base44 } = await import('@/api/base44Client');
      const Entity = base44.entities[entityName];
      
      if (!Entity) {
        throw new Error(`Entity ${entityName} not found`);
      }
      
      // TIMEOUT DE 15 SEGUNDOS
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 15000)
      );
      
      const dataPromise = Entity.filter(filters, '-updated_date', 100);
      
      const data = await Promise.race([dataPromise, timeoutPromise]);
      
      // Reset retry count em sucesso
      retryCountRef.current = 0;
      isBlockedRef.current = false;
      lastSuccessRef.current = Date.now();
      setSyncMode('fast');
      
      const dataStr = JSON.stringify(data);
      if (lastDataRef.current !== dataStr) {
        console.log(`✅ [${entityName}] Atualizado (${data.length} registros)`);
        lastDataRef.current = dataStr;
        
        if (mountedRef.current) {
          onUpdate(data);
        }
        
        // Notifica outras abas
        if (channelRef.current) {
          try {
            channelRef.current.postMessage({ 
              type: 'update', 
              payload: data 
            });
          } catch (e) {
            // Ignora
          }
        }
      }
    } catch (error) {
      console.debug(`[${entityName}] Sync error:`, error.message);
      
      // DETECTA RATE LIMIT (429), Network Error ou TIMEOUT
      const errorMsg = error.message || '';
      if (errorMsg.includes('429') || errorMsg.includes('Rate limit') || errorMsg.includes('Network Error') || errorMsg.includes('Timeout')) {
        retryCountRef.current++;
        isBlockedRef.current = true;
        setSyncMode('slow');
        
        // Backoff exponencial: 30s, 60s, 120s ou 1min para Timeout
        const blockTime = errorMsg.includes('Timeout') ? 60000 : // 1 MINUTO para timeout
                         retryCountRef.current === 1 ? 30000 : 
                         retryCountRef.current === 2 ? 60000 : 120000;
        
        blockUntilRef.current = Date.now() + blockTime;
        
        console.log(`🔴 [${entityName}] ${errorMsg.includes('Timeout') ? 'TIMEOUT' : 'RATE LIMIT/NETWORK ERROR'}! Bloqueado por ${blockTime/1000}s`);
        
        // Remove todos os toasts de erro
      }
    }
  }, [entityName, filters, enabled, onUpdate, priority]);

  // POLLING COM PRIORIDADE DINÂMICA
  useEffect(() => {
    if (!enabled) return;

    // 🚀 INTERVALOS BASEADOS EM PRIORIDADE E MODO
    const intervals = {
      high_fast: 10000,   // 10s - Sala de leilão ativa
      high_slow: 30000,   // 30s - Sala de leilão com rate limit
      normal_fast: 60000,  // 60s - Outras páginas
      normal_slow: 120000  // 120s - Outras páginas com rate limit
    };

    const key = `${priority}_${syncMode}`;
    const activeInterval = intervals[key] || interval;

    console.log(`🔄 [${entityName}] Sync ${key.toUpperCase()}: ${activeInterval/1000}s`);

    // Primeira busca após 3s
    const initialTimeout = setTimeout(fetchData, 3000);

    // Polling contínuo
    pollingRef.current = setInterval(fetchData, activeInterval);

    return () => {
      clearTimeout(initialTimeout);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchData, interval, enabled, priority, syncMode, entityName]);

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