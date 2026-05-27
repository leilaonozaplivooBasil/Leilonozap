import { base44 } from '@/api/base44Client';

export async function adminDataProxy(params) {
    return base44.functions.invoke('adminDataProxy', params);
}
