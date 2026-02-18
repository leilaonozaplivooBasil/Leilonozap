import { base44 } from '@/api/base44Client';

export async function calculateShipping(params) {
    return base44.functions.invoke('calculateShipping', params);
}
