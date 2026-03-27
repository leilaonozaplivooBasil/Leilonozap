import { base44 } from '@/api/base44Client';

/**
 * Invoca a função de sistema para enviar e-mail de boas-vindas ao arrematante.
 * @param {Object} params 
 */
export async function sendWelcomeArrematante(params) {
    return base44.functions.invoke('sendWelcomeArrematante', params);
}
