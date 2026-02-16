import { base44 } from '@/api/base44Client';

export async function fastForwardTestAuction(params) {
    return base44.functions.invoke('fastForwardTestAuction', params);
}
