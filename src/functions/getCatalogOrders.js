import { plataforma } from '@/api/plataformaClient';

export async function getCatalogOrders(params) {
    return plataforma.functions.invoke('getCatalogOrders', params);
}
