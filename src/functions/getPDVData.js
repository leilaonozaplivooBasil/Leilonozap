import { plataforma } from '@/api/plataformaClient';

export async function getPDVData(params) {
    return plataforma.functions.invoke('getPDVData', params);
}
