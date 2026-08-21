import { plataforma } from '@/api/plataformaClient';

export async function fastForwardTestAuction(params) {
    return plataforma.functions.invoke('fastForwardTestAuction', params);
}
