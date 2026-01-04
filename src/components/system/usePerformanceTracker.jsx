import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook para rastrear performance de componentes React
 * @param {string} componentName - Nome do componente
 * @param {object} relevantProps - Props importantes para logar
 * @param {object} relevantState - Estado importante para logar
 */
export function usePerformanceTracker(componentName, relevantProps = {}, relevantState = {}) {
  const startTimeRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Mount - início da renderização
    if (!mountedRef.current) {
      startTimeRef.current = performance.now();
      mountedRef.current = true;
      return;
    }

    // Re-render - calcular tempo e logar
    const endTime = performance.now();
    const executionTime = startTimeRef.current ? endTime - startTimeRef.current : 0;

    // Enviar log assíncrono (não bloqueia UI)
    setTimeout(() => {
      try {
        base44.entities.SystemLog.create({
          step: 'COMPONENT_RENDER',
          status: 'component_lifecycle',
          message: `Renderização de ${componentName}`,
          component_name: componentName,
          execution_time_ms: executionTime,
          url: window.location.pathname,
          user_agent: navigator.userAgent,
          is_mobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
          payload: {
            props: relevantProps,
            state: relevantState,
            timestamp: new Date().toISOString()
          }
        }).catch(err => {
          // Silenciosamente ignora erros de logging para não impactar UX
          console.debug('Performance log failed:', err);
        });
      } catch (error) {
        console.debug('Performance tracker error:', error);
      }
    }, 0);

    // Atualizar startTime para próximo re-render
    startTimeRef.current = endTime;
  });

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (mountedRef.current) {
        setTimeout(() => {
          try {
            base44.entities.SystemLog.create({
              step: 'COMPONENT_UNMOUNT',
              status: 'component_lifecycle',
              message: `Desmontagem de ${componentName}`,
              component_name: componentName,
              url: window.location.pathname,
              user_agent: navigator.userAgent,
              is_mobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)
            }).catch(() => {});
          } catch (error) {
            console.debug('Unmount log failed:', error);
          }
        }, 0);
      }
    };
  }, [componentName]);
}

/**
 * Função helper para logar ações do usuário
 * @param {string} componentName - Nome do componente
 * @param {string} action - Ação realizada (ex: "BUTTON_CLICK", "FORM_SUBMIT")
 * @param {object} payload - Dados contextuais da ação
 */
export function logUserAction(componentName, action, payload = {}) {
  setTimeout(() => {
    try {
      base44.entities.SystemLog.create({
        step: action,
        status: 'user_action',
        message: `Ação do usuário: ${action} em ${componentName}`,
        component_name: componentName,
        url: window.location.pathname,
        user_agent: navigator.userAgent,
        is_mobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
        payload: {
          ...payload,
          timestamp: new Date().toISOString()
        }
      }).catch(() => {});
    } catch (error) {
      console.debug('User action log failed:', error);
    }
  }, 0);
}

/**
 * Função helper para logar chamadas de API
 * @param {string} functionName - Nome da função/API
 * @param {string} step - Etapa (START, COMPLETE, FAILED)
 * @param {number} executionTime - Tempo de execução em ms
 * @param {object} payload - Dados contextuais
 */
export function logAPICall(functionName, step, executionTime = 0, payload = {}) {
  setTimeout(() => {
    try {
      base44.entities.SystemLog.create({
        step: `API_${step}`,
        status: 'api_call',
        message: `API Call: ${functionName} - ${step}`,
        component_name: functionName,
        execution_time_ms: executionTime,
        payload: {
          ...payload,
          timestamp: new Date().toISOString()
        }
      }).catch(() => {});
    } catch (error) {
      console.debug('API call log failed:', error);
    }
  }, 0);
}