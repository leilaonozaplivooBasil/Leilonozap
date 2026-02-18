import { base44 } from '@/api/base44Client';

export async function extractDataFromUrl(params) {
    return base44.functions.invoke('extractDataFromUrl', params);
}
