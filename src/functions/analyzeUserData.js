import { base44 } from '@/api/base44Client';

export async function analyzeUserData(params) {
    return base44.functions.invoke('analyzeUserData', params);
}
