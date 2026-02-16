import { base44 } from '@/api/base44Client';

export async function getPDVData(params) {
    return base44.functions.invoke('getPDVData', params);
}
