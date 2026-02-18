import { base44 } from '@/api/base44Client';

export async function requestWithdrawal(params) {
    return base44.functions.invoke('requestWithdrawal', params);
}
