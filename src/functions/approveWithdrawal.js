import { base44 } from '@/api/base44Client';

export async function approveWithdrawal(params) {
    return base44.functions.invoke('approveWithdrawal', params);
}
