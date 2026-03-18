import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Wrapper para logar execução de funções backend
 * @param {string} functionName - Nome da função
 * @param {Function} fn - Função a ser executada
 * @param {Request} req - Request object
 * @param {object} inputData - Dados de entrada
 */
export async function loggedFunction(functionName, fn, req, inputData = {}) {
  const base44 = createClientFromRequest(req);
  const startTime = Date.now();

  // Log de início
  await base44.asServiceRole.entities.SystemLog.create({
    step: `${functionName.toUpperCase()}_START`,
    status: 'info',
    message: `Início de ${functionName}`,
    component_name: functionName,
    payload: {
      input: inputData,
      timestamp: new Date().toISOString()
    }
  }).catch(() => {});

  try {
    // Executar função
    const result = await fn();
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // Log de sucesso
    await base44.asServiceRole.entities.SystemLog.create({
      step: `${functionName.toUpperCase()}_COMPLETE`,
      status: 'success',
      message: `${functionName} executado com sucesso`,
      component_name: functionName,
      execution_time_ms: executionTime,
      payload: {
        input: inputData,
        result: typeof result === 'object' && result !== null ? { ...result } : result,
        timestamp: new Date().toISOString()
      }
    }).catch(() => {});

    return result;

  } catch (error) {
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // Log de erro
    await base44.asServiceRole.entities.SystemLog.create({
      step: `${functionName.toUpperCase()}_FAILED`,
      status: 'error',
      message: `Falha em ${functionName}`,
      component_name: functionName,
      execution_time_ms: executionTime,
      error_details: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      payload: {
        input: inputData,
        timestamp: new Date().toISOString()
      }
    }).catch(() => {});

    throw error;
  }
}

/**
 * HOC para wrappear funções Deno.serve
 */
export function withLogging(functionName, handler) {
  return async (req) => {
    const base44 = createClientFromRequest(req);
    const startTime = Date.now();
    
    let inputData = {};
    try {
      const body = await req.clone().json();
      inputData = body;
    } catch {
      // Não é JSON ou body vazio
    }

    // Log de início
    await base44.asServiceRole.entities.SystemLog.create({
      step: `${functionName.toUpperCase()}_START`,
      status: 'api_call',
      message: `API Call: ${functionName} - START`,
      component_name: functionName,
      payload: { input: inputData }
    }).catch(() => {});

    try {
      const response = await handler(req);
      const endTime = Date.now();

      // Log de sucesso
      await base44.asServiceRole.entities.SystemLog.create({
        step: `${functionName.toUpperCase()}_COMPLETE`,
        status: 'api_call',
        message: `API Call: ${functionName} - SUCCESS`,
        component_name: functionName,
        execution_time_ms: endTime - startTime,
        payload: { 
          input: inputData,
          status: response.status
        }
      }).catch(() => {});

      return response;
    } catch (error) {
      const endTime = Date.now();

      // Log de erro
      await base44.asServiceRole.entities.SystemLog.create({
        step: `${functionName.toUpperCase()}_FAILED`,
        status: 'error',
        message: `API Call: ${functionName} - FAILED`,
        component_name: functionName,
        execution_time_ms: endTime - startTime,
        error_details: {
          message: error.message,
          stack: error.stack
        },
        payload: { input: inputData }
      }).catch(() => {});

      throw error;
    }
  };
}