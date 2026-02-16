import { base44 } from '@/api/base44Client';

export async function createMPPreference(params) {
    return base44.functions.invoke('createMPPreference', params);
}
