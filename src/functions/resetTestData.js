import { base44 } from '@/api/base44Client';

export async function resetTestData(params) {
    return base44.functions.invoke('resetTestData', params);
}
