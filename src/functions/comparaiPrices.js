import { plataforma } from '@/api/plataformaClient';

export async function comparaiPrices(params) {
    return plataforma.functions.invoke('comparaiPrices', params);
}
