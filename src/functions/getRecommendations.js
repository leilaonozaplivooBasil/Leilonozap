import { base44 } from '@/api/base44Client';

export async function getRecommendations(params) {
    return base44.functions.invoke('getRecommendations', params);
}
