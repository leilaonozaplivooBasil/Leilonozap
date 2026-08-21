import { plataforma } from '@/api/plataformaClient';

export async function simulateTestBids(params) {
    return plataforma.functions.invoke('simulateTestBids', params);
}
