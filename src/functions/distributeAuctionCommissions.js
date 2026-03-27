import { base44 } from '@/api/base44Client';

/**
 * Invoca a função de sistema para distribuir comissões de leilão.
 * @param {Object} params 
 */
export async function distributeAuctionCommissions(params) {
    return base44.functions.invoke('distributeAuctionCommissions', params);
}
