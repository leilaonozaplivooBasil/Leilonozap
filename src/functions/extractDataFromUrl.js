import { plataforma } from '@/api/plataformaClient';

export async function extractDataFromUrl(params) {
    return plataforma.functions.invoke('extractDataFromUrl', params);
}
