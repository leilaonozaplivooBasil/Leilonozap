import { plataforma } from '@/api/plataformaClient';

export async function clearAuctionMessages(params) {
    return plataforma.functions.invoke('clearAuctionMessages', params);
}
