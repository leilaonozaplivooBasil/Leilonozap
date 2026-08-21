import { plataforma } from '@/api/plataformaClient';

export async function analyzeUserCase(params) {
    return plataforma.functions.invoke('analyzeUserCase', params);
}
