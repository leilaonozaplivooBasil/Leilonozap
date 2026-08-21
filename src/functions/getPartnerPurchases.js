import { plataforma } from '@/api/plataformaClient';

export async function getPartnerPurchases(params) {
    return plataforma.functions.invoke('getPartnerPurchases', params);
}
