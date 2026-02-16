import { base44 } from '@/api/base44Client';

export async function rejectWithdrawal(params) {
    return base44.functions.invoke('rejectWithdrawal', params);
}
