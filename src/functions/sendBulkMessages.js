import { plataforma } from '@/api/plataformaClient';

export async function sendBulkMessages(params) {
    return plataforma.functions.invoke('sendBulkMessages', params);
}
