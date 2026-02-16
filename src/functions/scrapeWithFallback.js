import { base44 } from '@/api/base44Client';

export async function scrapeWithFallback(params) {
    return base44.functions.invoke('scrapeWithFallback', params);
}
