import { plataforma } from '@/api/plataformaClient';

export async function ensureSiteLicensee(params) {
    return plataforma.functions.invoke('ensureSiteLicensee', params);
}
