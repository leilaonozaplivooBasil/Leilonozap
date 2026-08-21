import { plataforma } from '@/api/plataformaClient';

export async function generateContractPDF(params) {
    return plataforma.functions.invoke('generateContractPDF', params);
}
