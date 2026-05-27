import { base44 } from '@/api/base44Client';

export async function gerarProdutosDoLote(params) {
    return base44.functions.invoke('gerarProdutosDoLote', params);
}
