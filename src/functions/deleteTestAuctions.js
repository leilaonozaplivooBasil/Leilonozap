import { plataforma } from '@/api/plataformaClient';

export async function deleteTestAuctions(params) {
    return plataforma.functions.invoke('deleteTestAuctions', params);
}
