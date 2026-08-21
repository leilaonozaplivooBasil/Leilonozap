import { plataforma } from '@/api/plataformaClient';

export async function rejectWithdrawal(params) {
    return plataforma.functions.invoke('rejectWithdrawal', params);
}
