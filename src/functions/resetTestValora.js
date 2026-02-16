import { base44 } from '@/api/base44Client';

export async function resetTestValora(params) {
    return base44.functions.invoke('resetTestValora', params);
}
