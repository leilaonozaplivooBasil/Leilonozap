import { plataforma } from '@/api/plataformaClient';

export async function createMPPreference(params) {
    return plataforma.functions.invoke('createMPPreference', params);
}
