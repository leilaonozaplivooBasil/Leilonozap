import { plataforma } from '@/api/plataformaClient';

export async function transcribeAudio(params) {
    return plataforma.functions.invoke('transcribeAudio', params);
}
