import React from 'react';

/**
 * 🩺 SISTEMA DE DIAGNÓSTICO CIRÚRGICO - REGRA DEFINITIVA
 * 
 * ═══════════════════════════════════════════════════════════════
 * 📜 REGRA #1: DIAGNÓSTICO OBRIGATÓRIO EM TODA IMPLEMENTAÇÃO
 * ═══════════════════════════════════════════════════════════════
 * 
 * ESTABELECIDA EM: 03/01/2025 - 22:44
 * 
 * 🎯 OBJETIVO:
 * Toda nova feature (backend, frontend, integração) DEVE incluir 
 * sistema de log detalhado para identificar EXATAMENTE onde/por que falhou.
 * 
 * ✅ COMO USAR NO BACKEND:
 * 
 * async function logStep(base44, entityId, step, status, message, errorDetails = null, req = null) {
 *     const userAgent = req?.headers.get('user-agent') || 'unknown';
 *     const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
 *     
 *     const logData = {
 *         entity_id: entityId || 'no-id',
 *         step: step,
 *         status: status,
 *         message: message,
 *         user_agent: userAgent,
 *         is_mobile: isMobile
 *     };
 *     
 *     if (errorDetails) logData.error_details = errorDetails;
 *     
 *     console.log(`🩺 [${step}] ${status.toUpperCase()}: ${message}`);
 *     
 *     try {
 *         await base44.asServiceRole.entities.SystemLog.create(logData);
 *     } catch (logError) {
 *         console.error('⚠️ Erro ao salvar log:', logError);
 *     }
 * }
 * 
 * // USO EM CADA PASSO:
 * await logStep(base44, auctionId, 'STEP_1_AUTH', 'success', 'Autenticação OK', null, req);
 * 
 * ✅ COMO USAR NO FRONTEND:
 * 
 * import { useDiagnostic } from '@/components/system/DiagnosticLogger';
 * 
 * function MeuComponente() {
 *     const { log } = useDiagnostic('MeuComponente');
 *     
 *     const minhaFuncao = async () => {
 *         try {
 *             log('STEP_1_INIT', 'info', 'Iniciando...');
 *             // ... código ...
 *             log('STEP_2_SUCCESS', 'success', 'Concluído', { result });
 *         } catch (error) {
 *             log('STEP_ERROR', 'error', error.message, { stack: error.stack });
 *         }
 *     };
 * }
 * 
 * 🎓 EXEMPLO DE SUCESSO:
 * - Caso: Comparai mobile error 500
 * - Antes: "Não funciona no mobile" → investigação de horas
 * - Depois: Logs mostraram erro em 30 segundos
 * - Resultado: Correção imediata
 * 
 * 🚫 NUNCA:
 * ❌ Implementar sem logs
 * ❌ Usar apenas console.log sem estrutura
 * ❌ Ignorar erros silenciosamente
 * 
 * ═══════════════════════════════════════════════════════════════
 * 📜 REGRA #2: SEMPRE USE asServiceRole NO BACKEND
 * ═══════════════════════════════════════════════════════════════
 * 
 * ✅ CORRETO:
 * await base44.asServiceRole.entities.MinhaEntidade.create(data);
 * 
 * ❌ ERRADO (pode falhar se user não autenticado):
 * await base44.entities.MinhaEntidade.create(data);
 * 
 * ═══════════════════════════════════════════════════════════════
 */

// 🩺 Hook de diagnóstico para frontend
export function useDiagnostic(componentName) {
  const log = React.useCallback((step, status, message, details = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      component: componentName,
      step,
      status,
      message,
      details,
      timestamp,
      userAgent: navigator.userAgent,
      isMobile: /Mobile|Android|iPhone/i.test(navigator.userAgent),
      url: window.location.href
    };
    
    // Console colorido
    const color = status === 'success' ? '🟢' : status === 'error' ? '🔴' : '🟡';
    console.log(`${color} [${componentName}][${step}] ${status.toUpperCase()}: ${message}`, details || '');
    
    // Salva no localStorage para análise posterior
    try {
      const logs = JSON.parse(localStorage.getItem('diagnosticLogs') || '[]');
      logs.push(logEntry);
      // Mantém últimos 100 logs
      if (logs.length > 100) logs.shift();
      localStorage.setItem('diagnosticLogs', JSON.stringify(logs));
    } catch (e) {
      console.warn('Erro ao salvar log:', e);
    }
    
    // Se for erro, mostra toast
    if (status === 'error' && window.toast) {
      window.toast.error(`Erro em ${componentName}: ${message}`);
    }
    
    return logEntry;
  }, [componentName]);
  
  return { log };
}

// 🩺 Componente de visualização de logs
export function DiagnosticViewer() {
  const [logs, setLogs] = React.useState([]);
  const [filter, setFilter] = React.useState('all');
  
  React.useEffect(() => {
    const loadLogs = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('diagnosticLogs') || '[]');
        setLogs(stored.reverse());
      } catch (e) {
        console.error('Erro ao carregar logs:', e);
      }
    };
    
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.status === filter);
  
  const clearLogs = () => {
    localStorage.removeItem('diagnosticLogs');
    setLogs([]);
  };
  
  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-auto bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-4 z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold">🩺 Diagnóstico Live</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter('all')}
            className={`px-2 py-1 text-xs rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilter('error')}
            className={`px-2 py-1 text-xs rounded ${filter === 'error' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Erros
          </button>
          <button 
            onClick={clearLogs}
            className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            Limpar
          </button>
        </div>
      </div>
      
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum log ainda...</p>
        ) : (
          filteredLogs.map((log, i) => (
            <div 
              key={i} 
              className={`text-xs p-2 rounded ${
                log.status === 'success' ? 'bg-green-900/30 border border-green-700' :
                log.status === 'error' ? 'bg-red-900/30 border border-red-700' :
                'bg-yellow-900/30 border border-yellow-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">[{log.component}]</span>
                <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="text-gray-300">
                <strong>{log.step}:</strong> {log.message}
              </div>
              {log.details && (
                <pre className="mt-1 text-xs text-gray-400 overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default useDiagnostic;