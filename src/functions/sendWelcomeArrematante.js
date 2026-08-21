import { plataforma } from '@/api/plataformaClient';

/**
 * Invoca a função de sistema para enviar e-mail de boas-vindas ao arrematante.
 * @param {Object} params 
 */
export async function sendWelcomeArrematante(params) {
    return plataforma.functions.invoke('sendWelcomeArrematante', params);
}
