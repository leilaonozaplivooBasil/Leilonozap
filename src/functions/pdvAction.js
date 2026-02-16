import { base44 } from '@/api/base44Client';

export async function pdvAction(params) {
    return base44.functions.invoke('pdvAction', params);
}
