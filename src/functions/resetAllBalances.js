import { plataforma } from '@/api/plataformaClient';

export async function resetAllBalances(params) {
    return plataforma.functions.invoke('resetAllBalances', params);
}
