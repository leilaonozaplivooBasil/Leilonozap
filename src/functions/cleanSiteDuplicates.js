import { plataforma } from '@/api/plataformaClient';

export async function cleanSiteDuplicates(params) {
    return plataforma.functions.invoke('cleanSiteDuplicates', params);
}
