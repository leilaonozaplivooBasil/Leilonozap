import { plataforma } from '@/api/plataformaClient';

export async function approveWithdrawal(params) {
    return plataforma.functions.invoke('approveWithdrawal', params);
}
