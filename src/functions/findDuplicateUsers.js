import { base44 } from '@/api/base44Client';

export async function findDuplicateUsers(params) {
    return base44.functions.invoke('findDuplicateUsers', params);
}
