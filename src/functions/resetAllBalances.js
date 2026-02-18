import { base44 } from '@/api/base44Client';

export async function resetAllBalances(params) {
    return base44.functions.invoke('resetAllBalances', params);
}
