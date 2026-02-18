import { base44 } from '@/api/base44Client';

export async function checkLocation(params) {
    return base44.functions.invoke('checkLocation', params);
}
