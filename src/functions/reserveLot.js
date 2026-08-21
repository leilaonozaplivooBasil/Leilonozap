import { plataforma } from '@/api/plataformaClient';

/**
 * Invoca a função de sistema para reservar um lote.
 * @param {Object} params 
 */
export async function reserveLot(params) {
    return plataforma.functions.invoke('reserveLot', params);
}
