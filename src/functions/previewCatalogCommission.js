import { plataforma } from '@/api/plataformaClient';

export async function previewCatalogCommission(params) {
    return plataforma.functions.invoke('previewCatalogCommission', params);
}
