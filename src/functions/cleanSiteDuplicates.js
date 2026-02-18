import { base44 } from '@/api/base44Client';

export async function cleanSiteDuplicates(params) {
    return base44.functions.invoke('cleanSiteDuplicates', params);
}
