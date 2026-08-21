import { plataforma } from '@/api/plataformaClient';

export async function calculateProductPricing(params) {
    return plataforma.functions.invoke('calculateProductPricing', params);
}
