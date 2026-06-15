import React, { useEffect, useRef, useState } from 'react';
import { XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { base44 } from '@/api/base44Client';

/**
 * 🛡️ IA PROTETORA GLOBAL
 * Monitora TODO o aplicativo em tempo real
 * Detecta problemas e gera prompts de correção
 */

export default function GlobalMonitor() {
  const [issues, setIssues] = useState([]);
  const [status, setStatus] = useState('ok'); // ok, warning, critical
  const [showAlert, setShowAlert] = useState(false);
  
  const requestCountRef = useRef({ count: 0, resetTime: Date.now() });
  const errorLogRef = useRef([]);
  const performanceRef = useRef([]);

  // ============= CAPTURA ERROS GLOBAIS E LOGA =============
  useEffect(() => {
    const handleGlobalError = async (event) => {
      const error = event.error || event.reason;
      const errorMessage = error?.message || event.message || 'Erro desconhecido';
      
      try {
        await base44.entities.SystemLog.create({
          step: 'Global_Uncaught_Error',
          status: 'error',
          message: errorMessage,
          component_name: 'GlobalMonitor',
          error_details: {
            message: errorMessage,
            stack: error?.stack,
            type: event.type
          },
          url: window.location.href,
          user_agent: navigator.userAgent,
          is_mobile: /Mobi|Android/i.test(navigator.userAgent)
        });
      } catch (e) {
        console.debug('Falha ao logar erro');
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, []);

  // ============= INTERCEPTA TODOS OS ERROS =============
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = Date.now();
      
      try {
        // Conta requisições
        requestCountRef.current.count++;
        
        // Reset a cada minuto
        if (Date.now() - requestCountRef.current.resetTime > 60000) {
          const rpm = requestCountRef.current.count;
          
          if (rpm > 50) {
            addIssue({
              level: 'warning',
              type: 'rate_limit_risk',
              message: `${rpm} requisições/min - RISCO DE RATE LIMIT!`,
              location: 'Global',
              timestamp: new Date().toISOString(),
              prompt: `ATENÇÃO: Detectadas ${rpm} requisições por minuto.\n\nAÇÃO NECESSÁRIA:\n1. Aumentar intervalos de sincronização\n2. Implementar cache local\n3. Reduzir chamadas desnecessárias\n\nSUGESTÃO: Intervalo mínimo de 60-90 segundos entre syncs.`
            });
          }
          
          requestCountRef.current = { count: 0, resetTime: Date.now() };
        }
        
        const response = await originalFetch(...args);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Monitora performance
        performanceRef.current.push({ url: args[0], duration, timestamp: Date.now() });
        if (performanceRef.current.length > 100) performanceRef.current.shift();
        
        // Detecta requisições lentas
        if (duration > 3000) {
          addIssue({
            level: 'warning',
            type: 'slow_request',
            message: `Requisição lenta: ${duration}ms`,
            location: args[0],
            timestamp: new Date().toISOString(),
            prompt: `Requisição demorou ${duration}ms:\n${args[0]}\n\nPOSSÍVEIS CAUSAS:\n1. Muitos dados sendo buscados\n2. Filtros ineficientes\n3. Problema de rede\n\nSUGESTÃO: Reduzir limit de registros ou adicionar paginação.`
          });
        }
        
        // Detecta Rate Limit
        if (response.status === 429) {
          addIssue({
            level: 'critical',
            type: 'rate_limit',
            message: '🔴 RATE LIMIT ATINGIDO!',
            location: args[0],
            timestamp: new Date().toISOString(),
            prompt: `🔴 RATE LIMIT CRÍTICO\n\nURL: ${args[0]}\n\nCORREÇÃO IMEDIATA:\n1. PARAR todas as sincronizações por 2 minutos\n2. AUMENTAR intervalo para 90-120 segundos\n3. IMPLEMENTAR backoff exponencial\n4. REMOVER chamadas desnecessárias\n\nCÓDIGO SUGERIDO:\nconst SYNC_INTERVAL = 90000; // 90 segundos\nlet retryDelay = 90000;\n\nif (error.status === 429) {\n  retryDelay = retryDelay * 2; // Dobra o tempo\n  setTimeout(syncData, retryDelay);\n}`
          });
        }
        
        return response;
        
      } catch (error) {
        const endTime = Date.now();
        const requestUrl = typeof args[0] === 'string' ? args[0] : '';
        
        // Ignora erros de fetch de imagens externas (CORS esperado no compartilhamento)
        const isExternalImageFetch = requestUrl.includes('gstatic.com') ||
          requestUrl.includes('encrypted-tbn') ||
          requestUrl.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i) ||
          requestUrl.includes('shopping?q=tbn');

        // Ignora erros de rede transitórios e não-acionáveis ("Load failed" no Safari,
        // "Failed to fetch" no Chrome, requisições abortadas em navegação/unmount).
        // São blips de conexão — logamos, mas NÃO assustamos o usuário com toast crítico.
        const msg = String(error?.message || '').toLowerCase();
        const isTransientNetwork =
          error?.name === 'AbortError' ||
          msg.includes('load failed') ||
          msg.includes('failed to fetch') ||
          msg.includes('networkerror') ||
          msg.includes('network connection was lost') ||
          msg.includes('cancelled') ||
          msg.includes('aborted');

        if (!isExternalImageFetch) {
          errorLogRef.current.push({
            error: error.message,
            url: requestUrl,
            timestamp: Date.now(),
            duration: endTime - startTime
          });

          if (!isTransientNetwork) {
            addIssue({
              level: 'critical',
              type: 'request_error',
              message: `Erro na requisição: ${error.message}`,
              location: requestUrl,
              timestamp: new Date().toISOString(),
              prompt: `ERRO DE REQUISIÇÃO:\n${error.message}\n\nURL: ${requestUrl}\n\nVERIFICAR:\n1. Conexão com internet\n2. URL correta\n3. Permissões de acesso\n4. Se entidade existe no banco`
            });
          }
        }

        throw error;
      }
    };
    
    // Intercepta erros do console
    const originalError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      
      // Detecta loops infinitos
      if (errorMessage.includes('Maximum update depth exceeded')) {
        addIssue({
          level: 'critical',
          type: 'infinite_loop',
          message: '🔴 LOOP INFINITO DETECTADO!',
          location: 'React Component',
          timestamp: new Date().toISOString(),
          prompt: `🔴 LOOP INFINITO DE RENDERIZAÇÃO\n\nCAUSA: useEffect com dependências circulares\n\nCORREÇÃO:\n1. Usar useRef para valores que não precisam re-render\n2. Memoizar callbacks com useCallback\n3. Verificar arrays de dependências\n\nEXEMPLO:\n// ❌ ERRADO:\nuseEffect(() => {\n  setData(processData(data));\n}, [data]); // Loop!\n\n// ✅ CORRETO:\nconst dataRef = useRef(data);\nuseEffect(() => {\n  dataRef.current = data;\n}, [data]);\n\nconst processedData = useMemo(() => processData(data), [data]);`
        });
      }
      
      // Detecta erros de hook
      if (errorMessage.includes('rendered more hooks')) {
        addIssue({
          level: 'critical',
          type: 'hook_error',
          message: 'Erro de React Hooks',
          location: 'React Component',
          timestamp: new Date().toISOString(),
          prompt: `ERRO DE HOOKS:\n${errorMessage}\n\nREGRAS DOS HOOKS:\n1. Sempre no topo da função\n2. Nunca dentro de condicionais\n3. Nunca em loops\n4. Ordem sempre a mesma\n\nVERIFICAR:\n- Hooks dentro de if/else\n- Hooks em callbacks\n- Número de hooks mudando`
        });
      }
      
      originalError(...args);
    };
    
    // Cleanup
    return () => {
      window.fetch = originalFetch;
      console.error = originalError;
    };
  }, []);

  // ============= ADICIONA ISSUE =============
  const addIssue = (issue) => {
    setIssues(prev => {
      // Evita duplicatas nos últimos 10 segundos
      const isDuplicate = prev.some(i => 
        i.type === issue.type && 
        i.location === issue.location &&
        Date.now() - new Date(i.timestamp).getTime() < 10000
      );
      
      if (isDuplicate) return prev;
      
      const newIssues = [issue, ...prev].slice(0, 50); // Máximo 50 issues
      
      // Atualiza status geral
      const hasCritical = newIssues.some(i => i.level === 'critical');
      const hasWarning = newIssues.some(i => i.level === 'warning');
      
      if (hasCritical) {
        setStatus('critical');
        setShowAlert(true);
      } else if (hasWarning) {
        setStatus('warning');
      } else {
        setStatus('ok');
      }
      
      // Salva no localStorage para página de diagnóstico
      localStorage.setItem('systemIssues', JSON.stringify(newIssues));
      
      return newIssues;
    });
  };

  // ============= MONITORA PERFORMANCE =============
  useEffect(() => {
    const checkPerformance = setInterval(() => {
      if (performanceRef.current.length > 10) {
        const avgDuration = performanceRef.current.reduce((sum, p) => sum + p.duration, 0) / performanceRef.current.length;
        
        if (avgDuration > 2000) {
          addIssue({
            level: 'warning',
            type: 'performance',
            message: `Performance degradada: ${Math.round(avgDuration)}ms médio`,
            location: 'Global',
            timestamp: new Date().toISOString(),
            prompt: `PERFORMANCE LENTA\n\nTempo médio de requisição: ${Math.round(avgDuration)}ms\n\nOTIMIZAÇÕES:\n1. Reduzir quantidade de dados buscados\n2. Implementar paginação\n3. Usar cache local\n4. Lazy loading de componentes\n\nEXEMPLO:\n// Reduzir limit\nawait Entity.list("-created_date", 20); // Em vez de 100\n\n// Cache\nconst [cache, setCache] = useState({});\nif (cache[id]) return cache[id];`
          });
        }
      }
    }, 30000); // Check a cada 30s
    
    return () => clearInterval(checkPerformance);
  }, []);

  // ============= ALERTA VISUAL =============
  const latestCritical = issues.find(i => i.level === 'critical');
  
  if (!showAlert || !latestCritical) return null;

  return (
    <div className="fixed top-20 right-4 z-[9999] max-w-md animate-in slide-in-from-top">
      <Alert className="bg-red-900/95 border-red-500 text-white backdrop-blur-sm">
        <XCircle className="h-5 w-5" />
        <AlertDescription className="ml-2">
          <div className="font-bold text-lg mb-2">{latestCritical.message}</div>
          <div className="text-sm opacity-90 mb-3">{latestCritical.location}</div>
          <button
            onClick={() => {
              // Copia prompt para clipboard
              navigator.clipboard.writeText(latestCritical.prompt);
              alert('Prompt copiado! Cole no chat para eu corrigir.');
            }}
            className="bg-white text-red-900 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors mr-2"
          >
            📋 Copiar Prompt de Correção
          </button>
          <button
            onClick={() => setShowAlert(false)}
            className="bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Dispensar
          </button>
        </AlertDescription>
      </Alert>
    </div>
  );
}