import { base44 } from '@/api/base44Client';

export async function linkOrphanUsers(params) {
    return base44.functions.invoke('linkOrphanUsers', params);
}
