import { base44 } from '@/api/base44Client';

export async function transcribeAudio(params) {
    return base44.functions.invoke('transcribeAudio', params);
}
