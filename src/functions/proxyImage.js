import { plataforma } from '@/api/plataformaClient';

export async function proxyImage(params) {
    return plataforma.functions.invoke('proxyImage', params);
}
