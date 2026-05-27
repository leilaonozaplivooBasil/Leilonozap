import { base44 } from '@/api/base44Client';

export async function getCatalogOrders(params) {
    return base44.functions.invoke('getCatalogOrders', params);
}
