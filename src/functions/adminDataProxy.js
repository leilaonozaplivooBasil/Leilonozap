import { plataforma } from '@/api/plataformaClient';

export async function adminDataProxy(params) {
    return plataforma.functions.invoke('adminDataProxy', params);
}
