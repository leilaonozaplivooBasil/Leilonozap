import { plataforma } from '@/api/plataformaClient';

export async function getRecommendations(params) {
    return plataforma.functions.invoke('getRecommendations', params);
}
