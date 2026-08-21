import { plataforma } from '@/api/plataformaClient';

export async function checkLocation(params) {
    return plataforma.functions.invoke('checkLocation', params);
}
