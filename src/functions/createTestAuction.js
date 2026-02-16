import { base44 } from '@/api/base44Client';

export async function createTestAuction(params) {
    return base44.functions.invoke('createTestAuction', params);
}
