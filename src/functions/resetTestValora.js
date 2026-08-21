import { plataforma } from '@/api/plataformaClient';

export async function resetTestValora(params) {
    return plataforma.functions.invoke('resetTestValora', params);
}
