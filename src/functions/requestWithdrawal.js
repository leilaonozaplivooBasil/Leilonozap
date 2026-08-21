import { plataforma } from '@/api/plataformaClient';

export async function requestWithdrawal(params) {
    return plataforma.functions.invoke('requestWithdrawal', params);
}
