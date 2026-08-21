import { plataforma } from '@/api/plataformaClient';

export async function forceSyncStats(params) {
    return plataforma.functions.invoke('forceSyncStats', params);
}
