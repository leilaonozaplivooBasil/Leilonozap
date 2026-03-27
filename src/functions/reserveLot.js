import { base44 } from '@/api/base44Client';

/**
 * Invoca a função de sistema para reservar um lote.
 * @param {Object} params 
 */
export async function reserveLot(params) {
    return base44.functions.invoke('reserveLot', params);
}
