import { base44 } from '@/api/base44Client';

export async function simulateTestBids(params) {
    return base44.functions.invoke('simulateTestBids', params);
}
