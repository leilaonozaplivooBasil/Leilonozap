import { plataforma } from '@/api/plataformaClient';

export async function analyzePartnerPlans(params) {
    return plataforma.functions.invoke('analyzePartnerPlans', params);
}
