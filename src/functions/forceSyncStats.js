import { base44 } from '@/api/base44Client';

export async function forceSyncStats(params) {
    return base44.functions.invoke('forceSyncStats', params);
}
