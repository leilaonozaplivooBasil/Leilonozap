import { base44 } from '@/api/base44Client';

export async function clearAuctionMessages(params) {
    return base44.functions.invoke('clearAuctionMessages', params);
}
