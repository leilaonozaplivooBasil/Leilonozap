import { base44 } from '@/api/base44Client';

export async function analyzePartnerPlans(params) {
    return base44.functions.invoke('analyzePartnerPlans', params);
}
