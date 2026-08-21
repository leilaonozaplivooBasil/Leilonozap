import { plataforma } from '@/api/plataformaClient';

export async function resetTestData(params) {
    return plataforma.functions.invoke('resetTestData', params);
}
