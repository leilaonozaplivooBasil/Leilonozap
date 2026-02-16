import { base44 } from '@/api/base44Client';

export async function deleteTestAuctions(params) {
    return base44.functions.invoke('deleteTestAuctions', params);
}
