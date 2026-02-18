import { base44 } from '@/api/base44Client';

export async function getPartnerPurchases(params) {
    return base44.functions.invoke('getPartnerPurchases', params);
}
