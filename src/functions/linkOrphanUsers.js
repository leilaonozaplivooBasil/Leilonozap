import { plataforma } from '@/api/plataformaClient';

export async function linkOrphanUsers(params) {
    return plataforma.functions.invoke('linkOrphanUsers', params);
}
