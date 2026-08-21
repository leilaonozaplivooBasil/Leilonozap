import { plataforma } from '@/api/plataformaClient';

export async function calculateShipping(params) {
    return plataforma.functions.invoke('calculateShipping', params);
}
