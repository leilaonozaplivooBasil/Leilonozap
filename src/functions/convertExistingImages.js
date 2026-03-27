import { base44 } from '@/api/base44Client';

/**
 * Invoca a função de sistema para converter imagens existentes para WebP.
 * @param {Object} params 
 * @param {string} params.entity - 'Auction', 'Product', 'BannerImage', 'AppUser'
 * @param {number} params.batch_size - Qtd de registros por lote
 * @param {boolean} params.dry_run - Se true, apenas simula sem salvar
 */
export async function convertExistingImages(params) {
    return base44.functions.invoke('convertExistingImages', params);
}
