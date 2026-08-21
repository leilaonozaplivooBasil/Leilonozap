import { plataforma } from '@/api/plataformaClient';

export async function analyzeUserData(params) {
    return plataforma.functions.invoke('analyzeUserData', params);
}
