import { plataforma } from '@/api/plataformaClient';

/**
 * Invoca a função de sistema para distribuir comissões de leilão.
 * @param {Object} params 
 */
export async function distributeAuctionCommissions(params) {
    return plataforma.functions.invoke('distributeAuctionCommissions', params);
}
