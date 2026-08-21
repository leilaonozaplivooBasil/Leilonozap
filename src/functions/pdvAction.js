import { plataforma } from '@/api/plataformaClient';

export async function pdvAction(params) {
    return plataforma.functions.invoke('pdvAction', params);
}
