// Ponte para a função `searchGoogleShopping` do Base44.
//
// Criado em 27/07/2026 ao integrar a branch de produção com a main. Os componentes
// de validação de lote importam '@/functions/searchGoogleShopping', mas o arquivo não
// existia em nenhum dos dois lados: dentro do Base44 o plugin resolve esses imports
// sozinho, e fora dele o build quebra ("Could not load /src/functions/searchGoogleShopping").
// Este wrapper segue o mesmo padrão dos vizinhos em src/functions/ e faz o build
// passar nos dois ambientes. A função em si vive em base44/functions/searchGoogleShopping.
import { base44 } from '@/api/base44Client';

export async function searchGoogleShopping(params) {
    return base44.functions.invoke('searchGoogleShopping', params);
}
