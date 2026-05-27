import { base44 } from '@/api/base44Client';

export async function calculateProductPricing(params) {
    return base44.functions.invoke('calculateProductPricing', params);
}
