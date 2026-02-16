import { base44 } from '@/api/base44Client';

export async function comparaiPrices(params) {
    return base44.functions.invoke('comparaiPrices', params);
}
