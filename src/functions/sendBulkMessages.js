import { base44 } from '@/api/base44Client';

export async function sendBulkMessages(params) {
    return base44.functions.invoke('sendBulkMessages', params);
}
