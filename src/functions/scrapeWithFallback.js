import { plataforma } from '@/api/plataformaClient';

export async function scrapeWithFallback(params) {
    return plataforma.functions.invoke('scrapeWithFallback', params);
}
