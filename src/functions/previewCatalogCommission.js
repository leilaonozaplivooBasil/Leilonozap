import { base44 } from '@/api/base44Client';

export async function previewCatalogCommission(params) {
    return base44.functions.invoke('previewCatalogCommission', params);
}
