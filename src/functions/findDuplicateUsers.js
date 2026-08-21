import { plataforma } from '@/api/plataformaClient';

export async function findDuplicateUsers(params) {
    return plataforma.functions.invoke('findDuplicateUsers', params);
}
