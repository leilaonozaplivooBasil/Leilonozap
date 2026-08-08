import React, { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { registrarLog } from '@/lib/logDedupe';
import { instalarCamadaRede, definirAviso, mediaDesempenho } from '@/lib/camadaRede';

/**
 * 🛡️ IA PROTETORA GLOBAL
 * Monitora TODO o aplicativo em tempo real
 * Detecta problemas e gera prompts de correção
 */

export default function GlobalMonitor() {
  const [issues, setIssues] = useState([]);
  const [status, setStatus] = useState('ok'); // ok, warning, critical
  const [showAlert, setShowAlert] = useState(false);
  

  // ============= CAPTURA ERROS GLOBAIS E LOGA =============
  useEffect(() => {
    // 🔇 Passa pelo gravador único (registrarLog): erro idêntico repetido dentro
    // de 60s grava UMA vez. Antes, um erro em loop gerava dezenas de registros
    // idênticos por minuto. Erro distinto continua sempre sendo gravado.
    const handleGlobalError = (event) => {
      const error = event.error || event.reason;
      const errorMessage = error?.message || event.message || 'Erro desconhecido';

      registrarLog({
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
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, []);

  // ============= CAMADA DE REDE (instalação ÚNICA) =============
  // 🛡️ CAUSA-RAIZ CORRIGIDA (08/08/2026 — "Maximum call stack size exceeded"
  // em /api/functions/entityWrite): a camada era instalada e desinstalada a cada
  // montagem deste componente. Como cada rota monta o seu próprio Layout, o
  // monitor remonta a cada navegação e, com Sentry/analytics também embrulhando
  // window.fetch, a bandeira de proteção ficava escondida — cada navegação
  // empilhava uma camada. Agora a camada vive em @/lib/camadaRede: instala UMA
  // vez por aba e NUNCA sai. Aqui só ligamos o aviso na tela.
  useEffect(() => {
    // Sem limpeza no desmonte: na troca de rota o Layout antigo desmonta e o
    // novo monta: apagar o aviso aqui poderia deixar o monitor mudo.
    definirAviso(addIssue);
    instalarCamadaRede();
  }, []);

  // ============= ADICIONA ISSUE =============
  // 🕵️ PONTO 88 (FASE 1): antes desta data, os 6 problemas detectados aqui
  // (loop infinito, erro de hooks, requisição lenta, rate limit, excesso de
  // requisições, erro de rede) NÃO chegavam ao banco — ficavam só no estado da
  // tela e no localStorage do dispositivo do usuário. O dono nunca via.
  // Agora também gravam, pelo MESMO porteiro anti-duplicação (60s).
  // O localStorage e o alerta visual continuam EXATAMENTE como eram.
  const addIssue = (issue) => {
    try {
      registrarLog({
        step: `Monitor_${issue?.type || 'desconhecido'}`,
        status: issue?.level === 'critical' ? 'error' : 'warning',
        message: String(issue?.message || 'problema detectado pelo monitor').slice(0, 300),
        component_name: 'GlobalMonitor',
        error_details: {
          tipo: issue?.type,
          nivel: issue?.level,
          local: issue?.location,
          detectado_em: issue?.timestamp,
        },
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        is_mobile: typeof navigator !== 'undefined' ? /Mobi|Android/i.test(navigator.userAgent) : undefined,
      });
    } catch (_) { /* log jamais derruba o monitor */ }

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
      {
        const avgDuration = mediaDesempenho();

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