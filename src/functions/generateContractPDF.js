import { base44 } from '@/api/base44Client';

export async function generateContractPDF(params) {
    return base44.functions.invoke('generateContractPDF', params);
}
