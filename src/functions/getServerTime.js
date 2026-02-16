import { base44 } from '@/api/base44Client';

export async function getServerTime(params) {
    return base44.functions.invoke('getServerTime', params);
}
