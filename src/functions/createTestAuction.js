import { plataforma } from '@/api/plataformaClient';

export async function createTestAuction(params) {
    return plataforma.functions.invoke('createTestAuction', params);
}
